# b4um Thor Templates

Syntax highlighting and formatting support for Ruby on Rails Thor generator templates in Visual Studio Code.

## Features

### Syntax Highlighting

Provides syntax highlighting for Thor ERB templates using escaped ERB tags.

```erb
<%% if @user %>
  <h1>Welcome</h1>
<%% end %>
```

Supports Thor template expressions such as:

- `<%% ... %>`
- `<%%= ... %>`
- `<% ... %>`
- `<%= ... %>`

### Thor Template Formatter

Includes a custom formatter for Thor ERB templates.

The formatter:

- Formats HTML using Prettier.
- Preserves Thor and ERB expressions.
- Handles Ruby control structures such as `if`, `else`, and `end`.
- Supports multiline Ruby expressions.
- Recognizes Rails form helpers such as `form_with`.
- Protects ERB expressions from unintended changes.
- Detects several malformed ERB and Ruby block structures.

Multiline Ruby expressions are intentionally preserved rather than reformatted internally.

## Supported File Extensions

| Extension      | Language             |
| -------------- | -------------------- |
| `.html.erb.tt` | b4um Thor ERB        |
| `.rb.tt`       | b4um Thor Ruby       |
| `.js.tt`       | b4um Thor JavaScript |
| `.css.tt`      | b4um Thor CSS        |

Custom syntax highlighting is currently implemented for `.html.erb.tt` files.

## Development

Requirements:

- Visual Studio Code 1.90.0 or newer
- Node.js and npm

Clone the repository:

```bash
git clone https://github.com/bonsai1972/b4um-thor-templates.git
cd b4um-thor-templates
```

Install dependencies:

```bash
npm install
```

Open the project in Visual Studio Code and press **F5** to launch the Extension Development Host.

## Formatting

Open a `.html.erb.tt` file in the Extension Development Host.

Use the Command Palette:

**Format Document With... → b4um Thor Formatter**

Automatic formatting on save is not enabled by default.

## Tests

Run the automated tests:

```bash
npx vitest run
```

The test suite covers Thor syntax preservation, Ruby block indentation, multiline expressions, malformed ERB structures,
and formatting stability.

## Status

**Version:** 0.1.0

The extension is currently under development.

It is available as source code on GitHub and has not yet been published to the Visual Studio Code Marketplace.

## License

b4um Thor Templates is released under the MIT License.

Copyright (c) 2026 Alexander Baum.

See the [LICENSE](LICENSE) file for details.
