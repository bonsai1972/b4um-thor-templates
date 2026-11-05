const vscode = require('vscode')
const { formatThorTemplate, formatThorErb } = require('./formatter')
const { formatRuby, formatThorRuby } = require('./ruby-formatter')

function activate(context) {
  // HTML-/ERB-Formatter
  const erbFormatter = vscode.languages.registerDocumentFormattingEditProvider(['b4um-thor-erb', 'b4um-rails-erb'], {
    async provideDocumentFormattingEdits(document) {
      const source = document.getText()

      try {
        const config = vscode.workspace.getConfiguration('b4umThorTemplates', document.uri)
        const format = document.languageId === 'b4um-thor-erb' ? formatThorErb : formatThorTemplate
        const formatted = await format(source, { printWidth: config.get('printWidth', 80) })

        if (formatted === source) {
          return []
        }

        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(source.length))

        return [vscode.TextEdit.replace(fullRange, formatted)]
      } catch (error) {
        vscode.window.showErrorMessage(`b4um Thor Templates: ${error.message}`)
        return []
      }
    }
  })

  // Ruby-Formatter für normale Ruby-Dateien und Thor-Templates.
  const rubyFormatter = vscode.languages.registerDocumentFormattingEditProvider(['ruby', 'b4um-thor-ruby'], {
    async provideDocumentFormattingEdits(document) {
      const source = document.getText()

      try {
        const config = vscode.workspace.getConfiguration('b4umThorTemplates', document.uri)
        const format = document.languageId === 'ruby' ? formatRuby : formatThorRuby
        const formatted = await format(source, {
          printWidth: config.get('printWidth', 80),
          rubyExecutablePath: config.get('rubyExecutablePath', 'ruby')
        })

        if (formatted === source) {
          return []
        }

        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(source.length))

        return [vscode.TextEdit.replace(fullRange, formatted)]
      } catch (error) {
        vscode.window.showErrorMessage(`b4um Thor Ruby: ${error.message}`)
        return []
      }
    }
  })

  context.subscriptions.push(erbFormatter, rubyFormatter)
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}
