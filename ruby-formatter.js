const { execFile } = require('node:child_process')
const path = require('node:path')
const { protectThorTags } = require('./thor-protection')

function runRubyFormatter(source, options) {
  return new Promise((resolve, reject) => {
    // Syntax Tree direkt über Standardeingabe und Standardausgabe aufrufen.
    const child = execFile(
      options.rubyExecutablePath || 'ruby',
      [path.join(__dirname, 'ruby-format.rb')],
      { encoding: 'utf8', timeout: 15000, maxBuffer: 16 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const setup = error.code === 'ENOENT' || /LoadError|cannot load such file/.test(stderr)
            ? ' Ruby und die Gems syntax_tree sowie prettier_print müssen verfügbar sein.'
            : ''
          reject(new Error(
            'Ruby-Formatierung fehlgeschlagen.' + setup + ' ' +
            (stderr.trim() || error.message)
          ))
          return
        }

        resolve(stdout)
      }
    )

    // Bei vorzeitig beendetem Ruby-Prozess liefert execFile den Fehler.
    child.stdin.on('error', () => {})
    child.stdin.end(JSON.stringify({
      source,
      printWidth: options.printWidth,
      tabWidth: options.tabWidth,
      trailingComma: options.trailingComma,
      rubySingleQuote: options.rubySingleQuote,
      rubyPlugins: options.rubyPlugins
    }))
  })
}

function normalizeRubySource(source) {
  if (typeof source !== 'string') {
    throw new TypeError('Source must be a string')
  }

  return source.replace(/\r\n?/g, '\n')
}

async function formatRuby(source, options = {}) {
  source = normalizeRubySource(source)

  if (source.trim().length === 0) {
    return ''
  }

  return runRubyFormatter(source, {
    printWidth: 80,
    tabWidth: 2,
    trailingComma: 'none',
    ...options
  })
}

async function formatThorRuby(source, options = {}) {
  const { text, restore } = protectThorTags(normalizeRubySource(source), 'ruby')
  return restore(await formatRuby(text, options))
}

module.exports = { formatRuby, formatThorRuby }
