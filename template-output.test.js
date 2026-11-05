import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { formatThorRuby } from './ruby-formatter.js'
import { formatThorErb, formatThorTemplate } from './formatter.js'

// Echte ERB-Auswertung mit denselben Variablen wie im Rails-Generator.
const renderScript = `
require "erb"
require "json"
require "active_support/core_ext/string/inflections"
def class_name; "Task"; end
def plural_table_name; "tasks"; end
def singular_table_name; "task"; end
def current_owner_method; "current_user"; end
def owner?; ARGV[0] == "true"; end
def authentication_class_name; "User"; end
def authentication_model_name; "user"; end
def current_authentication_method; "current_user"; end
def admin_column_exists?; ARGV[1] == "true"; end
def blocked_column_exists?; ARGV[2] == "true"; end
def admin_creation_fields; JSON.parse(ARGV[3]); end
def admin_user_field_label(field); field.humanize; end
def options; { login_path: "new_session_path" }; end
print ERB.new(STDIN.read, trim_mode: "-").result(binding)
`

function render(source, owner = false, { admin = false, blocked = false, fields = [] } = {}) {
  return execFileSync('ruby', ['-e', renderScript, String(owner), String(admin), String(blocked), JSON.stringify(fields)], { input: source, encoding: 'utf8' })
}

describe('Erzeugte Ruby-Dateien', () => {
  it('teilt einzeilige Alerts im Admin-Controller auf und erhält gültigen erzeugten Ruby-Code', async () => {
    const originalTemplate = readFileSync(new URL('./fixtures/admin_users_controller.rb.tt', import.meta.url), 'utf8')
    // Den einzeiligen Aufruf aus dem Screenshot als Eingabe nachstellen.
    const source = originalTemplate.replace(/redirect_to admin_users_path,\n\s+alert:/g, 'redirect_to admin_users_path, alert:')
    const formatted = await formatThorRuby(source, { printWidth: 200 })
    const generated = render(formatted)

    expect(formatted).toContain('redirect_to admin_users_path,\n                  alert: "You cannot block your own account."')
    expect(formatted).toContain('redirect_to admin_users_path,\n                notice: "User was blocked."')
    expect(await formatThorRuby(formatted, { printWidth: 200 })).toBe(formatted)
    expect(execFileSync('ruby', ['-c'], { input: generated, encoding: 'utf8' })).toContain('Syntax OK')
    expect(await formatThorRuby(generated)).toBe(await formatThorRuby(render(originalTemplate)))
  })

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true]
  ])('erhält die Admin-Migration mit vorhandener Admin-Spalte %s und Blocked-Spalte %s', async (admin, blocked) => {
    const source = readFileSync(new URL('./fixtures/add_admin_fields_migration.rb.tt', import.meta.url), 'utf8')
    const formatted = await formatThorRuby(source)
    const generated = render(formatted, false, { admin, blocked })
    const original = render(source, false, { admin, blocked })

    expect(await formatThorRuby(formatted)).toBe(formatted)
    expect(execFileSync('ruby', ['-c'], { input: generated, encoding: 'utf8' })).toContain('Syntax OK')
    expect(await formatThorRuby(generated)).toBe(await formatThorRuby(original))

    for (const [column, exists] of [['admin', admin], ['blocked', blocked]]) {
      if (exists) {
        expect(generated).not.toContain(`:${column},`)
      } else {
        expect(generated).toContain(`add_column :users,\n               :${column},\n               :boolean,\n               default: false,\n               null: false`)
      }
    }
  })

  it.each(['tasks_controller', 'add_position_migration'])('erhält gültigen Ruby-Code für %s mit beiden Generator-Zweigen', async (name) => {
    const source = readFileSync(new URL(`./fixtures/${name}.rb.tt`, import.meta.url), 'utf8')
    const formatted = await formatThorRuby(source)

    expect(await formatThorRuby(formatted)).toBe(formatted)

    for (const owner of [false, true]) {
      const generated = render(formatted, owner)
      const original = render(source, owner)

      expect(execFileSync('ruby', ['-c'], { input: generated, encoding: 'utf8' })).toContain('Syntax OK')
      expect(await formatThorRuby(generated)).toBe(await formatThorRuby(original))
    }
  })

  it('erzeugt bei einem einfachen Template bereits fertig formatierten Ruby-Code', async () => {
    const template = 'class <%= class_name %>\ndef index\n@values=[1,2,3]\nend\nend'
    const generated = render(await formatThorRuby(template))

    expect(generated).toBe('class Task\n  def index\n    @values = [1, 2, 3]\n  end\nend\n')
    expect(await formatThorRuby(generated)).toBe(generated)
  })

  it('erhält String- und Heredoc-Inhalte nach der Generierung', async () => {
    const source = `text = "Erste Zeile${'  '}
  Zweite Zeile"
html = "<%%= @task.name %>"
message = <<~TEXT
  Hallo <%= class_name %>${'  '}
    eingerückter Text
TEXT
[text, html, message]
`
    const formatted = await formatThorRuby(source)
    const evaluate = (input) => execFileSync('ruby', ['-e', 'print Marshal.dump(eval(STDIN.read))'], { input })

    expect(evaluate(render(formatted))).toEqual(evaluate(render(source)))
  })
})

describe('Erzeugte Rake-Dateien', () => {
  it.each([
    { fields: [] },
    { fields: ['name'] },
    { fields: ['first_name', 'last_name'] }
  ])('erhält gültige Rake-Tasks mit den Admin-Feldern $fields', async ({ fields }) => {
    const source = readFileSync(new URL('./fixtures/b4um_admin.rake.tt', import.meta.url), 'utf8')
    const formatted = await formatThorRuby(source)
    const generated = render(formatted, false, { fields })

    expect(formatted).toBe(source)
    expect(await formatThorRuby(formatted)).toBe(formatted)
    expect(formatted.match(/<%[\s\S]*?%>/g)).toEqual(source.match(/<%[\s\S]*?%>/g))
    expect(generated).toContain('model = User')
    expect(generated).not.toContain('<%')
    for (const field of fields) {
      expect(generated).toContain(`attributes[:${field}] = ${field}`)
    }
    expect(execFileSync('ruby', ['-c'], { input: generated, encoding: 'utf8' })).toContain('Syntax OK')

    // Nur die Task-Registrierung prüfen; den interaktiven Task nicht ausführen.
    const registrationScript = `
require "rake"
eval(STDIN.read, TOPLEVEL_BINDING, "b4um_admin.rake")
task = Rake::Task["b4um:admin:create"]
abort "Missing environment prerequisite" unless task.prerequisites == ["environment"]
puts task.name
`
    expect(execFileSync('ruby', ['-e', registrationScript], { input: generated, encoding: 'utf8' }))
      .toBe('b4um:admin:create\n')
  })
})

describe('Erzeugte Rails-ERB-Dateien', () => {
  it.each(['_task', 'todo-index', 'test'])('erzeugt eine stabil formatierte ERB-View aus %s', async (name) => {
    const source = readFileSync(new URL(`./fixtures/${name}.html.erb.tt`, import.meta.url), 'utf8')
    const formatted = await formatThorErb(source)
    const generated = render(formatted)

    expect(await formatThorErb(formatted)).toBe(formatted)
    expect(await formatThorTemplate(generated, { printWidth: 80 })).toBe(generated)
    // Rails verwendet Erubi, das auch Ausgabe-Blöcke wie form_with korrekt übersetzt.
    const compileScript = `
require "action_view"
source = ActionView::Template::Handlers::ERB.erb_implementation.new(STDIN.read).src
RubyVM::InstructionSequence.compile("def render_view;\\n" + source + "\\nend")
print "OK"
`
    expect(execFileSync('ruby', ['-e', compileScript], { input: generated, encoding: 'utf8' })).toBe('OK')
  })

  it('richtet Helper-Argumente an ihrer späteren Position ohne das zusätzliche % aus', async () => {
    const source = '<div>\n<%%= link_to "New",\nnew_task_path,\nclass: "button" %>\n</div>'
    const generated = render(await formatThorErb(source))

    expect(generated).toBe('<div>\n  <%= link_to "New",\n              new_task_path,\n              class: "button" %>\n</div>\n')
    expect(await formatThorTemplate(generated, { printWidth: 80 })).toBe(generated)
  })

  it('trennt Thor-Bedingungen von Rails-Bedingungen', async () => {
    const source = `<section>
<% if owner? %>
<%% if @tasks.any? %>
<p><%= class_name %></p>
<%% end %>
<% else %>
<p>Keine Anmeldung</p>
<% end %>
</section>`
    const formatted = await formatThorErb(source)

    expect(await formatThorErb(formatted)).toBe(formatted)
    for (const owner of [false, true]) {
      const generated = render(formatted, owner)
      expect(await formatThorTemplate(generated, { printWidth: 80 })).toBe(generated)
    }
    expect(render(formatted, true)).toContain('    <p>Task</p>')
    expect(render(formatted, false)).toContain('  <p>Keine Anmeldung</p>')
  })

  it('erhält Rails-ERB-Kommentare und Thor-Kommentare', async () => {
    const source = '<div>\n<%# Generator-Kommentar %>\n<%%# Rails-Kommentar %>\n<p>Text</p>\n</div>'
    const formatted = await formatThorErb(source)
    const generated = render(formatted)

    expect(formatted).toContain('<%# Generator-Kommentar -%>')
    expect(generated).toContain('  <%# Rails-Kommentar %>')
    expect(await formatThorTemplate(generated, { printWidth: 80 })).toBe(generated)
  })

  it('erhält verschachtelte Thor-Ausgaben in HTML-Attributen und Rails-Helpern', async () => {
    const source = `<div class="<%= singular_table_name %>">
<%%= link_to "<%= class_name %>", <%= singular_table_name %>_path, class: "button" %>
</div>`
    const generated = render(await formatThorErb(source))

    expect(generated).toContain('class="task"')
    expect(generated).toContain('link_to "Task"')
    expect(generated).toContain('task_path')
    expect(await formatThorTemplate(generated, { printWidth: 80 })).toBe(generated)
  })
})
