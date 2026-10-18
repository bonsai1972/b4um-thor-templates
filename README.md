# b4um Thor Templates

Syntax highlighting and formatting support for Ruby on Rails Thor generator templates and regular Rails ERB views in
Visual Studio Code.

**Current Version:** 0.1.6

## Overview

b4um Thor Templates is a Visual Studio Code extension designed to improve the development experience when working with
Ruby on Rails generator templates and regular ERB views.

The extension provides syntax highlighting for Thor templates and a custom formatter that combines HTML formatting with
Ruby syntax protection.

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

Features include:

- HTML indentation and structure formatting.
- Preservation of Ruby and ERB expressions.
- Preservation of multiline text inside headings and paragraphs.
- Preservation of existing `prettier-ignore` comments.
- Unicode support, including German umlauts.
- Stable formatting across repeated operations.

### Ruby and ERB Formatting

The formatter supports Ruby control structures and multiline expressions.

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
- `form.label`
- `form.submit`
- `render`
- `render partial:`
- `link_to`
- `button_to`

Supported helpers can be formatted across multiple lines with consistent argument alignment.

Unsupported Ruby expressions and form helpers are preserved without applying potentially unsafe argument formatting.

### Ruby Syntax Protection

The extension uses the Prism Ruby parser to verify that formatting changes preserve the original Ruby syntax.

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
| `.html.erb`    | b4um Rails ERB       | Yes        |
| `.rb.tt`       | b4um Thor Ruby       | No         |
| `.js.tt`       | b4um Thor JavaScript | No         |
| `.css.tt`      | b4um Thor CSS        | No         |

Custom ERB syntax highlighting and formatting are available for `.html.erb.tt` and `.html.erb` files.

Other Thor template extensions are recognized but do not currently use the custom ERB formatter.

## Installation

### Install from VSIX

Download the latest VSIX package from:

[b4um Thor Templates – GitHub Releases](https://github.com/bonsai1972/b4um-thor-templates/releases/latest)

Current package:

`b4um-thor-templates-0.1.6.vsix`

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

### Format Thor Templates

Open a `.html.erb.tt` file in Visual Studio Code.

Open the Command Palette (`Cmd + Shift + P` on macOS).

Select:

**Format Document With... → b4um Thor Formatter**

### Format Rails ERB Views

Open a `.html.erb` file in Visual Studio Code.

Open the Command Palette (`Cmd + Shift + P` on macOS).

Select:

**Format Document With... → b4um Thor Formatter**

### Formatting Behavior

Formatting is performed manually.

Automatic formatting on save is not enabled by default.

Manual formatting is recommended to maintain control over changes to Rails templates and views.

The formatter is designed to produce stable results when formatting the same file multiple times.

## Development

### Requirements

- Visual Studio Code 1.90.0 or newer
- Node.js
- npm

### Clone the Repository

```bash
git clone https://github.com/bonsai1972/b4um-thor-templates.git
cd b4um-thor-templates
```

### Install Dependencies

```bash
npm install
```

### Run the Extension

Open the project in Visual Studio Code.

Press **F5** to launch the Extension Development Host.

Open a `.html.erb.tt` or `.html.erb` file to test syntax highlighting and formatting.

## Tests

The project includes automated tests using Vitest.

Run the test suite with:

```bash
npx vitest run
```

The tests cover:

- Thor syntax preservation.
- Regular Rails ERB formatting.
- Ruby block indentation.
- Multiline Ruby expressions.
- Rails helper formatting.
- Nested Ruby hashes.
- Positional and keyword arguments.
- Ruby syntax verification using Prism.
- Unicode preservation.
- Malformed ERB structures.
- HTML formatting protection.
- Formatting stability and idempotence.
- Integration tests using real b4um generator templates.

**Version 0.1.6: 65 automated tests passed.**

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
