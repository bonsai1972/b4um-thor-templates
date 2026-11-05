import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const nodeRequire = createRequire(import.meta.url)

function loadExtension(settings = {}) {
  const providers = []
  const errors = []
  const vscode = {
    languages: {
      registerDocumentFormattingEditProvider(selector, provider) {
        providers.push({ selector, provider })
        return { dispose() {} }
      }
    },
    workspace: {
      getConfiguration: () => ({ get: (name, fallback) => settings[name] ?? fallback })
    },
    window: { showErrorMessage: (message) => errors.push(message) },
    Range: class { constructor(start, end) { this.start = start; this.end = end } },
    TextEdit: { replace: (range, newText) => ({ range, newText }) }
  }
  const module = { exports: {} }
  vm.runInNewContext(readFileSync(new URL('./extension.js', import.meta.url), 'utf8'), {
    require: (name) => name === 'vscode' ? vscode : nodeRequire(name),
    module
  })
  const context = { subscriptions: [] }
  module.exports.activate(context)

  return {
    errors,
    context,
    provider: (languageId) => providers.find(({ selector }) =>
      Array.isArray(selector) ? selector.includes(languageId) : selector === languageId
    ).provider
  }
}

function document(languageId, source) {
  return { languageId, uri: {}, getText: () => source, positionAt: (offset) => offset }
}

describe('VS-Code-Formatter', () => {
  it('registriert Ruby- und ERB-Formatter und liefert das asynchrone Ruby-Ergebnis', async () => {
    const extension = loadExtension()
    const source = 'class Task\ndef index\n@values=[1,2,3]\nend\nend'
    const edits = await extension.provider('b4um-thor-ruby')
      .provideDocumentFormattingEdits(document('b4um-thor-ruby', source))

    expect(extension.context.subscriptions).toHaveLength(2)
    expect(edits[0].newText).toBe('class Task\n  def index\n    @values = [1, 2, 3]\n  end\nend\n')
    expect(edits[0].range.end).toBe(source.length)
    expect(extension.errors).toEqual([])
  })

  it('verwendet für Thor-Templates die Einrückung der späteren ERB-Datei', async () => {
    const extension = loadExtension()
    const source = '<div>\n<%%= link_to "New", new_task_path, class: "button" %>\n</div>'
    const [edit] = await extension.provider('b4um-thor-erb')
      .provideDocumentFormattingEdits(document('b4um-thor-erb', source))

    expect(edit.newText).toContain('  <%%= link_to "New",\n              new_task_path,')
  })

  it('erhält normale ERB-Markierungen in Rails-Views', async () => {
    const extension = loadExtension()
    const [edit] = await extension.provider('b4um-rails-erb')
      .provideDocumentFormattingEdits(document('b4um-rails-erb', '<div>\n<%= @task.name %>\n</div>'))

    expect(edit.newText).toBe('<div>\n  <%= @task.name %>\n</div>\n')
  })

  it.each(['ruby', 'b4um-thor-ruby'])('meldet Fehler für %s ohne eine Textänderung anzubieten', async (languageId) => {
    const extension = loadExtension()
    const edits = await extension.provider(languageId)
      .provideDocumentFormattingEdits(document(languageId, 'class Broken\n'))

    expect(edits).toHaveLength(0)
    expect(extension.errors).toHaveLength(1)
    expect(extension.errors[0]).toContain('Ruby-Formatierung fehlgeschlagen')
  })

  it.each(['ruby', 'b4um-thor-ruby'])('erzeugt keine überflüssige Textänderung für formatierten Code in %s', async (languageId) => {
    const extension = loadExtension()
    const edits = await extension.provider(languageId)
      .provideDocumentFormattingEdits(document(languageId, 'value = 1\n'))

    expect(edits).toHaveLength(0)
  })

  it('formatiert normale Ruby-Dateien und behandelt ERB-Text in Strings als Ruby-Inhalt', async () => {
    const extension = loadExtension()
    const source = 'class Example\ndef index\ntemplate="<% if enabled? %>"\nredirect_to users_path, alert: "Message"\nend\nend\n'
    const [edit] = await extension.provider('ruby')
      .provideDocumentFormattingEdits(document('ruby', source))

    expect(edit.newText).toBe('class Example\n  def index\n    template = "<% if enabled? %>"\n    redirect_to users_path,\n                alert: "Message"\n  end\nend\n')
    expect(extension.errors).toEqual([])
    const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
    expect(manifest.activationEvents).toContain('onLanguage:ruby')
  })

  it('berücksichtigt die konfigurierte Zeilenlänge für normale Ruby-Dateien', async () => {
    const extension = loadExtension({ printWidth: 20 })
    const [edit] = await extension.provider('ruby')
      .provideDocumentFormattingEdits(document('ruby', 'values = [111, 222, 333]\n'))

    expect(edit.newText).toBe('values = [\n  111,\n  222,\n  333\n]\n')
    expect(extension.errors).toEqual([])
  })

  it('verwendet für .rake.tt die Ruby-Grammatik und den Ruby-Formatter', async () => {
    const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
    const language = manifest.contributes.languages.find(({ extensions }) => extensions.includes('.rake.tt'))
    const grammar = manifest.contributes.grammars.find(({ language: id }) => id === language.id)
    const source = 'namespace :example do\ntask :run do\nputs "<%= class_name %>"\nend\nend\n'
    const extension = loadExtension()
    const edits = await extension.provider(language.id)
      .provideDocumentFormattingEdits(document(language.id, source))

    expect(language.id).toBe('b4um-thor-ruby')
    expect(grammar.scopeName).toBe('source.ruby.thor')
    expect(manifest.contributes.configurationDefaults[`[${language.id}]`]['editor.defaultFormatter'])
      .toBe('b4um.b4um-thor-templates')
    expect(edits[0].newText).toBe('namespace :example do\n  task :run do\n    puts "<%= class_name %>"\n  end\nend\n')
    expect(extension.errors).toEqual([])
  })

  it('erkennt .erb.tt und .erb zusätzlich zu den längeren HTML-Endungen', () => {
    const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
    const languages = manifest.contributes.languages

    expect(languages.find(({ id }) => id === 'b4um-thor-erb').extensions).toContain('.erb.tt')
    expect(languages.find(({ id }) => id === 'b4um-rails-erb').extensions).toContain('.erb')
    expect(languages.find(({ id }) => id === 'b4um-thor-ruby').extensions).toContain('.rb.tt')
  })
})
