# VS Code Extension Architecture & Integration

This document covers the Visual Studio Code extension architecture, registered commands, keybindings, and integration with CodeShelf's shared packages.

## Extension Structure

The VS Code extension is located in `apps/vscode/` and compiled to `./dist/extension.js` via `esbuild`.

```text
apps/vscode/
├── package.json               # Extension manifest, contributes, commands, keybindings
├── tsconfig.json              # TypeScript compilation configuration
└── src/
    ├── extension.ts           # Extension entry point & activation lifecycle
    ├── features/
    │   ├── ai/                # AI commands (Autofill, commit messages, API key setup)
    │   ├── capture/           # Code selection capture and metadata prompt workflow
    │   ├── explorer/          # Activity Bar TreeDataProvider
    │   ├── export/            # Markdown export command
    │   ├── search/            # QuickPick search, insert, and delete commands
    │   └── updates/           # Update checker against GitHub releases
    └── shared/
        └── storage.ts         # Direct ~/.codeshelf/ file storage and atomic writer
```

---

## Contributed Commands & Keybindings

The extension contributes commands and default keyboard shortcuts via `package.json`:

| Command Identifier | Title in Command Palette | Default Shortcut (Win/Linux) | Default Shortcut (macOS) | When Context |
|---|---|---|---|---|
| `codeshelf.saveSelection` | `CodeShelf: Save Selection as Snippet` | `ctrl+alt+s` | `cmd+alt+s` | `editorHasSelection` |
| `codeshelf.saveSelectionWithAi` | `CodeShelf: AI Autofill & Save Snippet` | `ctrl+alt+a` | `cmd+alt+a` | `editorHasSelection` |
| `codeshelf.searchSnippets` | `CodeShelf: Search Snippets` | `ctrl+alt+f` | `cmd+alt+f` | — |
| `codeshelf.insertSnippet` | `CodeShelf: Insert Snippet` | `ctrl+alt+i` | `cmd+alt+i` | `editorTextFocus` |
| `codeshelf.generateCommitMessage` | `CodeShelf: Generate AI Commit Message` | — | — | `editorHasSelection` |
| `codeshelf.setGeminiApiKey` | `CodeShelf: Configure Gemini API Key` | — | — | — |
| `codeshelf.refreshSnippets` | `CodeShelf: Refresh Snippets` | — | — | — |
| `codeshelf.deleteSnippet` | `CodeShelf: Delete Snippet` | — | — | — |
| `codeshelf.exportSnippets` | `CodeShelf: Export Snippets to Markdown` | — | — | — |
| `codeshelf.copySnippet` | `CodeShelf: Copy Code` | — | — | — |
| `codeshelf.copySnippetAsMarkdown` | `CodeShelf: Copy Code as Markdown` | — | — | — |
| `codeshelf.checkForUpdates` | `CodeShelf: Check for Updates` | — | — | — |

---

## Views & UI Contributions

### Activity Bar Container
- **ID**: `codeshelf-sidebar`
- **Icon**: `$(book)`
- **Title**: `CodeShelf`

### Tree View Explorer
- **ID**: `codeshelf.snippetsView`
- **Name**: `Snippets Explorer`
- **Provider**: `SnippetsTreeProvider` ([`apps/vscode/src/features/explorer/snippetsTree.ts`](../apps/vscode/src/features/explorer/snippetsTree.ts))
- **Structure**: Groups snippets hierarchically under Categories and Folders.
- **Context Menus**: Each snippet item offers inline action buttons:
  - Insert Snippet (`$(symbol-snippet)`)
  - Copy Code (`$(copy)`)
  - Copy as Markdown (`$(markdown)`)
  - Delete Snippet (`$(trash)`)

---

## Integration with Shared Packages & Persistence

1. **Shared Engine**: The extension imports directly from `@codeshelf/shared`:
   - Data models (`Snippet`, `CodeShelfConfig`)
   - Validation (`validateCreateSnippetInput`)
   - Normalizers (`canonicalizeLanguage`, `normalizeTechnologies`, `normalizeTags`)
   - Diffing and markdown tools (`serializeSnippetToMarkdown`)
   - AI functions (`aiAutofillFromCode`, `aiGenerateCommitMessage`)
2. **Filesystem Independence**: The extension does not embed a browser webview or connect via localhost HTTP sockets. It reads and writes directly to `~/.codeshelf/snippets.json` and `~/.codeshelf/config.json`.
3. **Cross-Process Synchronization**: Changes saved in the desktop app trigger the extension's file watcher on `~/.codeshelf/`, refreshing the tree view within 100 ms.
