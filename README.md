# b4um Thor Templates

Syntax highlighting and formatting support for Ruby on Rails Thor generator templates in Visual Studio Code.

**Version:** 0.1.2

## Features

### Syntax Highlighting

Provides syntax highlighting for Rails Thor ERB templates using escaped ERB tags.

Example:

```erb
<%% if @user %>
  <h1>Welcome</h1>
<%% end %>
```

Supports template expressions such as:

- `<%% ... %>`
- `<%%= ... %>`
- `<% ... %>`
- `<%= ... %>`

### Thor Template Formatter

Includes a custom formatter for `.html.erb.tt` files.

The formatter:

- Formats HTML using Prettier.
- Preserves Ruby, ERB and Thor expressions.
- Handles Ruby control structures such as `if`, `else` and `end`.
- Supports multiline Ruby expressions.
- Recognizes Rails form helpers such as `form_with`.
- Formats long `form_with` calls across multiple lines.
- Corrects indentation in multiline `form_with` arguments.
- Formats nested keyword hashes in supported `form_with` calls.
- Preserves Unicode characters, including German umlauts.
- Uses the Prism Ruby parser to verify that formatted Ruby syntax remains unchanged.
- Protects ERB expressions from unintended changes.
- Detects several malformed ERB and Ruby block structures.
- Supports Ruby block indentation.

The formatter preserves Ruby expressions that cannot be safely reformatted.

Trailing whitespace is removed from Ruby code lines while whitespace inside quoted Ruby strings and heredocs is
preserved.

### Example: form_with Formatting

Before:

```erb
<%%= form_with model: @task, data: { controller: "b4um-todo", action: "turbo:submit-end->b4um-todo#resetAfterSuccess" }, class: "task-form" do |form| %>
<div></div>
<%% end %>
```

After:

```erb
<%%= form_with model: @task,
              data: {
                controller: "b4um-todo",
                action: "turbo:submit-end->b4um-todo#resetAfterSuccess"
              },
              class: "task-form" do |form| %>
  <div></div>
<%% end %>
```

The Ruby syntax is checked before formatting changes are accepted.

## Supported File Extensions

| Extension      | Language             |
| -------------- | -------------------- |
| `.html.erb.tt` | b4um Thor ERB        |
| `.rb.tt`       | b4um Thor Ruby       |
| `.js.tt`       | b4um Thor JavaScript |
| `.css.tt`      | b4um Thor CSS        |

Custom syntax highlighting and formatting are currently implemented for `.html.erb.tt` files.

## Installation

### Install from VSIX

Download `b4um-thor-templates-0.1.2.vsix` from the
[v0.1.2 GitHub release](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.2).

1. Open Visual Studio Code.
2. Open the Extensions panel (`Cmd + Shift + X` on macOS).
3. Click the `...` menu in the Extensions panel.
4. Select **Install from VSIX...**.
5. Choose the downloaded `.vsix` file.
6. Confirm the installation.

The extension can then be used in a normal Visual Studio Code window; the Extension Development Host is not required.

### Visual Studio Code Marketplace

The extension is not yet available on the Visual Studio Code Marketplace. Installation is currently provided through
GitHub Releases.

## Formatting

Open a `.html.erb.tt` file in Visual Studio Code.

Open the Command Palette (`Cmd + Shift + P` on macOS) and select:

**Format Document With... → b4um Thor Formatter**

The formatter processes HTML structure and supported Ruby expressions while protecting the original Ruby syntax.

Automatic formatting on save is not enabled by default. Manual formatting is recommended.

## Development

### Requirements

- Visual Studio Code 1.90.0 or newer
- Node.js and npm

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

Open the project in Visual Studio Code and press **F5** to launch the Extension Development Host.

Open a `.html.erb.tt` file to test syntax highlighting and formatting.

## Tests

The project includes **43 automated tests**. Run them with:

```bash
npx vitest run
```

The test suite covers:

- Thor syntax preservation
- Ruby block indentation
- Multiline Ruby expressions
- `form_with` formatting
- Nested Ruby hashes
- Unicode preservation
- Ruby syntax verification using Prism
- Malformed ERB structures
- Formatting stability and idempotence

## Release

**Current version:** 0.1.2

### What's New in v0.1.2

- Automatic formatting of long `form_with` calls.
- Improved indentation of multiline Ruby arguments.
- Formatting of nested keyword hashes in supported `form_with` calls.
- Unicode-safe Ruby source extraction.
- Ruby syntax verification using Prism.
- Additional automated tests, bringing the total to 43.

### Previous Release: v0.1.1

Version 0.1.1 improved multiline ERB whitespace handling while preserving Ruby strings, heredocs and existing ERB safety
checks.

Download the latest version from the
[v0.1.2 GitHub release](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.2).

## Status

b4um Thor Templates is currently under development.

Version 0.1.2 is available as source code on GitHub. An installable VSIX package is being prepared.

The extension is not yet published to the Visual Studio Code Marketplace.

## License

b4um Thor Templates is released under the MIT License.

Copyright (c) 2026 Alexander Baum.

See the [LICENSE](LICENSE) file for details.
