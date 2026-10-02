# Changelog

All notable changes to the **CodeShelf** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.2] - 2026-10-02

### Added
- **Cross-Platform Desktop Distribution**: Automated release packaging for:
  - Windows: NSIS Setup Wizard (`.exe`) and Portable (`.exe`)
  - macOS: DMG bundle (`.dmg`) and Zip archive
  - Linux: Debian/Ubuntu package (`.deb`) and AppImage (`.AppImage`)
- **Visual Studio Code Extension Publishing**:
  - Direct VSIX package bundling (`codeshelf-0.2.2.vsix`) attached to GitHub Releases.
  - Automated continuous publishing workflows for VS Code Marketplace and Open VSX Registry.
- **Language-Agnostic What/Why/When/How AI Autofill**:
  - Integrated `@google/genai` with `gemini-3.8-flash` in `@codeshelf/shared`.
  - Generates structured, agnostic usage guides with What, Why, When, and How markdown sections.
  - Automatic migration fallback for older or deprecated model configurations.
- **AI-Powered Commit Message Generation**:
  - Contextual conventional commit messages generated from staged code changes and diffs.
- **Optimistic GitHub Actions Workflows**:
  - Concurrent cancellation on new pushes for pull requests and branch builds.
  - Multi-platform matrix build across `windows-latest`, `macos-latest`, and `ubuntu-latest`.

### Fixed
- **Debian Packaging Requirements**:
  - Specified author contact email and package maintainer configuration required by `electron-builder` and `fpm` for Linux `.deb` packaging.
- **Repository Metadata**:
  - Configured repository URL and GitHub publishing provider across `apps/desktop` and monorepo manifests.
- **TypeScript Module Resolution**:
  - Updated `apps/vscode` `tsconfig.json` to use `moduleResolution: Bundler` and explicit `QuickPickItem` mappings.

---

## [0.2.0] - 2026-10-02

### Added
- **Monorepo Architecture with pnpm**:
  - Multi-workspace setup under `apps/` (`web`, `desktop`, `vscode`) and `packages/` (`shared`).
- **Core Knowledge Engine (`@codeshelf/shared`)**:
  - Portable Markdown serialization and parsing with YAML frontmatter.
  - Myers / LCS line-by-line visual diffing engine with addition/deletion indicators.
  - Multi-dimensional similarity scoring for contextual snippet recommendations.
  - Bidirectional local-first file synchronization (`~/.codeshelf/snippets.json`).
- **Web & Desktop User Interface**:
  - Full snippet CRUD workspace with multi-tab layout, search prefix parsing (`lang:`, `tag:`, `domain:`), and filter modal.
  - Version history modal with interactive visual diff and one-click rollback.
  - Secure Electron IPC bridge for persistent desktop filesystem storage.
- **VS Code Integration**:
  - Global capture shortcuts (`Ctrl+Alt+S` / `Cmd+Alt+S`) with prefilled heuristic metadata.
  - Interactive Command Palette snippet search with live preview modal (`Ctrl+Alt+F` / `Cmd+Alt+F`).
  - Snippet insertion directly at cursor position (`Ctrl+Alt+I` / `Cmd+Alt+I`).
  - TreeView explorer in the Activity Bar for snippet navigation by taxonomy.

---

## [0.1.0] - 2026-10-01

### Added
- Initial project prototype and foundation for developer snippet management.
- Basic Electron desktop shell with dark mode styling and syntax highlighting.
