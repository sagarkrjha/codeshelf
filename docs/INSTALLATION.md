# Installation & Build Guide

This document provides setup, installation, and build instructions for CodeShelf across all environments.

## Prerequisites

Before building CodeShelf from source, ensure your environment has the following installed:

- **Node.js**: `v20.x` or `v22.x` (CI runs on Node 22)
- **pnpm**: Version `12.6.0` (specified in root `package.json` packageManager; pnpm 10+ is supported)
- **Git**: Installed and configured on your system

For building native desktop packages on Linux, additional build utilities are required:
```bash
sudo apt-get update
sudo apt-get install -y libarchive-tools libfuse2
```

---

## Repository Setup & Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sagarkrjha/codeshelf.git
   cd codeshelf
   ```

2. Install dependencies across all monorepo workspaces:
   ```bash
   pnpm install
   ```

3. Build the shared packages:
   ```bash
   pnpm --filter @codeshelf/shared build
   ```

---

## Development Workflows

Run the following scripts from the repository root:

### Web Application

Start the local Vite development server with storage middleware:
```bash
pnpm run web:dev
```
- Available at `http://localhost:5173`
- Changes to `~/.codeshelf/snippets.json` will trigger HMR updates in the browser.

### Desktop Application (Electron)

Launch the Electron desktop application in development mode:
```bash
pnpm run desktop:dev
```
Or build and start the desktop shell:
```bash
pnpm run desktop:start
```

### VS Code Extension

Compile the VS Code extension:
```bash
pnpm run vscode:build
```
To debug the extension:
1. Open the repository root in Visual Studio Code.
2. Select the `Run Extension` configuration from the Run & Debug panel (`F5`).
3. An Extension Development Host window will open with CodeShelf active.

---

## Verification & Quality Checks

Run workspace checks and test suites:

```bash
# Typecheck all workspaces (TypeScript --noEmit)
pnpm run typecheck

# Run unit tests across all workspaces
pnpm run test

# Run micro-benchmarks (@codeshelf/shared)
pnpm run bench
```

---

## Production Builds

### Build All Workspaces

To compile all packages and apps (`shared`, `web`, `desktop`, `vscode`):
```bash
pnpm run build
```

### Build Web Application

Build production assets for the web client:
```bash
pnpm run web:build
```
Preview the built web application locally:
```bash
pnpm run web:preview
```

### Build Desktop Installers & Binaries

CodeShelf uses `electron-builder` to package native desktop binaries into `apps/desktop/release/`:

```bash
# Package desktop app for your current operating system
pnpm run desktop:dist

# Target Windows (NSIS installer & Portable executable)
pnpm run desktop:dist:win

# Target macOS (DMG & Zip archive)
pnpm run desktop:dist:mac

# Target Linux (AppImage & Debian package)
pnpm run desktop:dist:linux
```

### Package VS Code Extension (.vsix)

Bundle and package the VS Code extension into a `.vsix` file:
```bash
pnpm run vscode:package
```
This runs `esbuild` and `vsce package --no-dependencies`, generating `apps/vscode/codeshelf-<version>.vsix`.

To install the generated VSIX locally:
```bash
code --install-extension apps/vscode/codeshelf-*.vsix
```
