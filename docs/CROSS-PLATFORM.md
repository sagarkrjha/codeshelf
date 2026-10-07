# Cross-Platform Architecture & Capabilities

This document outlines how CodeShelf operates across supported platforms, explaining environment capabilities, constraints, and runtime differences.

## Platform Capabilities Matrix

| Feature / Capability | Web (Standalone Browser) | Desktop (Windows) | Desktop (macOS) | Desktop (Linux) | VS Code Extension |
|---|---|---|---|---|---|
| **Runtime Engine** | Chromium / Safari / Firefox | Electron 44 (Node 22 / Chromium) | Electron 44 (Node 22 / Chromium) | Electron 44 (Node 22 / Chromium) | Node.js (VS Code Host) |
| **Persistence Mechanism** | File System Access API + IndexedDB handle | Native `node:fs` (`~/.codeshelf/`) | Native `node:fs` (`~/.codeshelf/`) | Native `node:fs` (`~/.codeshelf/`) | Native `node:fs` (`~/.codeshelf/`) |
| **Atomic File Renaming** | Direct stream writes to FileHandle | Atomic `.tmp` rename with lock retry | Atomic `.tmp` rename | Atomic `.tmp` rename | Atomic `.tmp` rename |
| **External File Watcher** | Tab focus / visibility change | `fs.watch` via Electron service | `fs.watch` via Electron service | `fs.watch` via Electron service | `fs.watch` in extension host |
| **API Key Storage** | Runtime memory & `config.json` | `config.json` on disk | `config.json` on disk | `config.json` on disk | `config.json` on disk |
| **Editor Integration** | Monaco/Prism web UI | Monaco/Prism web UI | Monaco/Prism web UI | Monaco/Prism web UI | Native editor cursor & selection |
| **Update Mechanism** | Browser page reload | In-app download & installer launch | In-app download & DMG opening | In-app download & AppImage replace | Direct `.vsix` download & install |
| **Distribution Formats** | Web URL / static assets | NSIS (`.exe`), Portable (`.exe`) | DMG (`.dmg`), Zip | AppImage, Debian (`.deb`) | VSIX (`.vsix`) |

---

## Environment-Specific Details

### 1. Web Application in Browser

- **Filesystem Access**: Dependent on the Chromium **File System Access API** (`window.showDirectoryPicker`). Non-Chromium browsers (Firefox, older Safari) fallback to memory caching or require manual folder connection prompts.
- **Directory Handles**: Kept persistent between browser restarts using IndexedDB.
- **Security Constraints**: Browsers disallow arbitrary paths; users must explicitly grant permission to the `.codeshelf` directory via the native folder dialog.
- **Privacy Enforcement**: The Gemini API key is stripped before writing anything to browser `localStorage`.

### 2. Desktop Application (Electron)

- **Operating Systems Supported**:
  - Windows: Windows 10/11 x64 (NSIS installer with custom path support and standalone portable executable).
  - macOS: Apple Silicon (`arm64`) and Intel, packaged as DMG and Zip.
  - Linux: Ubuntu/Debian (`.deb`) and universal portable Linux (`.AppImage`).
- **Filesystem Access**: Full native filesystem access to `~/.codeshelf` without requiring user permission dialogs.
- **Isolation & Sandboxing**: `contextIsolation: true`, `nodeIntegration: false`, and strict preload bridge API exposure.
- **Single Instance**: Only one window instance is permitted; launching a second instance refocuses the active window.
- **Installer Security**: In-app download and update installation verifies that the executable is contained strictly within the user's Downloads directory before execution.

### 3. VS Code Extension

- **Integration Mode**: Operates as a background Node.js process inside the IDE.
- **Non-Intrusive Workflow**: Does not load heavy webviews for standard snippet capture, search, or insertion tasks; operations use native VS Code QuickPicks and InputBoxes.
- **Shared Data Source**: Direct access to `~/.codeshelf/snippets.json` ensures immediate availability of snippets created or modified in the desktop application.
