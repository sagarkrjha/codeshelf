# CodeShelf

## Introduction

**CodeShelf** is a developer-focused snippet knowledge system across desktop and IDE environments. It provides a unified, cross-platform workspace to capture, curate, search, and reuse code snippets seamlessly across daily development workflows.

With native desktop applications for Windows, macOS, and Linux, paired with a dedicated Visual Studio Code extension, CodeShelf eliminates context switching and keeps your institutional code patterns and idiomatic solutions at your fingertips.

---

## Solving Problem

Software engineers frequently solve repetitive, non-trivial problems—such as bespoke concurrency patterns, complex configurations, API boilerplate, algorithm implementations, and database queries. However, managing this collective knowledge is traditionally fragmented:

- **Lost in Git History & Chat Logs**: Useful snippets end up buried across PRs, Discord/Slack messages, scratchpads, and disposable gists.
- **Context Switching Overhead**: Leaving your code editor to search browsers, documentation, or personal note-taking apps interrupts developer flow.
- **Lack of Usage Context**: Plain snippets rarely explain *why* code was written, *when* to use it, or *how* edge cases should be handled.
- **Outdated Code & No Versioning**: Code evolves over time, but static notes lack revision history, visual diffs, and change tracking.
- **Desynchronized Environments**: Desktop note tools don't integrate directly with code editors, requiring manual copy-pasting and formatting.

**How CodeShelf solves this:**
- **Single Source of Truth**: Centralized, local-first storage synchronized bidirectionally between your desktop app and IDE.
- **In-Editor Capture & Insertion**: Save highlighted editor code or insert curated snippets instantly using global VS Code hotkeys without switching windows.
- **Comprehensive Usage Framework**: Built-in What / Why / When / How documentation schema and language-agnostic AI autofill using modern Gemini models.
- **Revision History & Visual Diffs**: Automatic snapshotting on every edit with Myers/LCS visual diffing and one-click rollback.
- **Portable & Future-Proof**: Stored as clean, portable Markdown with YAML frontmatter for seamless Git integration and backup exports.

---

## Installations

### 1. Pre-built Binaries (Recommended)

Download the latest release for your platform from the [GitHub Releases](https://github.com/sagarkrjha/codeshelf/releases/latest) page:

- **Windows**:
  - Installer: `CodeShelf.Setup.<version>.exe`
  - Portable: `CodeShelf.<version>.exe`
- **macOS**:
  - Apple Silicon / Universal: `CodeShelf-<version>-arm64.dmg`
- **Linux**:
  - Debian / Ubuntu: `codeshelf-desktop_<version>_amd64.deb`
  - Universal Linux: `CodeShelf-<version>.AppImage`
- **VS Code Extension**:
  - Direct VSIX package: `codeshelf-<version>.vsix`

#### Installing the VS Code Extension (`.vsix`):
```bash
code --install-extension codeshelf-<version>.vsix
```
*Or via VS Code UI: Extensions view (`Ctrl+Shift+X`) -> `...` (Views and More Actions) -> **Install from VSIX...***

---

### 2. Building from Source

#### Prerequisites
- **Node.js**: v20 or v22+
- **pnpm**: v10+ (tested with v12)

#### Steps
```bash
# Clone the repository
git clone https://github.com/sagarkrjha/codeshelf.git
cd codeshelf

# Install dependencies across all workspaces
pnpm install

# Build shared libraries and applications
pnpm run build

# Run unit tests and type checks
pnpm run test
pnpm run typecheck
```

#### Build Platform Packages
```bash
# Build desktop package for your current OS
pnpm run desktop:dist

# Target specific desktop platforms
pnpm run desktop:dist:win     # Windows NSIS & Portable
pnpm run desktop:dist:mac     # macOS DMG & Zip
pnpm run desktop:dist:linux   # Linux AppImage & deb

# Package the VS Code extension (.vsix)
pnpm run vscode:package
```

---

## Usage

### In Visual Studio Code

| Action | Shortcut / Command | Description |
| :--- | :--- | :--- |
| **Save Snippet with Heuristics** | `Ctrl+Alt+S` / `Cmd+Alt+S` | Captures highlighted code and pre-fills title, language, and tags. |
| **Save Snippet with AI Autofill** | `CodeShelf: Save Selection to CodeShelf with AI` | Uses Gemini AI to auto-generate title, description, and What/Why/When/How sections. |
| **Quick Search & Preview** | `Ctrl+Alt+F` / `Cmd+Alt+F` | Fuzzy search snippet titles, descriptions, and tags with a live preview modal. |
| **Insert Snippet at Cursor** | `Ctrl+Alt+I` / `Cmd+Alt+I` | Selects a snippet and inserts its code directly into the active editor. |
| **Generate Commit Message** | `CodeShelf: Generate Git Commit Message with AI` | Analyzes staged diffs and generates conventional commit messages. |
| **Set Gemini API Key** | `CodeShelf: Set Gemini API Key` | Stores your Google Gemini API key securely in VS Code SecretStorage. |
| **Snippets Explorer** | Activity Bar Icon | Explore snippets grouped by categories and subcategories in the sidebar tree. |

---

### In CodeShelf Desktop

- **Browse & Filter**: Filter snippets by category, subcategory, programming language, technology tag, or complexity.
- **Search**: Use global instant search with prefix filters (e.g. `lang:typescript`, `tag:react`, `domain:frontend`).
- **Create & Edit**:
  - Create snippets manually or use the **AI Autofill** button to analyze code and generate title, metadata, and structured What/Why/When/How usage docs.
  - Markdown editor supports live preview, multiple syntax-highlighted code blocks, and custom usage notes.
- **Version History & Rollback**:
  - Open **History** on any snippet to view past revisions.
  - Inspect color-coded additions and deletions via the built-in visual diff engine.
  - Roll back to any prior version with one click.
- **Import & Export**:
  - Export individual snippets as Markdown (`.md`) or the complete database as JSON.
  - Import existing Markdown snippet files with automated frontmatter parsing.
- **AI Settings**:
  - Click the **AI Settings** icon in the sidebar to configure your Gemini API Key and select your preferred model (e.g., `gemini-3.8-flash`).
