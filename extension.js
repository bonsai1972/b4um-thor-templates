const vscode = require('vscode')
const { formatThorTemplate } = require('./formatter')

function activate(context) {
  const formatter = vscode.languages.registerDocumentFormattingEditProvider('b4um-thor-erb', {
    async provideDocumentFormattingEdits(document) {
      const source = document.getText()

      try {
        const formatted = await formatThorTemplate(source)

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

  context.subscriptions.push(formatter)
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}
