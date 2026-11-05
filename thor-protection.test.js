import { describe, expect, it } from 'vitest'
import { protectThorTags } from './thor-protection.js'
import { formatThorRuby } from './ruby-formatter.js'
import { formatThorErb } from './formatter.js'

describe('Schutz der Thor-Ausdrücke', () => {
  it.each(['ruby', 'erb'])('vermeidet Platzhalter-Kollisionen in %s', (language) => {
    const source = 'B4umThorToken0End <%= class_name %>'
    const protectedSource = protectThorTags(source, language)

    expect(protectedSource.restore(protectedSource.text)).toBe(source)
  })

  it('erhält Ruby-Ausdrücke mit speziellen JavaScript-Ersetzungszeichen', async () => {
    const source = 'value = "<%= "$&" %>"\n'
    expect(await formatThorRuby(source)).toBe(source)
  })

  it('unterstützt dynamische Ruby-Methodennamen', async () => {
    const source = 'def <%= singular_table_name %>\n@task\nend\n'
    expect(await formatThorRuby(source)).toBe('def <%= singular_table_name %>\n  @task\nend\n')
  })

  it('weist verlorene oder vervielfachte Platzhalter zurück', () => {
    const { text, restore } = protectThorTags('<%= class_name %>', 'ruby')
    expect(() => restore('')).toThrow('Thor-Ausdruck')
    expect(() => restore(text + text)).toThrow('Thor-Ausdruck')
  })

  it.each([formatThorRuby, formatThorErb])('weist nicht geschlossene Thor-Anweisungen zurück', async (format) => {
    await expect(format('<%= class_name')).rejects.toThrow('nicht geschlossen')
  })

  it.each([formatThorRuby, formatThorErb])('verweigert unsichere Steueranweisungen mitten im Code', async (format) => {
    await expect(format('value = <% if owner? %>1<% end %>')).rejects.toThrow('eigenen Zeilen')
  })

  it('meldet ungültigen Ruby-Code', async () => {
    await expect(formatThorRuby('class Broken\ndef missing\n')).rejects.toThrow('Ruby-Formatierung fehlgeschlagen')
  })

  it('meldet ein fehlendes Ruby-Executable verständlich', async () => {
    await expect(formatThorRuby('puts "Hello"', { rubyExecutablePath: '/nonexistent/b4um-ruby' }))
      .rejects.toThrow('Ruby und die Gems')
  })
})
