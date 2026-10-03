# Changelog

All notable changes to the **CodeShelf** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-10-03

### Fixed
- **Electron Dynamic Require of `child_process` During Load**:
  - Excluded `@google/genai` (and transitively `google-auth-library` CommonJS dependencies) from the Electron bundle via `--external:@google/genai`.
  - Added ESM module path compatibility helpers (`__filename` and `__dirname`) across window management modules in the desktop app.
- **Desktop Blank Screen On Startup**:
  - Set relative base URL (`base: './'`) in Vite configuration to ensure bundled scripts and CSS resolve correctly under the Chromium `file://` protocol.
  - Enhanced window loading path resolution to reliably discover `dist/index.html` across packaged and unbundled environments.
- **Snippet Deletion Persistence Across Storage Backends**:
  - Fixed issue where deleted snippets were re-merged and resurrected from disk by removing redundant union-merging on user delete saves across desktop (`main.ts` / `storageService.ts`), web dev server (`viteStorageSyncPlugin.ts`), and browser File System Access API (`fileSystemStorage.ts`).
  - Corrected `subscribeToSnippetChanges` to accept authoritative incoming updates without resurrecting deleted snippets.
- **Editor Caret Jitter and Blinking in Snippet Edit Modal**:
  - Stabilized `SnippetModal` state synchronization to prevent background re-renders and frontmatter parsing from wiping active editor input or jumping caret position while typing.
  - Added explicit high-contrast caret styling (`caret-blue-400`).

### Changed
- **Electron Architecture Refactor**:
  - Modularized Electron main process into dedicated services (`constants`, `storageService`, `updateService`, `watcherService`, `registerIpcHandlers`, and `windowManager`).
  - Added direct workstation routing for desktop application to skip unnecessary landing screens.
- **Workflows & Release Automation**:
  - Updated `ci.yml` with `workflow_dispatch` trigger.
  - Updated `release.yml` with version `v0.3.1` defaults and manual trigger support for cross-platform desktop installers (Windows, macOS, Linux) and VS Code extension.

---

## [0.3.0] - 2026-10-02

### Added
- **Native File System Storage for Web App**:
  - Implemented File System Access API adapter (`fileSystemStorage.ts`) to persist snippets directly in `.codeshelf/snippets.json` and configuration in `.codeshelf/config.json` on the user's device.
  - Added folder connection banner (`FolderConnectBanner.tsx`) and hook (`useFileSystemStorage.ts`) with persistent directory handle management in IndexedDB across reloads.
  - Real-time multi-tab synchronization via `BroadcastChannel` with an in-memory cache layer.

### Changed
- **Eliminated localStorage and globalState Storage**:
  - Web: Removed all `localStorage` usage for snippets and config data; everything lives in the `.codeshelf/` file system directory on the user's device.
  - VS Code Extension: Removed VS Code `globalState` fallback; snippets and configuration read and write directly to `~/.codeshelf/snippets.json` and `~/.codeshelf/config.json`.
  - Desktop App: Verified and maintained direct file persistence to `~/.codeshelf/` with external file watcher.

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
