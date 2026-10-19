# Changelog

All notable changes to b4um Thor Templates are documented in this file.

The project provides syntax highlighting and formatting support for Ruby on Rails Thor generator templates and regular
Rails ERB views in Visual Studio Code.

## [0.2.1] - 2026-10-19

### Fixed

- Fixed incorrect indentation of nested Ruby hashes in multiline Rails form helpers.
- Fixed curly braces inside Ruby strings incorrectly affecting argument indentation.
- Fixed indentation inconsistencies when formatting nested `data` attributes.

### Improved

- Improved Ruby argument alignment for multiline Rails helpers.
- Improved handling of quoted strings and escaped quotation marks.
- Improved formatting stability for nested Ruby hashes.

### Tests

- Expanded automated test coverage from 89 to 92 tests.
- Added regression tests for curly braces inside Ruby strings.
- Verified formatting directly in the Visual Studio Code Extension Development Host.
- All 92 automated tests passed.

---

## [0.2.0] - 2026-10-19

### Added

- Added multiline formatting support for Rails `form_with` helpers.
- Added formatting support for Rails form fields such as `text_field`, `email_field`, `password_field`, and other
  supported input helpers.
- Added multiline formatting for Rails `form.label` and `form.submit` calls.
- Added indentation support for nested `data` attributes in Rails form helpers.

### Improved

- Improved alignment of Rails form helper arguments.
- Improved indentation of nested Ruby hashes.
- Improved formatting consistency for multiline Rails form expressions.
- Preserved Unicode characters during formatting.
- Maintained stable formatting across repeated operations.

### Safety

- Preserved Ruby syntax validation using the Prism parser.
- Maintained protection against unsafe Ruby transformations.

### Tests

- Expanded automated test coverage from 65 to 89 tests.
- Added tests for Rails form helpers and nested `data` attributes.
- Added tests for formatting stability and Ruby syntax preservation.
- All 89 automated tests passed.

---

## [0.1.8] - 2026-10-18

### Added

- Added a custom extension icon featuring the original b4um signature.
- Improved visual identification of b4um Thor Templates in Visual Studio Code.

## [0.1.7] - 2026-10-18

### Documentation

- Restructured and simplified `README.md`.
- Removed extensive formatting examples from the README.
- Moved the release history into `CHANGELOG.md`.
- Added a dedicated changelog covering previous releases.
- Improved documentation structure and readability.
- No changes to the formatter or extension functionality.

### Release

[GitHub Release v0.1.7](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.7)

---

## [0.1.6] - 2026-10-18

### Improved

- Improved indentation of multiline Rails `render` calls.
- Improved alignment of positional and keyword arguments.
- Improved indentation of multiline Rails `link_to` calls.
- Added improved indentation handling for multiline Ruby `case` expressions.
- Aligned `when`, `else` and `end` with their corresponding `case` expression.
- Improved indentation of Ruby `case` result expressions.
- Improved handling of multiline ERB expressions inside Ruby blocks.
- Improved formatting stability across repeated operations.
- Prevented cumulative indentation changes in supported Rails helpers.

### Safety

- Preserved Ruby syntax verification using the Prism parser.
- Allowed verified indentation-only changes to supported multiline Ruby expressions.
- Maintained protection against unsafe Ruby transformations.

### Tests

- Expanded automated test coverage from 62 to 65 tests.
- Added tests for multiline Rails helper indentation.
- Added tests for repeated formatting stability.
- Added tests for multiline Ruby `case` indentation.
- Verified formatting using real Rails ERB views.
- All 65 automated tests passed.

### Release

[GitHub Release v0.1.6](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.6)

---

## [0.1.5]

### Added

- Added formatting support for regular Rails `.html.erb` files.
- Added a dedicated Rails ERB language registration.
- Added support for standard Rails ERB expressions.
- Added formatting for Rails `link_to` calls.
- Added formatting for Rails `render` calls.
- Added formatting support for selected `button_to` calls.

### Improved

- Improved Ruby argument alignment and indentation.
- Improved handling of nested keyword arguments.
- Improved indentation consistency for multiline Ruby expressions.
- Preserved unsupported Ruby expressions without unsafe modifications.
- Preserved existing multiline text in HTML headings.
- Preserved existing multiline text in HTML paragraphs.
- Preserved existing `prettier-ignore` comments.
- Reduced unwanted changes caused by HTML formatting.
- Improved formatting stability across repeated runs.

### Safety

- Maintained separation between Thor and regular Rails ERB syntax.
- Preserved Ruby syntax using the Prism parser.
- Improved protection of embedded Ruby expressions.

### Tests

- Expanded automated test coverage from 50 to 62 tests.
- Verified formatting using real Rails ERB views.
- All 62 automated tests passed.

### Release

[GitHub Release v0.1.5](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.5)

---

## [0.1.4]

### Added

- Added automatic multiline formatting for `form.label` calls.
- Added automatic multiline formatting for `form.submit` calls.
- Added multiline formatting for `render partial:` calls.

### Improved

- Improved indentation of positional and keyword arguments.
- Improved formatting of nested keyword hashes.
- Improved consistency of multiline Rails helper formatting.
- Improved stability across repeated formatting operations.

### Tests

- Expanded automated test coverage to 50 tests.
- All 50 automated tests passed.

### Release

[GitHub Release v0.1.4](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.4)

---

## [0.1.3]

### Added

- Added multiline formatting for `form.text_field`.
- Added multiline formatting for `form.label`.
- Added multiline formatting for `form.submit`.
- Added support for nested keyword hashes in Rails form helpers.

### Improved

- Improved indentation of positional and keyword arguments.
- Improved handling of multiline Rails helper calls.
- Preserved unsupported form helpers without applying Ruby argument formatting.

### Safety

- Added Ruby syntax verification using Prism.

### Tests

- Expanded automated test coverage to 47 tests.
- All 47 automated tests passed.

### Release

[GitHub Release v0.1.3](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.3)

---

## [0.1.2]

### Added

- Added automatic multiline formatting for long `form_with` calls.
- Added formatting support for nested keyword hashes.
- Added Unicode-safe Ruby source extraction.
- Added Ruby syntax verification using Prism.

### Improved

- Improved indentation of multiline Ruby arguments.
- Improved handling of complex Rails form helper expressions.
- Improved preservation of Ruby syntax during formatting.

### Tests

- Expanded automated test coverage to 43 tests.
- All 43 automated tests passed.

### Release

[GitHub Release v0.1.2](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.2)

---

## [0.1.1]

### Maintenance

- Early improvements to the Thor template formatter.
- Continued development of Ruby and ERB formatting support.

### Release

[GitHub Release v0.1.1](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.1)

---

## [0.1.0]

### Initial Release

- Initial release of b4um Thor Templates.
- Added syntax highlighting for Rails Thor ERB templates.
- Added support for escaped Thor ERB expressions.
- Added recognition of common Thor template file extensions.
- Introduced the custom Thor template formatter.
- Added HTML formatting using Prettier.
- Added preservation of embedded Ruby and ERB expressions.
- Established the initial automated test suite.

### Release

[GitHub Release v0.1.0](https://github.com/bonsai1972/b4um-thor-templates/releases/tag/v0.1.0)
