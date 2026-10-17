const prettier = require('prettier')
const { loadPrism } = require('@ruby/prism')

// Ruby-Parser einmalig initialisieren und wiederverwenden.
let prismParserPromise = null

async function getRubyParser() {
  if (!prismParserPromise) {
    prismParserPromise = loadPrism().catch((error) => {
      prismParserPromise = null
      throw error
    })
  }

  return prismParserPromise
}

/**
 * Erkennt einen form_with-Aufruf innerhalb einer ERB-/Thor-Anweisung.
 *
 * Gibt den Ruby-Syntaxknoten zurück, wenn Prism den Aufruf
 * erfolgreich analysieren konnte.
 */
async function parseFormWith(erb) {
  const match = erb.match(/^<%%?=?\s*([\s\S]*?)\s*%>$/)

  if (!match) {
    return null
  }

  const ruby = match[1].trim()

  if (!ruby.startsWith('form_with ')) {
    return null
  }

  // Ein mit "do" geöffneter Ruby-Block benötigt
  // für die eigenständige Analyse ein abschließendes "end".
  const rubySource = /\bdo(?:\s*\|[^|]*\|)?\s*$/.test(ruby) ? `${ruby}\nend` : ruby

  const parse = await getRubyParser()
  const result = parse(rubySource)

  if (result.errors.length > 0) {
    return null
  }

  const call = result.value.statements.body[0]

  if (call?.constructor.name !== 'CallNode' || call.name !== 'form_with') {
    return null
  }

  return call
}

/**
 * Liest den Originaltext eines Prism-Knotens aus.
 */
function rubyNodeText(source, node) {
  const start = node.location.startOffset
  const end = start + node.location.length

  // Prism verwendet UTF-8-Bytepositionen.
  // Deshalb den Originaltext ebenfalls als UTF-8 behandeln.
  const buffer = Buffer.from(source, 'utf8')

  return buffer.subarray(start, end).toString('utf8')
}

/**
 * Formatiert lange form_with-Aufrufe mit Keyword-Argumenten.
 *
 * Bestehende Ruby-Ausdrücke werden aus dem Originalcode
 * übernommen. Nur die Anordnung wird verändert.
 */
async function formatFormWith(erb) {
  const call = await parseFormWith(erb)

  if (!call) {
    return erb
  }

  const match = erb.match(/^(<%%?=)(\s*)([\s\S]*?)(\s*%>)$/)

  if (!match) {
    return erb
  }

  const [, opening, whitespace, ruby, closing] = match

  // Derselbe Ruby-Text, den parseFormWith() an Prism übergibt.
  const rubySource = ruby.trim()

  // Kurze, einzeilige Aufrufe nicht verändern.
  if (!ruby.includes('\n') && erb.length <= 100) {
    return erb
  }

  // Zunächst ausschließlich einfache Keyword-Argumente
  // mit einem optional verschachtelten Hash unterstützen.
  const argumentsNode = call.arguments_

  if (!argumentsNode || argumentsNode.arguments_.length !== 1) {
    return erb
  }

  const keywordHash = argumentsNode.arguments_[0]

  if (keywordHash.constructor.name !== 'KeywordHashNode') {
    return erb
  }

  const elements = keywordHash.elements

  if (elements.length < 2) {
    return erb
  }

  const prefix = `${opening}${whitespace}form_with `
  const continuationIndent = ' '.repeat(prefix.length - 1)

  const formattedArguments = elements.map((element, index) => {
    const key = rubyNodeText(rubySource, element.key)
    const value = element.value

    if (value.constructor.name === 'HashNode' && value.elements.length > 0) {
      const nestedIndent = ' '.repeat(prefix.length + 1)

      const nestedArguments = value.elements.map((nested) => {
        return `${nestedIndent}${rubyNodeText(rubySource, nested).trim()}`
      })

      return `${key} {\n` + nestedArguments.join(',\n') + `\n${continuationIndent}}`
    }

    return rubyNodeText(rubySource, element).trim()
  })

  // Den ursprünglichen Blockbeginn übernehmen,
  // ohne das für Prism ergänzte "end".
  const blockMatch = rubySource.match(/\s+(do(?:\s*\|[^|]*\|)?)\s*$/)
  const blockSuffix = call.block && blockMatch ? blockMatch[1] : ''

  const first = formattedArguments[0]
  const remaining = formattedArguments.slice(1)

  let result = prefix + first

  for (const argument of remaining) {
    result += `,\n${continuationIndent}${argument}`
  }

  if (blockSuffix) {
    result += ` ${blockSuffix}`
  }

  return result + closing
}

/**
 * Prüft, ob zwei Ruby-Anweisungen dieselbe Syntaxstruktur besitzen.
 *
 * Die Prüfung berücksichtigt keine Einrückungen oder Zeilenumbrüche.
 */
async function sameRubySyntax(originalErb, formattedErb) {
  function extractRuby(erb) {
    const match = erb.match(/^<%%?=?\s*([\s\S]*?)\s*%>$/)

    if (!match) {
      return null
    }

    const ruby = match[1].trim()

    // Offene Ruby-Blöcke für Prism abschließen.
    return /\bdo(?:\s*\|[^|]*\|)?\s*$/.test(ruby) ? `${ruby}\nend` : ruby
  }

  const originalRuby = extractRuby(originalErb)
  const formattedRuby = extractRuby(formattedErb)

  if (originalRuby === null || formattedRuby === null) {
    return false
  }

  const parse = await getRubyParser()

  const originalResult = parse(originalRuby)
  const formattedResult = parse(formattedRuby)

  if (originalResult.errors.length > 0 || formattedResult.errors.length > 0) {
    return false
  }

  // Syntaxbaum ohne Positionsangaben vergleichen.
  function normalizeAst(node) {
    if (Array.isArray(node)) {
      return node.map(normalizeAst)
    }

    if (node !== null && typeof node === 'object') {
      const normalized = {}

      for (const [key, value] of Object.entries(node)) {
        // Positionsangaben hängen von der Formatierung ab.
        if (key === 'location' || key.endsWith('Loc')) {
          continue
        }

        normalized[key] = normalizeAst(value)
      }

      return normalized
    }

    return node
  }

  const originalAst = normalizeAst(originalResult.value)
  const formattedAst = normalizeAst(formattedResult.value)

  return JSON.stringify(originalAst) === JSON.stringify(formattedAst)
}

/**
 * Findet ERB-/Thor-Anweisungen und berücksichtigt
 * einfache und doppelte Anführungszeichen.
 *
 * Gibt die gefundenen Anweisungen mit ihrer Position zurück.
 */
function findErbBlocks(source) {
  const blocks = []

  let position = 0

  while (position < source.length) {
    const start = source.indexOf('<%', position)
    const unexpectedEnd = source.indexOf('%>', position)

    // Eine schließende ERB-Markierung steht vor
    // der nächsten öffnenden ERB-Markierung.
    if (unexpectedEnd !== -1 && (start === -1 || unexpectedEnd < start)) {
      throw new Error('Ungültige Reihenfolge der ERB-Markierungen')
    }

    if (start === -1) {
      break
    }

    let index = start + 2

    // Thor verwendet <%% statt <%.
    if (source[index] === '%') {
      index++
    }

    let quote = null
    let escaped = false
    let insideComment = false
    let end = -1

    while (index < source.length) {
      const character = source[index]

      // Innerhalb eines Ruby-Kommentars alle Zeichen
      // bis zum Zeilenende unverändert überspringen.
      if (insideComment) {
        if (character === '\n') {
          insideComment = false
        }

        index++
        continue
      }

      if (escaped) {
        escaped = false
        index++
        continue
      }

      if (quote !== null) {
        if (character === '\\') {
          escaped = true
        } else if (character === quote) {
          quote = null
        }

        index++
        continue
      }

      if (character === '"' || character === "'") {
        quote = character
        index++
        continue
      }

      // Ein # außerhalb eines Strings beginnt
      // einen Ruby-Kommentar.
      if (character === '#') {
        insideComment = true
        index++
        continue
      }

      if (source.startsWith('%>', index)) {
        end = index + 2
        break
      }

      if (source.startsWith('<%', index)) {
        throw new Error('Ungültige Reihenfolge der ERB-Markierungen')
      }

      index++
    }

    if (end === -1) {
      throw new Error('Mehrzeilige ERB-Anweisung wurde nicht geschlossen.')
    }

    blocks.push({
      start,
      end,
      text: source.slice(start, end)
    })

    position = end
  }

  return blocks
}

/**
 * Entfernt Leerzeichen am Zeilenende innerhalb von ERB-Anweisungen,
 * ohne den Inhalt von Ruby-Strings zu verändern.
 */
function cleanErbTrailingWhitespace(text) {
  // Heredocs vollständig unverändert lassen.
  // Ihre Leerzeichen können Bestandteil des Stringinhalts sein.
  if (/<<[-~]?['"`]?[A-Za-z_]\w*/.test(text)) {
    return text
  }

  let quote = null
  let escaped = false
  let result = ''

  for (let index = 0; index < text.length; index++) {
    const character = text[index]

    if (escaped) {
      escaped = false
      result += character
      continue
    }

    if (quote !== null) {
      if (character === '\\') {
        escaped = true
      } else if (character === quote) {
        quote = null
      }

      result += character
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      result += character
      continue
    }

    if (character === '\n') {
      result = result.replace(/[ \t]+$/, '')
    }

    result += character
  }

  return result
}

/**
 * Erkennt die Art einer ERB-/Thor-Anweisung.
 */
function classifyRubyBlock(erb) {
  const match = erb.match(/^<%%?(-?=|-|#)?([\s\S]*?)%>$/)

  if (!match) {
    return 'other'
  }

  const marker = match[1] || ''
  const ruby = match[2].trim()

  // Kommentare verändern die Einrückung nicht.
  if (marker === '#') {
    return 'output'
  }

  // Ruby-Blöcke mit "do" erkennen,
  // beispielsweise form_with ... do |form|.
  if (/\bdo(?:\s*\|[^|]*\|)?\s*$/.test(ruby)) {
    return 'open'
  }

  // Normale Ruby-Ausgaben verändern die Einrückung nicht.
  if (marker === '=' || marker === '-=') {
    return 'output'
  }

  // Ein mehrzeiliger Ruby-Block, der innerhalb derselben
  // ERB-Anweisung geöffnet und geschlossen wird,
  // verändert die äußere Einrückung nicht.
  if (ruby.includes('\n') && /^(if|unless|case|begin|while|until|for)\b/.test(ruby) && /\bend\s*$/.test(ruby)) {
    return 'other'
  }

  if (/^end\b/.test(ruby)) {
    return 'close'
  }

  if (/^(else|elsif|when|rescue|ensure)\b/.test(ruby)) {
    return 'middle'
  }

  if (/^(if|unless|case|begin|while|until|for)\b/.test(ruby)) {
    return 'open'
  }

  return 'other'
}

/**
 * Ergänzt die Einrückung für Ruby-Blöcke.
 *
 * Mehrzeilige ERB-Anweisungen bleiben unverändert.
 */
function indentRubyBlocks(source) {
  const lines = source.split('\n')
  const result = []
  const erbBlocks = findErbBlocks(source)

  let rubyDepth = 0
  let insideMultilineErb = false
  let multilineErbText = ''
  let multilineErbIndent = ''
  let sourcePosition = 0

  for (const line of lines) {
    const trimmed = line.trimStart()

    // Position der aktuellen Zeile im ursprünglichen Text.
    const lineStart = sourcePosition
    const lineEnd = lineStart + line.length

    sourcePosition = lineEnd + 1

    // Tatsächliche ERB-Endpositionen statt bloßer
    // Suche nach "%>" im Zeilentext verwenden.
    const erbEndsOnLine = erbBlocks.some((block) => block.end > lineStart && block.end <= lineEnd)

    // Fortsetzung einer mehrzeiligen ERB-Anweisung.
    // Diese Zeilen dürfen nicht verändert werden.
    if (insideMultilineErb) {
      result.push(line)

      // Weitere Zeile der mehrzeiligen ERB-Anweisung sammeln.
      multilineErbText += '\n' + line

      if (erbEndsOnLine) {
        insideMultilineErb = false

        // Erst die vollständige Ruby-Anweisung auswerten.
        const type = classifyRubyBlock(multilineErbText.trim())

        if (type === 'close' || type === 'middle') {
          if (rubyDepth === 0) {
            throw new Error('Unerwartetes Ruby-end gefunden. Formatierung abgebrochen.')
          }

          rubyDepth--
        }

        if (type === 'open' || type === 'middle') {
          rubyDepth++
        }

        multilineErbText = ''
      }

      continue
    }

    const startsErb = /^<%%?/.test(trimmed)
    const endsErb = erbEndsOnLine

    // Mehrzeilige ERB-Anweisung erkennen.
    if (startsErb && !endsErb) {
      insideMultilineErb = true
      multilineErbText = line

      const extraIndent = '  '.repeat(rubyDepth)
      result.push(extraIndent + line)

      continue
    }

    // Nur vollständige ERB-Anweisungen berücksichtigen.
    const standaloneErb = trimmed.match(/^<%%?[\s\S]*?%>$/)

    const type = standaloneErb ? classifyRubyBlock(trimmed) : 'other'

    if (type === 'close' || type === 'middle') {
      if (rubyDepth === 0) {
        throw new Error('Unerwartetes Ruby-end gefunden. Formatierung abgebrochen.')
      }

      rubyDepth--
    }

    const extraIndent = '  '.repeat(rubyDepth)

    if (trimmed.length === 0) {
      result.push('')
    } else {
      result.push(extraIndent + line)
    }

    if (type === 'open' || type === 'middle') {
      rubyDepth++
    }
  }

  if (insideMultilineErb) {
    throw new Error('Mehrzeilige ERB-Anweisung wurde nicht geschlossen.')
  }

  if (rubyDepth !== 0) {
    throw new Error('Ruby-Blöcke sind nicht ausgeglichen. Formatierung abgebrochen.')
  }

  return result.join('\n')
}

/**
 * Formatiert ein Thor-/ERB-Template.
 */
async function formatThorTemplate(source) {
  // Vor der Formatierung prüfen, ob alle ERB-Anweisungen
  // ordnungsgemäß geschlossen sind.
  // ERB-Markierungen vor der Formatierung überprüfen.
  // ERB-/Thor-Anweisungen vor der Formatierung überprüfen.
  const erbBlocks = findErbBlocks(source)

  const protectedBlocks = []

  // Thor- und ERB-Anweisungen schützen.
  //
  // Statt gewöhnlichem Text verwenden wir eigene HTML-Elemente.
  // Dadurch behandelt Prettier die Anweisungen als getrennte Elemente.

  let protectedSource = ''
  let lastPosition = 0

  for (const block of erbBlocks) {
    const index = protectedBlocks.length

    // Text vor der ERB-Anweisung übernehmen.
    let beforeBlock = source.slice(lastPosition, block.start)

    // Prüfen, ob eine Ruby-Ausgabe direkt in Klammern steht.
    const parenthesized = block.text.startsWith('<%%=') && beforeBlock.endsWith('(') && source[block.end] === ')'

    if (parenthesized) {
      // Die öffnende Klammer gehört zum geschützten Block.
      beforeBlock = beforeBlock.slice(0, -1)
    }

    protectedSource += beforeBlock

    // Überflüssige Leerzeichen am Ende mehrzeiliger
    // ERB-Zeilen entfernen.
    const cleanedBlock = block.text.includes('\n') ? cleanErbTrailingWhitespace(block.text) : block.text

    // Lange form_with-Anweisungen mit Prism formatieren.
    let formattedBlock = cleanedBlock

    const candidate = await formatFormWith(cleanedBlock)

    if (candidate !== cleanedBlock) {
      // Änderungen nur übernehmen, wenn die Ruby-Syntax
      // nach der Formatierung unverändert bleibt.
      if (await sameRubySyntax(cleanedBlock, candidate)) {
        formattedBlock = candidate
      }
    }

    // Die ERB-Anweisung geschützt speichern.
    protectedBlocks.push(parenthesized ? `(${formattedBlock})` : formattedBlock)

    // Prüfen, ob wir uns innerhalb eines HTML-Attributs befinden.
    const lastTagStart = protectedSource.lastIndexOf('<')
    const lastTagEnd = protectedSource.lastIndexOf('>')

    const insideTag = lastTagStart > lastTagEnd

    let insideAttribute = false

    if (insideTag) {
      const tagContent = protectedSource.slice(lastTagStart)

      const doubleQuotes = (tagContent.match(/"/g) || []).length
      const singleQuotes = (tagContent.match(/'/g) || []).length

      insideAttribute = doubleQuotes % 2 === 1 || singleQuotes % 2 === 1
    }

    if (insideAttribute) {
      protectedSource += `B4UM_THOR_ATTR_${index}_END`
    } else {
      protectedSource += `<b4um-thor-block data-index="${index}"></b4um-thor-block>`
    }

    lastPosition = parenthesized ? block.end + 1 : block.end
  }

  // Verbleibenden HTML-Code übernehmen.
  protectedSource += source.slice(lastPosition)

  // HTML mit Prettier formatieren.
  const formatted = await prettier.format(protectedSource, {
    parser: 'html',
    tabWidth: 2,
    useTabs: false,
    printWidth: 100,
    htmlWhitespaceSensitivity: 'ignore'
  })

  // Geschützte Thor-/ERB-Anweisungen wiederherstellen.
  let restored = formatted

  for (let index = 0; index < protectedBlocks.length; index++) {
    const placeholder = new RegExp(`<b4um-thor-block\\s+data-index="${index}"\\s*><\\/b4um-thor-block>`, 'g')

    const matches = restored.match(placeholder) || []

    const attributePlaceholder = `B4UM_THOR_ATTR_${index}_END`

    const attributeMatches = restored.split(attributePlaceholder).length - 1

    if (matches.length + attributeMatches !== 1) {
      throw new Error(
        `Thor-Template konnte nicht sicher formatiert werden: Block ${index} fehlt oder ist mehrfach vorhanden.`
      )
    }

    if (matches.length === 1) {
      restored = restored.replace(placeholder, protectedBlocks[index])
    } else {
      restored = restored.replace(attributePlaceholder, protectedBlocks[index])
    }
  }

  // Sicherstellen, dass keine Platzhalter übrig geblieben sind.
  if (restored.includes('<b4um-thor-block') || /B4UM_THOR_ATTR_\d+_END/.test(restored)) {
    throw new Error('Nicht alle Thor-Platzhalter konnten wiederhergestellt werden.')
  }

  // Ruby-Blöcke zusätzlich einrücken.
  const indented = indentRubyBlocks(restored)

  // Sicherstellen, dass alle ERB-/Thor-Anweisungen
  // bei der Formatierung unverändert geblieben sind.
  // Nur das Entfernen überflüssiger Leerzeichen am
  // Zeilenende innerhalb mehrzeiliger ERB-Blöcke erlauben.
  const normalizeErbBlock = (text) => (text.includes('\n') ? cleanErbTrailingWhitespace(text) : text)

  const originalBlocks = erbBlocks.map((block) => normalizeErbBlock(block.text))

  const resultBlocks = findErbBlocks(indented).map((block) => block.text)

  if (originalBlocks.length !== resultBlocks.length) {
    throw new Error('Die Anzahl der Thor-/ERB-Anweisungen wurde verändert. Formatierung abgebrochen.')
  }

  for (let index = 0; index < originalBlocks.length; index++) {
    const original = originalBlocks[index]
    const result = resultBlocks[index]

    // Unveränderte ERB-Anweisungen wie bisher akzeptieren.
    if (original === result) {
      continue
    }

    // Nur Änderungen akzeptieren, die unsere eigene
    // form_with-Formatierung erzeugt hat.
    const expected = await formatFormWith(original)

    if (expected !== result) {
      throw new Error(`Thor-/ERB-Anweisung ${index} wurde unerwartet verändert. Formatierung abgebrochen.`)
    }

    // Zusätzlich die Ruby-Syntax mit Prism überprüfen.
    if (!(await sameRubySyntax(original, result))) {
      throw new Error(`Ruby-Syntax in Thor-/ERB-Anweisung ${index} wurde verändert. Formatierung abgebrochen.`)
    }
  }

  return indented
}

module.exports = {
  formatThorTemplate,
  classifyRubyBlock,
  indentRubyBlocks,
  formatFormWith,
  sameRubySyntax
}
