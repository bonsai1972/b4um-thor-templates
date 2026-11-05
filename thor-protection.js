/**
 * Schützt die von Thor ausgewerteten Tags. <%% bleibt für die nächste
 * ERB-Auswertung erhalten und wird deshalb gesondert behandelt.
 */
function protectThorTags(source, language) {
  let prefix = 'B4umThorToken'

  while (source.toLowerCase().includes(prefix.toLowerCase())) {
    prefix += 'X'
  }

  const tags = []
  const text = source.replace(/<%%|<%(?!%)[\s\S]*?%>/g, (tag, offset) => {
    if (tag === '<%%') {
      if (language === 'ruby') {
        const token = `${prefix}${tags.length}End`
        tags.push({ token, tag, standalone: false, before: '' })
        return token
      }

      return '<%'
    }

    const before = source.slice(source.lastIndexOf('\n', offset - 1) + 1, offset)
    const after = source.slice(offset + tag.length).split('\n', 1)[0]
    const output = /^<%[-]?=/.test(tag)
    const standalone = !output && /^[\t ]*$/.test(before) && /^[\t \r]*$/.test(after)

    if (!output && !standalone) {
      throw new Error('Thor-Steueranweisungen müssen auf eigenen Zeilen stehen, damit sie sicher formatiert werden können.')
    }

    // Klassendefinitionen verlangen Konstanten, Rails-Helper dagegen Methoden.
    const className = /::$/.test(before) || (
      language === 'ruby' && /\b(?:class|module)\s+(?:(?:::)?[A-Z]\w*)*(?:::)?$/.test(before)
    )
    const token = `${className ? prefix : prefix.toLowerCase()}${tags.length}End`
    tags.push({ token, tag, standalone, before })

    return standalone ? (language === 'ruby' ? `# ${token}` : `<!-- ${token} -->`) : token
  })

  if (/<%(?!%)/.test(source.replace(/<%%|<%(?!%)[\s\S]*?%>/g, ''))) {
    throw new Error('Thor-Anweisung wurde nicht geschlossen.')
  }

  function restore(formatted) {
    for (const { token, tag, standalone, before } of tags) {
      if (formatted.split(token).length !== 2) {
        throw new Error('Ein Thor-Ausdruck wurde beim Formatieren verändert. Formatierung abgebrochen.')
      }

      if (standalone) {
        const marker = language === 'ruby' ? `# ${token}` : `<!-- ${token} -->`
        const pattern = new RegExp(`^[\\t ]*${marker}[\\t ]*\\r?$`, 'm')

        if (!pattern.test(formatted)) {
          throw new Error('Eine Thor-Steueranweisung wurde verschoben. Formatierung abgebrochen.')
        }

        // Thor verwendet trim_mode: '-'. Steuerzeilen sollen in der erzeugten
        // View weder eine Leerzeile noch führende Leerzeichen hinterlassen.
        const restoredTag = language === 'erb' ? tag.replace(/-?%>$/, '-%>') : tag
        formatted = formatted.replace(pattern, () => (language === 'erb' ? '' : before) + restoredTag)
      } else {
        // Rückgabefunktion schützt Ruby-Texte mit $& vor JavaScript-Ersetzungen.
        formatted = formatted.replace(token, () => tag)
      }
    }

    return formatted
  }

  return { text, restore }
}

module.exports = { protectThorTags }
