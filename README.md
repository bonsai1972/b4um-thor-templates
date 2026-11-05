# b4um Thor Templates

Syntax highlighting and formatting for Ruby and Rake Thor generator templates, regular Ruby files, and Rails ERB views
in Visual Studio Code.

**Current Version:** 0.2.2

## Overview

b4um Thor Templates is a Visual Studio Code extension designed to improve the development experience when working with
Ruby on Rails generator templates, Ruby files, and regular ERB views.

The extension provides syntax highlighting for Thor templates, HTML/ERB formatting with embedded Ruby protection,
and Syntax Tree formatting for Ruby and Rake templates and regular Ruby files.

It supports both escaped ERB expressions used in Thor templates and standard ERB expressions used in Rails views.

## Features

### Syntax Highlighting

Provides syntax highlighting for Rails Thor templates and regular Rails ERB views.

Supported expressions include:

- `<%% ... %>`
- `<%%= ... %>`
- `<% ... %>`
- `<%= ... %>`

Example:

```erb
<%% if @user %>
  <h1>Welcome</h1>
<%% end %>
```

Thor templates and regular Rails views are handled separately to preserve their respective ERB syntax.

### HTML Formatting

The formatter uses Prettier to format HTML while protecting embedded Ruby and ERB expressions.

The extension defaults to two spaces and a preferred line width of 80 characters.

Features include:

- HTML indentation and structure formatting.
- Preservation of Ruby and ERB expressions.
- Preservation of multiline text inside headings and paragraphs.
- Preservation of existing `prettier-ignore` comments.
- Unicode support, including German umlauts.
- Stable formatting across repeated operations.

### Ruby and ERB Formatting

The formatter supports Ruby control structures and multiline expressions.

Ruby `.rb`, Ruby `.rb.tt`, and Rake `.rake.tt` files use Syntax Tree directly, without Prettier or its Ruby plugin.
Regular Ruby files use VS Code's Ruby language and are formatted directly; ERB text inside Ruby strings is preserved as content.
Thor expressions are temporarily replaced with Ruby placeholders and restored after formatting.
This applies the Ruby formatter's style to assignments, arrays, hashes, argument wrapping, and blocks.
Existing multiline argument lists are preserved and aligned, including nested method calls.
`add_column` and `redirect_to` calls with keyword options are always split across lines, regardless of line width.
Arrays and hashes passed as a single keyword value use the call's base indentation.
Short blocks may use braces.

The extension invokes a Ruby process using standard input/output.
Prettier remains responsible for HTML formatting only.

For `.erb.tt` files, formatting targets the generated Rails view. Escaped Rails tags are formatted
using their final `<%` / `<%=` width before being restored to `<%%` / `<%%=`.
Generator directives do not increase the indentation of the generated HTML. Standalone generator
directives receive `-%>` and start at column zero so Thor's `trim_mode: '-'` removes their line breaks.
Inline generator output expressions remain unchanged.

Supported features include:

- Ruby `if`, `else` and `end` blocks.
- Multiline Ruby expressions.
- Ruby `case`, `when`, `else` and `end` indentation.
- Consistent Ruby block indentation.
- Alignment of positional and keyword arguments.
- Formatting of nested keyword hashes.
- Stable indentation across repeated formatting operations.

### Rails Helper Formatting

The formatter supports selected Rails helpers, including:

- `form_with`
- `form.text_field`
- `form.email_field`
- `form.password_field`
- `form.text_area`
- `form.number_field`
- `form.date_field`
- `form.datetime_field`
- `form.datetime_local_field`
- `form.time_field`
- `form.telephone_field`
- `form.phone_field`
- `form.url_field`
- `form.search_field`
- `form.file_field`
- `form.hidden_field`
- `form.color_field`
- `form.range_field`
- `form.check_box`
- `form.radio_button`
- `form.label`
- `form.submit`
- `render`
- `render partial:`
- `link_to`
- `button_to`

Supported helpers can be formatted across multiple lines with consistent argument alignment.

Nested `data` attributes and Ruby hashes are formatted with two additional spaces per nesting level.

Curly braces inside quoted Ruby strings do not affect hash indentation.

Formatting preserves Ruby syntax and produces stable results across repeated operations.

Unsupported Ruby expressions and form helpers are preserved without applying potentially unsafe argument formatting.

### Ruby Syntax Protection

For ERB formatting, the extension uses the Prism Ruby parser to validate supported helper transformations and protect
embedded Ruby expressions. Ruby files and Ruby/Rake templates are parsed and formatted by Syntax Tree.
Thor tags in templates are protected with placeholders and checked before being restored.

Additional safeguards include:

- Protection of embedded ERB expressions.
- Detection of several malformed Ruby and ERB block structures.
- Preservation of whitespace inside quoted Ruby strings.
- Preservation of whitespace inside Ruby heredocs.
- Prevention of cumulative indentation changes.

The formatter avoids transformations that cannot be verified as safe.

## Supported File Extensions

| Extension      | Language             | Formatting |
| -------------- | -------------------- | ---------- |
| `.html.erb.tt` | b4um Thor ERB        | Yes        |
| `.erb.tt`      | b4um Thor ERB        | Yes        |
| `.html.erb`    | b4um Rails ERB       | Yes        |
| `.erb`         | b4um Rails ERB       | Yes        |
| `.rb.tt`       | b4um Thor Ruby       | Yes        |
| `.rake.tt`     | b4um Thor Ruby       | Yes        |
| `.rb`          | Ruby                 | Yes        |
| `.js.tt`       | b4um Thor JavaScript | No         |
| `.css.tt`      | b4um Thor CSS        | No         |

The ERB formatter supports HTML-based ERB templates and views.

JavaScript and CSS Thor templates are recognized but do not currently have formatting providers.

## Installation

### Install from VSIX

Download the latest VSIX package from:

[b4um Thor Templates – GitHub Releases](https://github.com/bonsai1972/b4um-thor-templates/releases/latest)

Current package:

`b4um-thor-templates-0.2.2.vsix`

To install:

1. Open Visual Studio Code.
2. Open the Extensions panel (`Cmd + Shift + X` on macOS).
3. Open the `...` menu in the Extensions panel.
4. Select **Install from VSIX...**.
5. Choose the downloaded `.vsix` file.
6. Confirm the installation.

The extension can then be used in a normal Visual Studio Code window.

The Extension Development Host is not required.

### Visual Studio Code Marketplace

The extension is not yet available on the Visual Studio Code Marketplace.

Installation is currently provided through GitHub Releases.

## Usage

### Ruby Formatting Requirements

Ruby 2.7 or newer must be available to VS Code. Install the formatting gems in that Ruby environment:

```bash
gem install syntax_tree prettier_print --no-document
```

If VS Code uses a different Ruby installation, set `b4umThorTemplates.rubyExecutablePath` to the
appropriate executable. The extension does not automatically install gems.
HTML/ERB formatting continues to work without a local Ruby executable.

### Format Ruby Files

Open a `.rb` file with the **Ruby** language mode and select
**Format Document With... → b4um Thor Templates** from the Command Palette.
This applies the same indentation, argument alignment, and Rails call formatting rules as Ruby templates.

To use the extension as the default Ruby formatter and format on save, add this to VS Code's `settings.json`:

```json
{
  "[ruby]": {
    "editor.defaultFormatter": "b4um.b4um-thor-templates",
    "editor.formatOnSave": true
  }
}
```

### Format Thor Templates

Open a `.rb.tt`, `.rake.tt`, `.erb.tt`, or `.html.erb.tt` file in Visual Studio Code.

Open the Command Palette (`Cmd + Shift + P` on macOS).

Select:

**Format Document With... → b4um Thor Templates**

### Format Rails ERB Views

Open a `.erb` or `.html.erb` file in Visual Studio Code.

Open the Command Palette (`Cmd + Shift + P` on macOS).

Select:

**Format Document With... → b4um Thor Templates**

### Formatting Behavior

Formatting is performed manually.

Automatic formatting on save is not enabled by default.

The extension is the default formatter for its three Ruby/ERB language IDs. To format on save,
add the following to VS Code's `settings.json`:

```json
{
  "[b4um-thor-ruby]": {
    "editor.formatOnSave": true
  },
  "[b4um-thor-erb]": {
    "editor.formatOnSave": true
  },
  "[b4um-rails-erb]": {
    "editor.formatOnSave": true
  }
}
```

Set `b4umThorTemplates.printWidth` to change the preferred line width for both formatters.
ERB indentation uses two spaces. The line width is a preference; dynamic generator output can
have a different length from the placeholders available while formatting the template.

Generator control directives must be on their own lines. Ruby templates whose generator branches
cannot be represented together as valid Ruby are rejected without changing the document.

The formatter is designed to produce stable results when formatting the same file multiple times.

### File Recognition and Other Ruby Tools

Ruby and Rake templates should show **b4um Thor Ruby** in the status bar. If an already opened `.rake.tt` file
still shows **Plain Text**, reopen the file or select **b4um Thor Ruby** from the language menu.
For an explicit workspace association, add:

```json
{
  "files.associations": {
    "*.rake.tt": "b4um-thor-ruby"
  }
}
```

Regular `.rb` files use the **Ruby** language mode. Select **b4um Thor Templates** as their formatter as described above.
RuboCop and Ruby LSP can independently report style or complexity diagnostics. Those diagnostics follow their own
configuration; formatting with this extension does not resolve every lint warning or complexity limit.

## Development

### Requirements

- Visual Studio Code 1.90.0 or newer
- Node.js
- npm
- Ruby with `syntax_tree` and `prettier_print` for Ruby formatting tests
- `activesupport`, `actionview`, and `rake` for generator-output integration tests

### Clone the Repository

```bash
git clone https://github.com/bonsai1972/b4um-thor-templates.git
cd b4um-thor-templates
```

### Install Dependencies

```bash
npm install
gem install syntax_tree prettier_print activesupport actionview rake --no-document
```

### Run the Extension

Open the project in Visual Studio Code.

Press **F5** to launch the Extension Development Host.

The launch configuration opens this project as the development host's workspace. Its workspace settings select this
extension for Ruby formatting, explicitly associate `.rake.tt`, and disable the standalone RuboCop extension for this
test project. These settings are excluded from the VSIX.

Open a `.rb`, `.rb.tt`, `.rake.tt`, `.erb.tt`, or `.erb` file to test syntax highlighting and formatting.

## Tests

The project includes automated tests using Vitest.

Run the test suite with:

```bash
npm test
```

The tests cover:

- Thor syntax preservation.
- Regular Rails ERB formatting.
- Ruby block indentation.
- Multiline Ruby expressions.
- Ruby case, when, else and end indentation.
- Rails helper formatting (form_with, render, link_to, button_to).
- Rails form field formatting (text_field, email_field, password_field, and other supported input helpers).
- Rails form.label and form.submit formatting.
- Multiline Rails form helper arguments.
- Nested data attributes in Rails forms.
- Nested Ruby hashes.
- Positional and keyword argument alignment.
- Ruby syntax verification using Prism.
- Unicode preservation.
- Malformed ERB structures.
- HTML formatting protection.
- Formatting stability and idempotence.
- Integration tests using real b4um generator templates.
- Curly braces inside Ruby strings do not affect argument indentation.
- Syntax Tree Ruby formatting and preservation of Thor expressions.
- Regular Ruby files, including ERB text inside strings and heredocs, using the Ruby language mode.
- Rake template formatting, generated Ruby syntax, and task registration with different generated fields.
- Real ERB evaluation of controller, migration, and view templates.
- Generated Ruby syntax and Rails Erubi compilation.
- Generated ERB argument alignment and separation of Thor/Rails control blocks.
- VS Code formatting providers and error handling.

**Version 0.2.2: 193 automated tests passed across five test files.**

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the complete version history and release notes.

## Releases

Download the latest version from:

[b4um Thor Templates – Latest Release](https://github.com/bonsai1972/b4um-thor-templates/releases/latest)

All published versions are available through GitHub Releases.

## Status

b4um Thor Templates is under active development.

The extension is distributed as an installable VSIX package through GitHub Releases.

It is not yet published to the Visual Studio Code Marketplace.

## License

b4um Thor Templates is released under the MIT License.

Copyright (c) 2026 Alexander Baum.

See the [LICENSE](LICENSE) file for details.
