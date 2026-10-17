# b4um Thor Templates

Syntax highlighting and formatting support for Ruby on Rails Thor generator templates in Visual Studio Code.

**Version:** 0.1.4

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
- Supports Rails `form_with` and selected form builder helpers.
- Formats long `form_with` calls across multiple lines.
- Formats single-line and multiline `form.text_field`, `form.label` and `form.submit` calls.
- Formats Rails `render partial:` calls with multiple keyword arguments.
- Corrects indentation of positional and keyword arguments.
- Formats nested keyword hashes in supported Rails helpers.
- Preserves unsupported form helpers without applying Ruby argument formatting.
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

### Example: form.text_field Formatting

Before:

```erb
<%%= form.text_field :name,
  class: "form-input",
  placeholder: " ",
  required: true,
  autofocus: true,
  data: {
    b4um_todo_target: "input",
    action: "input->b4um-todo#updateSubmitState" } %>
```

After:

```erb
<%%= form.text_field :name,
                    class: "form-input",
                    placeholder: " ",
                    required: true,
                    autofocus: true,
                    data: {
                      b4um_todo_target: "input",
                      action: "input->b4um-todo#updateSubmitState"
                    } %>
```

### Example: form.label Formatting

Before:

```erb
<%%= form.label :name, "Was möchtest du erledigen?", class: "form-label" %>
```

After:

```erb
<%%= form.label :name,
                "Was möchtest du erledigen?",
                class: "form-label" %>
```

### Example: form.submit Formatting

Before:

```erb
<%%= form.submit "Hinzufügen", class: "b4um-todo__button", data: { b4um_todo_target: "submit" } %>
```

After:

```erb
<%%= form.submit "Hinzufügen",
                 class: "b4um-todo__button",
                 data: {
                   b4um_todo_target: "submit"
                 } %>
```

### Example: render partial Formatting

Before:

```erb
<%%= render partial: "task", collection: @incomplete_tasks, as: :task %>
```

After:

```erb
<%%= render partial: "task",
             collection: @incomplete_tasks,
             as: :task %>
```

The formatter supports `render partial:` calls with multiple keyword arguments.

Simple calls such as `render partial: "task"` remain unchanged.

### Ruby Syntax Protection

The Prism Ruby parser verifies that formatting changes preserve the original Ruby syntax.

Unsupported Ruby expressions and form helpers are preserved without applying Ruby argument formatting.

The formatter also ensures stable results across repeated formatting operations.

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

Download `b4um-thor-templates-0.1.4.vsix` from the
[v0.1.4 GitHub release](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.4).

1. Open Visual Studio Code.
2. Open the Extensions panel (`Cmd + Shift + X` on macOS).
3. Click the `...` menu in the Extensions panel.
4. Select **Install from VSIX...**.
5. Choose the downloaded `.vsix` file.
6. Confirm the installation.

The extension can then be used in a normal Visual Studio Code window; the Extension Development Host is not required.

### Visual Studio Code Marketplace

The extension is not yet available on the Visual Studio Code Marketplace.

Installation is currently provided through GitHub Releases.

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

The project includes **50 automated tests**.

Run them with:

```bash
npx vitest run
```

The test suite covers:

- Thor syntax preservation
- Ruby block indentation
- Multiline Ruby expressions
- `form_with` formatting
- `form.text_field` formatting
- `form.label` formatting
- `form.submit` formatting
- `render partial:` formatting
- Nested Ruby hashes
- Positional and keyword arguments
- Unicode preservation
- Ruby syntax verification using Prism
- Unsupported form helper preservation
- Malformed ERB structures
- Formatting stability and idempotence
- Integration tests using real b4um generator templates

## Release

**Current version:** 0.1.4

### What's New in v0.1.4

Version 0.1.4 extends the Ruby formatting capabilities introduced in v0.1.3.

#### Improved Rails Form Builder Formatting

- Added automatic multiline formatting for single-line `form.label` calls.
- Added automatic multiline formatting for single-line `form.submit` calls.
- Improved indentation of positional and keyword arguments.
- Improved formatting of nested keyword hashes.

#### Rails Partial Rendering

- Added multiline formatting for `render partial:` calls.
- Supports multiple keyword arguments such as `partial`, `collection` and `as`.
- Aligns continuation lines consistently.
- Preserves simple `render partial:` calls without unnecessary changes.

#### Safety and Reliability

- Preserves Ruby syntax using the Prism parser.
- Maintains compatibility with existing Rails form helper formatting.
- Preserves unsupported Ruby expressions.
- Ensures stable formatting across repeated runs.
- Expanded automated test coverage to 50 tests.

### Previous Release: v0.1.3

Version 0.1.3 introduced:

- Multiline formatting for `form.text_field`.
- Multiline formatting for `form.label`.
- Multiline formatting for `form.submit`.
- Improved indentation of positional and keyword arguments.
- Support for nested keyword hashes in Rails form helpers.
- Preservation of unsupported form helpers.
- Ruby syntax verification using Prism.
- 47 automated tests.

The previous release is available from the
[v0.1.3 GitHub release](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.3).

### Previous Release: v0.1.2

Version 0.1.2 introduced:

- Automatic formatting of long `form_with` calls.
- Improved indentation of multiline Ruby arguments.
- Formatting of nested keyword hashes.
- Unicode-safe Ruby source extraction.
- Ruby syntax verification using Prism.
- 43 automated tests.

The previous release is available from the
[v0.1.2 GitHub release](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.2).

### Download

Download the latest version from the
[v0.1.4 GitHub release](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.4).

## Status

b4um Thor Templates is under active development.

Version 0.1.4 is the current release version.

The extension is distributed as an installable VSIX package through GitHub Releases.

The extension is not yet published to the Visual Studio Code Marketplace.

## License

b4um Thor Templates is released under the MIT License.

Copyright (c) 2026 Alexander Baum.

See the [LICENSE](LICENSE) file for details.
