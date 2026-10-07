# Usage Guide

This document describes end-user workflows and commands available across the CodeShelf Desktop application, Web interface, and Visual Studio Code extension.

## Workflows in Visual Studio Code

The CodeShelf extension integrates directly into your editor without requiring embedded webviews.

### Keybindings & Commands

| Action | Shortcut (Windows/Linux) | Shortcut (macOS) | Command Name |
|---|---|---|---|
| **Save Selection as Snippet** | `Ctrl+Alt+S` | `Cmd+Alt+S` | `codeshelf.saveSelection` |
| **Save Selection with AI Autofill** | `Ctrl+Alt+A` | `Cmd+Alt+A` | `codeshelf.saveSelectionWithAi` |
| **Quick Search & Insert** | `Ctrl+Alt+F` | `Cmd+Alt+F` | `codeshelf.searchSnippets` |
| **Insert Snippet at Cursor** | `Ctrl+Alt+I` | `Cmd+Alt+I` | `codeshelf.insertSnippet` |
| **Generate AI Commit Message** | — | — | `codeshelf.generateCommitMessage` |
| **Configure Gemini API Key** | — | — | `codeshelf.setGeminiApiKey` |
| **Refresh Snippets** | — | — | `codeshelf.refreshSnippets` |
| **Export Snippets to Markdown** | — | — | `codeshelf.exportSnippets` |
| **Check for Updates** | — | — | `codeshelf.checkForUpdates` |

### Capturing Code

1. Highlight code in any open editor.
2. Press `Ctrl+Alt+S` (Heuristic Capture) or `Ctrl+Alt+A` (AI Autofill Capture).
3. **With Heuristics (`Ctrl+Alt+S`)**:
   - The extension analyzes functions, classes, and comments to pre-fill the snippet title, language, technology, and tags.
   - Walk through the 4-step input prompts to customize or confirm metadata.
4. **With AI Autofill (`Ctrl+Alt+A`)**:
   - Sends the selection to Google Gemini using your configured model (e.g., `gemini-3.8-flash`).
   - Auto-generates a title, technical description, categorized tags, usage tags, and structured article sections.
5. Once saved, choose **Copy Code** or **Copy as Markdown** from the confirmation notification.

### Searching and Inserting Snippets

1. Press `Ctrl+Alt+F` to open the search QuickPick.
2. Filter through titles, languages, folders, and tags.
3. Select a snippet to trigger an action menu:
   - **Insert at cursor**: Inserts snippet code directly into the active editor.
   - **Copy code to clipboard**: Copies raw snippet code.
   - **Copy code as Markdown**: Formats the snippet with a markdown code fence.
   - **Delete snippet**: Prompts for confirmation and permanently removes the snippet.

### Generating Conventional Commit Messages

1. Highlight a code block or diff in your editor.
2. Run `CodeShelf: Generate AI Commit Message` from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. The extension analyzes the change and presents a conventional commit message (e.g., `feat(auth): add JWT verification guard`).
4. Press Enter to copy the message to your clipboard.

### Snippets Explorer

Open the **CodeShelf** view in the Activity Bar (`codeshelf-sidebar`) to view snippets hierarchically grouped by category and folder. From this tree view, you can:
- Insert snippets into the editor
- Copy code or Markdown
- Delete snippets
- Trigger exports or check for updates

---

## Workflows in Desktop & Web Applications

### Managing Snippets

- **Creating Snippets**: Click **New Snippet** to open the editor. Enter title, folder/category, language, and code.
- **AI Autofill**: Click the **AI Autofill** button in the snippet editor. Gemini analyzes the code to generate the title, description, category, tags, and usage notes.
- **Markdown Editing**: Full support for Notion-style Markdown notes, usage context descriptions, and multiple syntax-highlighted code fences.
- **Editing Snippets**: Modifying snippet contents snapshots the previous version automatically into revision history.

### Searching and Filtering

- **Free-Text Search**: Search matches against snippet titles, code, descriptions, categories, technologies, and tags.
- **Prefix Filters**: Use query prefixes in the search bar:
  - `lang:<language>` (e.g., `lang:typescript`)
  - `tag:<tag>` (e.g., `tag:memoization`)
  - `folder:<folder>` (e.g., `folder:algorithms`)
  - `domain:<domain>` (e.g., `domain:frontend`)
- **Semantic Ranking Toggle**: Enables lexical query relevance scoring based on token overlap across fields.
- **Facet Sidebar & Filter Modal**: Filter snippets by category, subcategory, technology, tags, usage context, or complexity (time/space).

### Version History & Rollback

1. Open any existing snippet and select **History**.
2. Browse past revisions with their timestamps and change summaries.
3. Inspect line-by-line additions and deletions computed by the built-in Myers diff engine.
4. Click **Revert to Version** to restore any previous revision state.

### Backup, Export, and Import

- **Export to Markdown**: Export individual snippets as portable `.md` files with YAML frontmatter.
- **Batch Export**: Export the entire snippet library as JSON (`.json`) or compressed archive (`.json.gz`).
- **Import Markdown**: Drag and drop or import `.md` snippet files. CodeShelf extracts frontmatter metadata and fenced code blocks.

### Configuring AI Settings

1. Click the **AI Settings** gear icon in the sidebar.
2. Enter your Google Gemini API key.
3. Select your model identifier (`gemini-3.8-flash`, `gemini-3.5-flash`, or `gemini-3.5-flash-lite`).
4. Save the configuration. The key is written directly to `~/.codeshelf/config.json`.
