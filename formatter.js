const prettier = require('prettier')
const { loadPrism } = require('@ruby/prism')

// Unterstützte Rails-Formularmethoden.
const FORM_HELPERS = [
  'text_field',
  'email_field',
  'password_field',
  'text_area',
  'number_field',
  'date_field',
  'datetime_field',
  'datetime_local_field',
  'time_field',
  'telephone_field',
  'phone_field',
  'url_field',
  'search_field',
  'file_field',
  'hidden_field',
  'color_field',
  'range_field',
  'label',
  'check_box',
  'radio_button',
  'select',
  'collection_select',
  'grouped_collection_select',
  'collection_check_boxes',
  'collection_radio_buttons',
  'submit',
  'button'
]

const FORM_HELPER_PATTERN = FORM_HELPERS.join('|')

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
 * Erkennt unterstützte Rails-Formularhelfer innerhalb
 * einer ERB-/Thor-Anweisung.
 */
async function parseFormWith(erb) {
  const match = erb.match(/^<%%?=?\s*([\s\S]*?)\s*%>$/)

  if (!match) {
    return null
  }

  const ruby = match[1].trim()

  const isFormWith = ruby.startsWith('form_with ')
  const isFormHelper = new RegExp(`^form\\.(${FORM_HELPER_PATTERN})\\b`).test(ruby)
  const isRenderPartial = /^render\s+(?:partial\s*:|["'])/.test(ruby)
  const isButtonTo = /^button_to\b/.test(ruby)
  const isLinkTo = erb.startsWith('<%=') && /^link_to\b/.test(ruby)

  if (!isFormWith && !isFormHelper && !isRenderPartial && !isButtonTo && !isLinkTo) {
    return null
  }

  // Offene Ruby-Blöcke für Prism abschließen.
  // Eingebettete Thor-Ausgaben für Prism vorübergehend
  // durch gültige Ruby-Ausdrücke ersetzen.
  const rubyForParsing = isButtonTo
    ? ruby.replace(/<%=\s*singular_table_name\s*%>_path\b/g, 'b4um_thor_placeholder_path')
    : ruby

  const rubySource = /\bdo(?:\s*\|[^|]*\|)?\s*$/.test(rubyForParsing) ? `${rubyForParsing}\nend` : rubyForParsing

  const parse = await getRubyParser()
  const result = parse(rubySource)

  if (result.errors.length > 0) {
    return null
  }

  const call = result.value.statements.body[0]

  if (call?.constructor.name !== 'CallNode') {
    return null
  }

  // link_to ohne Receiver unterstützen.
  if (isLinkTo) {
    return call.name === 'link_to' && !call.receiver ? call : null
  }

  // button_to ohne Receiver unterstützen.
  if (isButtonTo) {
    return call.name === 'button_to' && !call.receiver ? call : null
  }

  // Nur render-Aufrufe mit dem Keyword partial unterstützen.
  if (isRenderPartial) {
    return call.name === 'render' && !call.receiver ? call : null
  }

  // Ausschließlich unterstützte Methoden auf dem Formularobjekt erkennen.
  if (isFormWith) {
    return call.name === 'form_with' && !call.receiver ? call : null
  }

  if (
    !FORM_HELPERS.includes(call.name) ||
    call.receiver?.constructor.name !== 'CallNode' ||
    call.receiver.name !== 'form'
  ) {
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
  const rubySource =
    call.name === 'button_to'
      ? ruby.trim().replace(/<%=\s*singular_table_name\s*%>_path\b/g, 'b4um_thor_placeholder_path')
      : ruby.trim()

  // form_with nur bei langen oder bereits mehrzeiligen Aufrufen formatieren.
  // Unterstützte Formularhelfer dürfen auch kurze einzeilige Aufrufe umbrechen.
  if (call.name === 'form_with' && !ruby.includes('\n') && erb.length <= 100) {
    return erb
  }

  // Positionsargumente und Keyword-Argumente unterstützen.
  const argumentsNode = call.arguments_

  if (!argumentsNode) {
    return erb
  }

  const args = argumentsNode.arguments_
  const isFormWith = call.name === 'form_with'

  const keywordHash = args[args.length - 1]

  if (keywordHash?.constructor.name !== 'KeywordHashNode') {
    return erb
  }

  // link_to benötigt ein Text- und ein Zielargument.
  // Beide sollen vor den Keyword-Argumenten stehen.
  if (call.name === 'link_to' && args.length < 3) {
    return erb
  }

  const positionalArgs = args.slice(0, -1)

  // Nur einfache Positionsargumente unterstützen.
  if (
    positionalArgs.some(
      (argument) =>
        ![
          'SymbolNode',
          'StringNode',
          'IntegerNode',
          ...(['button_to', 'link_to'].includes(call.name) ? ['CallNode'] : [])
        ].includes(argument.constructor.name)
    )
  ) {
    return erb
  }

  const elements = keywordHash.elements

  // form_with und render partial: ab zwei Keyword-Argumenten formatieren.
  // Bei Formularhelfern reicht bereits ein Keyword-Argument.
  if (elements.length < (isFormWith || (call.name === 'render' && positionalArgs.length === 0) ? 2 : 1)) {
    return erb
  }

  const methodName = isFormWith
    ? 'form_with'
    : ['render', 'button_to', 'link_to'].includes(call.name)
      ? call.name
      : `form.${call.name}`
  const prefix = `${opening}${whitespace}${methodName} `

  // Folgeargumente beginnen an derselben Spalte
  // wie das erste Argument.
  const continuationIndent = ' '.repeat(prefix.length)

  const formattedArguments = [
    ...positionalArgs.map((argument) => {
      const text = rubyNodeText(rubySource, argument).trim()

      if (call.name === 'button_to') {
        return text.replace(/b4um_thor_placeholder_path/g, '<%= singular_table_name %>_path')
      }

      return text
    })
  ]

  for (const element of elements) {
    const key = rubyNodeText(rubySource, element.key)
    const value = element.value

    if (
      value.constructor.name === 'HashNode' &&
      value.elements.length > 0 &&
      !(
        call.name === 'button_to' &&
        value.elements.length === 1 &&
        !value.elements.some(
          (element) => element.value?.constructor.name === 'HashNode' && element.value.elements.length > 1
        )
      )
    ) {
      // Hash-Einträge stehen zwei Leerzeichen weiter rechts
      // als das zugehörige Keyword-Argument.
      const nestedIndent = ' '.repeat(continuationIndent.length + 2)

      const nestedArguments = value.elements.map((nested) => {
        const nestedValue = nested.value

        if (
          call.name === 'button_to' &&
          nestedValue?.constructor.name === 'HashNode' &&
          nestedValue.elements.length > 1
        ) {
          const nestedKey = rubyNodeText(rubySource, nested.key)

          const entries = nestedValue.elements.map(
            (entry) => `${nestedIndent}  ${rubyNodeText(rubySource, entry).trim()}`
          )

          return `${nestedIndent}${nestedKey} {\n` + entries.join(',\n') + `\n${nestedIndent}}`
        }

        return `${nestedIndent}${rubyNodeText(rubySource, nested).trim()}`
      })

      formattedArguments.push(`${key} {\n` + nestedArguments.join(',\n') + `\n${continuationIndent}}`)
    } else {
      formattedArguments.push(rubyNodeText(rubySource, element).trim())
    }
  }

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

    const ruby = match[1].trim().replace(/<%=\s*singular_table_name\s*%>_path\b/g, 'b4um_thor_placeholder_path')

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
        // In Thor-Templates darf eine auszuwertende ERB-Ausgabe
        // innerhalb einer maskierten Rails-ERB-Anweisung stehen.
        //
        // Beispiel:
        // <%%= button_to <%= singular_table_name %>_path(task), ... %>
        //
        // Andere Verschachtelungen bleiben weiterhin verboten.
        const outerIsEscaped = source.startsWith('<%%', start)
        const innerIsOutput = source.startsWith('<%=', index)

        if (outerIsEscaped && innerIsOutput) {
          const innerEnd = source.indexOf('%>', index + 3)

          if (innerEnd === -1) {
            throw new Error('Eingebettete Thor-Anweisung wurde nicht geschlossen.')
          }

          index = innerEnd + 2
          continue
        }

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
      if (multilineErbIndent) {
        // Die relative Einrückung der mehrzeiligen
        // Ruby-Anweisung erhalten.
        //
        // Nur die zusätzliche Ruby-Blocktiefe ergänzen,
        // die noch nicht in der Zeile enthalten ist.
        const firstLine = multilineErbText.split('\n')[0]

        // Die bereits berechnete Einrückung beibehalten.
        result.push(line)
      } else {
        const caseMatch = multilineErbText.match(/\n([ \t]*)case\b/)

        if (caseMatch) {
          const caseIndent = caseMatch[1]
          const content = line.trimStart()

          if (/^(when\b|else\b|end\b)/.test(content)) {
            result.push(caseIndent + content)
          } else if (content.length > 0) {
            result.push(caseIndent + '  ' + content)
          } else {
            result.push(line)
          }
        } else {
          result.push(line)
        }
      }

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

      multilineErbIndent = new RegExp(
        `^(?:<%%?=\\s*form\\.(${FORM_HELPER_PATTERN})\\b|<%=\\s*(?:render|link_to)\\b)`
      ).test(trimmed)
        ? '  '.repeat(rubyDepth)
        : ''

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

function alignRubyArguments(source) {
  const lines = source.split('\n')

  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(
      new RegExp(`^(\\s*<%%?=\\s*(?:link_to|render|form\\.(${FORM_HELPER_PATTERN}))\\s+)`)
    )

    if (!match) {
      continue
    }

    // Einzeilige ERB-Anweisungen besitzen keine Folgeargumente.
    if (lines[index].includes('%>')) {
      continue
    }

    const targetIndent = match[1].length
    let hashDepth = 0

    for (let next = index + 1; next < lines.length; next++) {
      const content = lines[next].trimStart()

      // Geschweifte Klammern außerhalb von Ruby-Strings ermitteln.
      let openingCount = 0
      let closingCount = 0
      let leadingClosings = 0

      let quote = null
      let escaped = false
      let comment = false
      let beforeCode = true

      for (const char of content) {
        if (comment) {
          break
        }

        if (escaped) {
          escaped = false
          continue
        }

        if (quote) {
          if (char === '\\') {
            escaped = true
          } else if (char === quote) {
            quote = null
          }

          continue
        }

        if (char === '"' || char === "'") {
          quote = char
          beforeCode = false
          continue
        }

        if (char === '#') {
          comment = true
          break
        }

        if (char === '{') {
          openingCount++
          beforeCode = false
          continue
        }

        if (char === '}') {
          closingCount++

          if (beforeCode) {
            leadingClosings++
          }

          continue
        }

        if (!/\s/.test(char)) {
          beforeCode = false
        }
      }

      // Schließende Klammern am Zeilenanfang gehören zur äußeren Ebene.
      hashDepth = Math.max(0, hashDepth - leadingClosings)

      const indent = targetIndent + hashDepth * 2

      lines[next] = ' '.repeat(indent) + content

      // Verschachtelung für die nächste Zeile aktualisieren.
      hashDepth = Math.max(0, hashDepth + openingCount - (closingCount - leadingClosings))

      if (content.includes('%>')) {
        index = next
        break
      }
    }
  }

  return lines.join('\n')
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

  // Bereits mehrzeilige HTML-Elemente vor dem
  // Zusammenziehen durch Prettier schützen.
  protectedSource = protectedSource.replace(
    /(<(h[1-6]|p)\b[^>]*>)(\r?\n)([ \t]*)([^<\r\n]+)(\r?\n)([ \t]*)(<\/\2\s*>)/g,
    (_match, opening, tag, newline1, indent1, content, newline2, indent2, closing) => {
      return `${opening}${newline1}${indent1}<!-- prettier-ignore --><!-- b4um-internal-ignore -->${newline1}${indent1}${content}${newline2}${indent2}${closing}`
    }
  )

  // HTML mit Prettier formatieren.
  const formatted = await prettier.format(protectedSource, {
    parser: 'html',
    tabWidth: 2,
    useTabs: false,
    printWidth: 100,
    htmlWhitespaceSensitivity: 'ignore',
    singleAttributePerLine: true,
    bracketSameLine: false
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
      restored = restored.replace(placeholder, (match, offset, source) => {
        const block = protectedBlocks[index]

        // Nur von unserem Formatter erzeugte Zeilen zusätzlich einrücken.
        const originalBlock = erbBlocks[index].text

        if (block === originalBlock || !block.includes('\n')) {
          return block
        }

        const lineStart = source.lastIndexOf('\n', offset - 1) + 1
        const linePrefix = source.slice(lineStart, offset)
        const indentation = /^[ \t]*$/.test(linePrefix) ? linePrefix : ''

        const lines = block.split('\n')

        const firstLine = lines[0]
        const firstArgument = firstLine.match(
          new RegExp(`^(<%%?=\\s*(?:form_with|form\\.(${FORM_HELPER_PATTERN})|render|button_to|link_to)\\s+)`)
        )

        if (!firstArgument) {
          return block
        }

        const targetColumn = indentation.length + firstLine.search(/\S/) + firstArgument[1].length

        return [
          firstLine,
          ...lines.slice(1).map((line) => {
            const content = line.trimStart()
            const originalIndent = line.length - content.length

            // Die vorhandene relative Einrückung beibehalten.
            const relativeIndent = originalIndent - firstArgument[1].length

            return ' '.repeat(Math.max(0, targetColumn + relativeIndent)) + content
          })
        ].join('\n')
      })
    } else {
      restored = restored.replace(attributePlaceholder, protectedBlocks[index])
    }
  }

  // Sicherstellen, dass keine Platzhalter übrig geblieben sind.
  if (restored.includes('<b4um-thor-block') || /B4UM_THOR_ATTR_\d+_END/.test(restored)) {
    throw new Error('Nicht alle Thor-Platzhalter konnten wiederhergestellt werden.')
  }

  // Ausschließlich unsere intern eingefügten Kommentare entfernen.
  // Bereits vorhandene prettier-ignore-Kommentare bleiben erhalten.
  const cleanedHtml = restored.replace(
    /^[ \t]*<!-- prettier-ignore -->\r?\n[ \t]*<!-- b4um-internal-ignore -->\r?\n/gm,
    ''
  )

  // Ruby-Blöcke zusätzlich einrücken.
  const indented = alignRubyArguments(indentRubyBlocks(cleanedHtml))

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

    // Zusätzliche HTML-Einrückung nur bei unterstützten
    // und tatsächlich formatierten Ruby-Anweisungen erlauben.
    let expectedWithIndentation = expected

    if (expected !== original && expected.includes('\n')) {
      const resultLines = result.split('\n')
      const expectedLines = expected.split('\n')

      const firstExpectedContinuation = expectedLines[1].match(/^[ \t]*/)[0]
      const firstResultContinuation = resultLines[1]?.match(/^[ \t]*/)?.[0] ?? ''

      if (firstResultContinuation.startsWith(firstExpectedContinuation)) {
        const extraIndentation = firstResultContinuation.slice(firstExpectedContinuation.length)

        expectedWithIndentation = expected.replace(/\n/g, `\n${extraIndentation}`)
      }
    }

    if (expectedWithIndentation !== result) {
      // Ausschließlich Änderungen der führenden Einrückung
      // innerhalb mehrzeiliger ERB-Anweisungen erlauben.
      const normalizeIndentation = (text) => {
        const lines = text.split('\n')

        return [lines[0], ...lines.slice(1).map((line) => line.trimStart())].join('\n')
      }

      if (normalizeIndentation(expectedWithIndentation) !== normalizeIndentation(result)) {
        throw new Error(`Thor-/ERB-Anweisung ${index} wurde unerwartet verändert. Formatierung abgebrochen.`)
      }

      // Auch bei reinen Einrückungsänderungen muss die
      // Ruby-Syntax unverändert bleiben.
      if (!(await sameRubySyntax(original, result))) {
        throw new Error(`Ruby-Syntax in Thor-/ERB-Anweisung ${index} wurde verändert. Formatierung abgebrochen.`)
      }
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
