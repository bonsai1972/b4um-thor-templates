import { describe, it, expect } from 'vitest'
import formatter from './formatter.js'
import fs from 'node:fs'
import path from 'node:path'

const { formatThorTemplate, classifyRubyBlock, indentRubyBlocks, formatFormWith, sameRubySyntax } = formatter

describe('b4um Thor Formatter', () => {
  it('rückt HTML korrekt ein', async () => {
    const source = `<div>
<h1>Meine Aufgaben</h1>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('  <h1>Meine Aufgaben</h1>')
  })

  it('erhält Thor-Ausgaben unverändert', async () => {
    const source = `<div>
<%%= render "progress" %>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('<%%= render "progress" %>')
  })

  it('erhält Ruby-Kontrollstrukturen unverändert', async () => {
    const source = `<ul>
<%% @tasks.each do |task| %>
<li><%%= task.title %></li>
<%% end %>
</ul>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('<%% @tasks.each do |task| %>')
    expect(result).toContain('<%%= task.title %>')
    expect(result).toContain('<%% end %>')
  })

  it('erhält mehrzeilige Ruby-Anweisungen', async () => {
    const source = `<div>
<%%= link_to "Neue Aufgabe",
    new_task_path,
    class: "button" %>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain(
      `<%%= link_to "Neue Aufgabe",
    new_task_path,
    class: "button" %>`
    )
  })

  it('rückt Inhalte innerhalb von Ruby-Blöcken korrekt ein', async () => {
    const source = `<div>
<%% if @tasks.any? %>
<ul>
<%% @tasks.each do |task| %>
<li><%%= task.title %></li>
<%% end %>
</ul>
<%% else %>
<p>Keine Aufgaben vorhanden.</p>
<%% end %>
</div>`

    const expected = `<div>
  <%% if @tasks.any? %>
    <ul>
      <%% @tasks.each do |task| %>
        <li><%%= task.title %></li>
      <%% end %>
    </ul>
  <%% else %>
    <p>Keine Aufgaben vorhanden.</p>
  <%% end %>
</div>
`

    const result = await formatThorTemplate(source)

    expect(result).toBe(expected)
  })

  it('formatiert lange form_with-Argumente über mehrere Zeilen', async () => {
    const source = `<%%= form_with model: @task, data: { controller: "b4um-todo", action: "turbo:submit-end->b4um-todo#resetAfterSuccess" }, class: "task-form" do |form| %>
<div></div>
<%% end %>`

    const expected = `<%%= form_with model: @task,
              data: {
                controller: "b4um-todo",
                action: "turbo:submit-end->b4um-todo#resetAfterSuccess"
              },
              class: "task-form" do |form| %>
  <div></div>
<%% end %>
`

    const result = await formatThorTemplate(source)

    expect(result).toBe(expected)
  })

  it('korrigiert falsch eingerückte mehrzeilige form_with-Argumente', async () => {
    const source = `<%%= form_with model: @task,
data: {
controller: "b4um-todo",
action: "turbo:submit-end->b4um-todo#resetAfterSuccess"
},
class: "task-form" do |form| %>
<div></div>
<%% end %>`

    const expected = `<%%= form_with model: @task,
              data: {
                controller: "b4um-todo",
                action: "turbo:submit-end->b4um-todo#resetAfterSuccess"
              },
              class: "task-form" do |form| %>
  <div></div>
<%% end %>
`

    const result = await formatThorTemplate(source)

    expect(result).toBe(expected)

    // Auch beim erneuten Formatieren darf sich nichts ändern.
    expect(await formatThorTemplate(result)).toBe(expected)
  })

  it('erhält Unicode-Zeichen beim Formatieren von form_with', async () => {
    const source = `<%%= form_with model: @task, data: { title: "Schöne Grüße", controller: "b4um-todo", action: "turbo:submit-end->b4um-todo#resetAfterSuccess" }, class: "task-form" do |form| %>
<div></div>
<%% end %>`

    const expected = `<%%= form_with model: @task,
              data: {
                title: "Schöne Grüße",
                controller: "b4um-todo",
                action: "turbo:submit-end->b4um-todo#resetAfterSuccess"
              },
              class: "task-form" do |form| %>
  <div></div>
<%% end %>
`

    const result = await formatThorTemplate(source)

    // Unicode-Zeichen müssen vollständig erhalten bleiben.
    expect(result).toBe(expected)

    // Die Ruby-Syntax muss unverändert sein.
    const originalErb = source.match(/<%%?[\s\S]*?%>/)[0]
    const formattedErb = result.match(/<%%?[\s\S]*?%>/)[0]

    expect(await sameRubySyntax(originalErb, formattedErb)).toBe(true)

    // Wiederholtes Formatieren darf nichts verändern.
    expect(await formatThorTemplate(result)).toBe(expected)
  })

  it('formatiert mehrzeilige form.text_field-Argumente', async () => {
    const source = `<%%= form.text_field :name,
  class: "form-input",
  placeholder: " ",
  required: true,
  autofocus: true,
  data: {
    b4um_todo_target: "input",
    action: "input->b4um-todo#updateSubmitState" } %>`

    const expected = `<%%= form.text_field :name,
                    class: "form-input",
                    placeholder: " ",
                    required: true,
                    autofocus: true,
                    data: {
                      b4um_todo_target: "input",
                      action: "input->b4um-todo#updateSubmitState"
                    } %>
`

    const result = await formatThorTemplate(source)

    expect(result).toBe(expected)

    // Wiederholtes Formatieren muss stabil bleiben.
    expect(await formatThorTemplate(result)).toBe(expected)

    // Die Ruby-Syntax darf sich nicht verändern.
    expect(await sameRubySyntax(source, result.trimEnd())).toBe(true)
  })

  it('formatiert mehrzeilige form.label-Argumente', async () => {
    const source = `<%%= form.label :name,
  class: "form-label",
  data: {
    controller: "tooltip",
    action: "click->tooltip#show" } %>`

    const expected = `<%%= form.label :name,
               class: "form-label",
               data: {
                 controller: "tooltip",
                 action: "click->tooltip#show"
               } %>
`

    const result = await formatThorTemplate(source)

    expect(result).toBe(expected)
    expect(await formatThorTemplate(result)).toBe(expected)
    expect(await sameRubySyntax(source, result.trimEnd())).toBe(true)
  })

  it('formatiert mehrzeilige form.submit-Argumente', async () => {
    const source = `<%%= form.submit "Speichern",
  class: "btn btn-primary",
  data: {
    turbo_submits_with: "Wird gespeichert...",
    disable_with: "Bitte warten" } %>`

    const expected = `<%%= form.submit "Speichern",
                class: "btn btn-primary",
                data: {
                  turbo_submits_with: "Wird gespeichert...",
                  disable_with: "Bitte warten"
                } %>
`

    const result = await formatThorTemplate(source)

    expect(result).toBe(expected)
    expect(await formatThorTemplate(result)).toBe(expected)
    expect(await sameRubySyntax(source, result.trimEnd())).toBe(true)
  })

  it('verändert unbekannte Formularhelfer nicht', async () => {
    const source = `<%%= form.custom_field :name,
  class: "form-input",
  data: {
    controller: "custom",
    action: "click->custom#run" } %>`

    const result = await formatThorTemplate(source)

    // Unbekannte Methoden dürfen nicht durch unsere
    // Formularformatierung verändert werden.
    expect(result).toContain(source)
  })

  describe('Ruby-Blockerkennung', () => {
    it('erkennt öffnende Ruby-Blöcke', () => {
      expect(classifyRubyBlock('<%% if @tasks.any? %>')).toBe('open')
      expect(classifyRubyBlock('<%% unless @tasks.empty? %>')).toBe('open')
      expect(classifyRubyBlock('<%% @tasks.each do |task| %>')).toBe('open')
    })

    it('erkennt alternative Zweige', () => {
      expect(classifyRubyBlock('<%% else %>')).toBe('middle')
      expect(classifyRubyBlock('<%% elsif @tasks.any? %>')).toBe('middle')
      expect(classifyRubyBlock('<%% when :active %>')).toBe('middle')
    })

    it('erkennt schließende Ruby-Blöcke', () => {
      expect(classifyRubyBlock('<%% end %>')).toBe('close')
    })

    it('erkennt Ruby-Ausgaben', () => {
      expect(classifyRubyBlock('<%%= task.title %>')).toBe('output')
      expect(classifyRubyBlock('<%%= render "progress" %>')).toBe('output')
    })

    it('erkennt sonstige Ruby-Anweisungen', () => {
      expect(classifyRubyBlock('<%% total = 10 %>')).toBe('other')
    })

    it('erkennt form_with als öffnenden Ruby-Block', () => {
      expect(classifyRubyBlock('<%%= form_with model: @task, data: { controller: "b4um-todo" } do |form| %>')).toBe(
        'open'
      )
    })
  })
})

describe('Echte b4um Generator-Templates', () => {
  it('erhält alle Thor-Anweisungen außer erlaubten form_with-Formatierungen', async () => {
    const filePath = path.join(process.cwd(), 'fixtures', 'todo-index.html.erb.tt')

    const source = fs.readFileSync(filePath, 'utf8')

    const originalBlocks = source.match(/<%%?[\s\S]*?%>/g) || []

    const result = await formatThorTemplate(source)

    const formattedBlocks = result.match(/<%%?[\s\S]*?%>/g) || []

    // Es dürfen keine Thor-Anweisungen verloren gehen
    // oder zusätzlich entstehen.
    expect(formattedBlocks).toHaveLength(originalBlocks.length)

    for (let index = 0; index < originalBlocks.length; index++) {
      const original = originalBlocks[index]
      const formatted = formattedBlocks[index]

      if (original === formatted) {
        continue
      }

      // Nur unterstützte Rails-Formularhelfer dürfen verändert werden.
      expect(original).toMatch(/^<%%?=\s*(?:form_with\b|form\.[a-z_]\w*\b)/)

      // Die Änderung muss exakt unserer Formatierung entsprechen.
      expect(formatted).toBe(await formatFormWith(original))

      // Die Ruby-Syntax muss unverändert bleiben.
      expect(await sameRubySyntax(original, formatted)).toBe(true)
    }
  })
})

describe('Stabile Formatierung', () => {
  it('verändert das Todo-Template beim zweiten Formatieren nicht erneut', async () => {
    const filePath = path.join(process.cwd(), 'fixtures', 'todo-index.html.erb.tt')

    const source = fs.readFileSync(filePath, 'utf8')

    const firstResult = await formatThorTemplate(source)
    const secondResult = await formatThorTemplate(firstResult)

    expect(secondResult).toBe(firstResult)
  })
})

describe('Ruby-Ausgaben innerhalb von Text', () => {
  it('hält Klammern und Ruby-Ausgaben zusammen', async () => {
    const source = `<span id="incomplete_tasks_count">
  (<%%= @incomplete_tasks.size %>)
</span>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('(<%%= @incomplete_tasks.size %>)')
  })
})

describe('Ruby-Bedingungen mit else', () => {
  it('formatiert if/else/end korrekt', async () => {
    const source = `<div class="account">
<%% if logged_in? %>
<p>Willkommen!</p>
<%% else %>
<p>Bitte anmelden.</p>
<%% end %>
</div>`

    const expected = `<div class="account">
  <%% if logged_in? %>
    <p>Willkommen!</p>
  <%% else %>
    <p>Bitte anmelden.</p>
  <%% end %>
</div>
`

    const result = await formatThorTemplate(source)

    expect(result).toBe(expected)
  })
})

describe('Ruby-Ausgaben in HTML-Attributen', () => {
  it('erhält Ruby-Ausgaben innerhalb eines href-Attributs', async () => {
    const source = `<div>
<a href="<%%= user_path(user) %>">Profil anzeigen</a>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('<a href="<%%= user_path(user) %>">Profil anzeigen</a>')
  })
})

describe('Weitere Ruby-Ausgaben in HTML-Attributen', () => {
  it('erhält Ruby-Ausgaben in einfachen Anführungszeichen', async () => {
    const source = `<div>
<a href='<%%= user_path(user) %>'>Profil anzeigen</a>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('<%%= user_path(user) %>')
    expect(result).toContain('Profil anzeigen</a>')
  })

  it('erhält mehrere Ruby-Ausgaben innerhalb eines Attributs', async () => {
    const source = `<div>
<a class="<%%= base_class %> <%%= active_class %>">Profil anzeigen</a>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('class="<%%= base_class %> <%%= active_class %>"')
  })
})

describe('Sicherheit bei fehlerhaften Ruby-Blöcken', () => {
  it('bricht bei einem überzähligen end ab', async () => {
    const source = `<div>
<%% end %>
<p>Hallo</p>
</div>`

    await expect(formatThorTemplate(source)).rejects.toThrow('Unerwartetes Ruby-end gefunden')
  })
})

describe('Sicherheit bei nicht geschlossenen Ruby-Blöcken', () => {
  it('bricht bei einem fehlenden end ab', async () => {
    const source = `<div>
<%% if logged_in? %>
<p>Willkommen!</p>
</div>`

    await expect(formatThorTemplate(source)).rejects.toThrow('Ruby-Blöcke sind nicht ausgeglichen')
  })
})

describe('Sicherheit mehrzeiliger ERB-Anweisungen', () => {
  it('verändert mehrzeilige Ruby-Anweisungen innerhalb eines if-Blocks nicht', async () => {
    const source = `<div>
<%% if logged_in? %>
<%%= link_to "Profil",
  user_path(current_user),
  class: "profile-link" %>
<%% end %>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain(
      `<%%= link_to "Profil",
  user_path(current_user),
  class: "profile-link" %>`
    )
  })
})

describe('Stabile Formatierung mehrzeiliger ERB-Anweisungen', () => {
  it('verändert mehrzeilige Ruby-Anweisungen beim zweiten Formatieren nicht', async () => {
    const source = `<div>
<%% if logged_in? %>
<%%= link_to "Profil",
  user_path(current_user),
  class: "profile-link" %>
<%% end %>
</div>`

    const firstResult = await formatThorTemplate(source)
    const secondResult = await formatThorTemplate(firstResult)

    expect(secondResult).toBe(firstResult)
  })
})

describe('Sicherheit bei unvollständigen ERB-Anweisungen', () => {
  it('bricht bei einer nicht geschlossenen mehrzeiligen ERB-Anweisung ab', async () => {
    const source = `<div>
<%%= link_to "Profil",
  user_path(current_user),
  class: "profile-link"
</div>`

    await expect(formatThorTemplate(source)).rejects.toThrow('Mehrzeilige ERB-Anweisung wurde nicht geschlossen')
  })
})

describe('Sicherheit der ERB-Markierungsreihenfolge', () => {
  it('bricht bei falsch angeordneten ERB-Markierungen ab', async () => {
    const source = `<div>
%>
<%%= @user.name
</div>`

    await expect(formatThorTemplate(source)).rejects.toThrow('Ungültige Reihenfolge der ERB-Markierungen')
  })
})

describe('Sicherheit bei verschachtelten ERB-Markierungen', () => {
  it('bricht bei einer zweiten ERB-Öffnung ohne vorherigen Abschluss ab', async () => {
    const source = `<div>
<%%= @user.name
<%%= @user.email %>
</div>`

    await expect(formatThorTemplate(source)).rejects.toThrow('Ungültige Reihenfolge der ERB-Markierungen')
  })
})

describe('ERB-Zeichen innerhalb von Ruby-Strings', () => {
  it('erhält ein Prozent-Endzeichen innerhalb eines Ruby-Strings', async () => {
    const source = `<div>
<%%= "Der Text enthält %> als Zeichenfolge" %>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('<%%= "Der Text enthält %> als Zeichenfolge" %>')
  })
})

describe('Maskierte Anführungszeichen in Ruby-Strings', () => {
  it('erhält maskierte Anführungszeichen und ERB-Zeichen', async () => {
    const source = `<div>
<%%= "Er sagte: \\"Hallo %> Welt\\"" %>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('<%%= "Er sagte: \\"Hallo %> Welt\\"" %>')
  })
})

describe('Einfache Anführungszeichen in Ruby-Strings', () => {
  it('erhält ERB-Zeichen innerhalb eines einfachen Ruby-Strings', async () => {
    const source = `<div>
<%%= 'Der Text enthält %> als Zeichenfolge' %>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain("<%%= 'Der Text enthält %> als Zeichenfolge' %>")
  })
})

describe('Ruby-Kommentare innerhalb von ERB-Anweisungen', () => {
  it('erhält ERB-Zeichen innerhalb eines Ruby-Kommentars', async () => {
    const source = `<div>
<%%
  # Dieser Kommentar enthält %> als Text
  @user.name
%>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('# Dieser Kommentar enthält %> als Text')

    expect(result).toContain('@user.name\n%>')
  })
})

describe('Mehrzeilige ERB-Anweisungen mit Kommentaren', () => {
  it('erhält alle Zeilen nach einem Prozent-Endzeichen im Kommentar', async () => {
    const source = `<div>
<%%
  # Dieser Kommentar enthält %> als Text
  @user.name
  @user.email
%>
</div>`

    const result = await formatThorTemplate(source)

    expect(result).toContain(
      `  # Dieser Kommentar enthält %> als Text
  @user.name
  @user.email
%>`
    )
  })
})

describe('Stabile Formatierung von Ruby-Kommentaren', () => {
  it('verändert mehrzeilige ERB-Anweisungen beim zweiten Formatieren nicht', async () => {
    const source = `<div>
<%%
  # Dieser Kommentar enthält %> als Text
  @user.name
  @user.email
%>
</div>`

    const firstResult = await formatThorTemplate(source)
    const secondResult = await formatThorTemplate(firstResult)

    expect(secondResult).toBe(firstResult)
  })
})

describe('Einrückung mehrzeiliger ERB-Anweisungen', () => {
  it('verändert Ruby-Zeilen nach einem Kommentar mit %> nicht', () => {
    const source = `<%%
  # Kommentar mit %>
  @user.name
  @user.email
%>`

    const result = indentRubyBlocks(source)

    expect(result).toBe(source)
  })
})

describe('ERB-Ende innerhalb eines Ruby-Kommentars', () => {
  it('weist verschachtelte ERB-Markierungen zurück', () => {
    const source = `<%%
  # Kommentar mit %>
  <%%= @user.name %>
%>`

    expect(() => indentRubyBlocks(source)).toThrow('Ungültige Reihenfolge der ERB-Markierungen')
  })
})

describe('ERB-Ende innerhalb eines mehrzeiligen Ruby-Strings', () => {
  it('erhält die gesamte mehrzeilige ERB-Anweisung unverändert', () => {
    const source = `<%%
  if @user
    text = "Dieser String enthält %> als Text"
    puts text
  end
%>`

    expect(indentRubyBlocks(source)).toBe(source)
  })
})

describe('Korrekte ERB-Enderkennung bei Ruby-Kommentaren', () => {
  it('verändert Ruby-Kontrollstrukturen innerhalb mehrzeiliger ERB-Anweisungen nicht', () => {
    const source = `<%%
  # Kommentar enthält %>
  if @user
    puts @user.name
  end
%>`

    const result = indentRubyBlocks(source)

    expect(result).toBe(source)
  })
})

describe('Mehrzeilige form_with-Anweisungen', () => {
  it('erkennt einen mehrzeiligen form_with-Block korrekt', async () => {
    const source = `<section>
<%%= form_with model: @task,
    data: {
      controller: "b4um-todo",
      action: "turbo:submit-end->b4um-todo#resetAfterSuccess"
    } do |form| %>
  <div class="form-field">
    <%%= form.text_field :name %>
  </div>
<%% end %>
</section>`

    const result = await formatThorTemplate(source)

    expect(result).toContain('do |form| %>')
    expect(result).toContain('<%% end %>')
  })
})
describe('Leerzeichen in mehrzeiligen ERB-Anweisungen', () => {
  it('entfernt überflüssige Leerzeichen am Zeilenende', async () => {
    const source = `<section>
<%%= form_with model: @task,
    data: {
      controller: "b4um-todo"
    } do |form| %>
  <p>Formular</p>
<%% end %>
</section>`.replace('model: @task,\n', 'model: @task,   \n')

    const result = await formatThorTemplate(source)

    expect(result).not.toMatch(/[ \t]+\n/)
  })
})

describe('Stabile Leerzeichenkorrektur', () => {
  it('verändert bereinigte ERB-Anweisungen beim zweiten Formatieren nicht', async () => {
    const source = `<section>
<%%= form_with model: @task,
    data: {
      controller: "b4um-todo"
    } do |form| %>
  <p>Formular</p>
<%% end %>
</section>`.replace('model: @task,\n', 'model: @task,   \n')

    const firstResult = await formatThorTemplate(source)
    const secondResult = await formatThorTemplate(firstResult)

    expect(firstResult).not.toMatch(/[ \t]+\n/)
    expect(secondResult).toBe(firstResult)
  })
})

describe('Leerzeichen innerhalb mehrzeiliger Ruby-Strings', () => {
  it('erhält bedeutende Leerzeichen innerhalb eines Strings', async () => {
    const source = `<section>
<%%= "Erste Zeile
Zweite Zeile"
%>
</section>`.replace('Erste Zeile\n', 'Erste Zeile   \n')

    const result = await formatThorTemplate(source)

    expect(result).toContain('Erste Zeile   \n')
  })
})

describe('Leerzeichen innerhalb von Ruby-Heredocs', () => {
  it('erhält bedeutende Leerzeichen innerhalb eines Heredocs', async () => {
    const source = `<section>
<%%= <<~TEXT
Erste Zeile
Zweite Zeile
TEXT
%>
</section>`.replace('Erste Zeile\n', 'Erste Zeile   \n')

    const result = await formatThorTemplate(source)

    expect(result).toContain('Erste Zeile   \n')
  })
})
