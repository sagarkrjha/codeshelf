# CodeShelf

[![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/sagarkrjha/codeshelf/total?color=blue&label=Downloads&logo=github)](https://github.com/sagarkrjha/codeshelf/releases)
[![GitHub Release](https://img.shields.io/github/v/release/sagarkrjha/codeshelf?color=green&label=Latest%20Release&logo=github)](https://github.com/sagarkrjha/codeshelf/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CodeShelf is a developer snippet and knowledge management system spanning desktop and IDE environments. It provides a local-first workspace to capture, curate, search, and reuse code snippets across daily development workflows.

---

## Why CodeShelf?

Software engineers often solve recurring, non-trivial problems—such as custom concurrency patterns, tricky configurations, boilerplate, and database queries. Storing these solutions across browser bookmarks, ephemeral gists, or chat logs introduces friction and context switching.

CodeShelf centralizes this institutional knowledge in a single, local-first storage directory (`~/.codeshelf/`) synchronized bidirectionally between your desktop workspace and code editor.

---

## Highlights

- **Desktop, Web & IDE Environments**: Native desktop applications for Windows, macOS, and Linux, paired with a dedicated Visual Studio Code extension.
- **Local-First & Offline**: Stored directly on disk at `~/.codeshelf/` using atomic writes. Operates 100% offline without mandatory network accounts.
- **In-Editor Capture & Quick Insertion**: Capture selected editor code with heuristics or AI, and insert curated snippets at your cursor via global VS Code shortcuts.
- **Technology-Aware Taxonomy**: Canonical normalization across programming languages, dotted file extensions, and technology tags.
- **Lexical Relevance & Facet Search**: Instant substring search, query prefix filters (`lang:`, `tag:`, `folder:`, `domain:`), and weighted token relevance scoring.
- **Myers Visual Diff Engine**: Automatic revision snapshotting with line-by-line additions, deletions, and one-click rollback.
- **Optional Gemini AI Autofill**: Structured usage explanations, conventional commit message generation, and automatic metadata extraction using Google Gemini models (`gemini-3.8-flash`).
- **Markdown & Portable Exports**: Full Markdown editing with multiple syntax-highlighted code fences, YAML frontmatter, and compressed backup archives (`.json.gz`).

---

## Supported Platforms

| Platform | Environments / Artifacts | Distribution Format |
|---|---|---|
| **Windows** | Windows 10, Windows 11 (x64) | NSIS Installer (`.exe`), Portable (`.exe`) |
| **macOS** | Apple Silicon (`arm64`), Intel | Disk Image (`.dmg`), Zip archive |
| **Linux** | Ubuntu, Debian, Fedora, Arch | Debian package (`.deb`), AppImage (`.AppImage`) |
| **Visual Studio Code** | VS Code `^1.85.0`, Cursor, VSCodium | VSIX package (`.vsix`), Marketplace, Open VSX |
| **Web** | Modern Chromium browsers (Chrome, Edge, Brave) | File System Access API, Localhost dev server |

---

## Technology Stack

- **Monorepo Management**: [pnpm](https://pnpm.io/) workspaces
- **Language**: TypeScript 7 (strict typechecking with zero emitted errors)
- **UI Framework**: React 19, Tailwind CSS v4, Lucide icons, PrismJS
- **Desktop Shell**: Electron 44, Context Isolation, secure IPC bridge
- **Bundler & Tooling**: Vite 8, esbuild, @vscode/vsce
- **Markdown & Parsing**: Unified, remark-parse, remark-stringify, marked
- **AI Integration**: `@google/genai` (Gemini SDK with client-side credential sandboxing)

---

## Documentation

Detailed technical documentation is available in the [`docs/`](docs/) directory:

| Document | Purpose |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | Monorepo layout, domain models, client boundaries, and IPC security |
| [Installation](docs/INSTALLATION.md) | Prerequisites, environment setup, build scripts, and local execution |
| [Usage](docs/USAGE.md) | Workflows in VS Code, Desktop, and Web applications |
| [Search](docs/SEARCH.md) | Search pipeline, query prefix syntax, tokenization, and ranking |
| [Storage](docs/STORAGE.md) | Persistence model, atomic file writes, IndexedDB handles, and conflict merging |
| [VS Code Extension](docs/EXTENSION.md) | Extension commands, keybindings, Activity Bar explorer, and lifecycle |
| [Cross-Platform](docs/CROSS-PLATFORM.md) | Capabilities, constraints, and platform differences |
| [Releases](docs/RELEASES.md) | GitHub Actions release matrix, packaging, and update mechanism |
| [Development](docs/DEVELOPMENT.md) | Contribution standards, package boundaries, testing, and Git conventions |
| [Benchmarks](docs/BENCHMARKS.md) | Compiler diagnostics, TAP test metrics, and micro-benchmark results |
| [Changelog](docs/CHANGELOG.md) | Release history, version notes, and audit fixes |
| [Contributing](docs/CONTRIBUTING.md) | Code of conduct, branch conventions, and pull request guidelines |

---

## License

CodeShelf is open source under the [MIT License](LICENSE).
