# CodeShelf

> **A developer-focused snippet knowledge system across desktop and IDE.**

CodeShelf enables engineers to capture, organize, search, edit, and reuse code snippets directly from their editor and desktop environment.

---

## Architecture Overview

CodeShelf is organized as a monolithic repository:

```text
codeshelf/
├── apps/
│   ├── desktop/      # Electron + React + TypeScript desktop application
│   └── vscode/       # VS Code extension for code capture and quick insertion
├── packages/
│   ├── shared/       # Shared TypeScript models, validation, and taxonomy
│   └── ui/           # Shared UI primitives
├── docs/             # Technical specifications and guides
└── README.md         # Project documentation and status
```

---

## Workspace Setup

### Prerequisites
- **Node.js**: v18+ (tested with v24)
- **pnpm**: v10+ (tested with v12)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd codeshelf

# Install all workspace dependencies
pnpm install

# Build all packages
pnpm run build

# Run type checks across packages
pnpm run typecheck

# Run tests
pnpm run test
```

---

## Current Status

### Phase 1: Foundation (Completed)
- [x] Monorepo configuration (pnpm workspaces, root scripts, base `tsconfig`).
- [x] `@codeshelf/shared` package with snippet models, validation, and taxonomy constants.
- [x] `@codeshelf/desktop` application shell (Electron + React + Vite + dark mode theme + local storage).
- [x] `@codeshelf/vscode` extension shell (capture, search, and insert commands).

### Phase 2: Core Snippet Workflow (Completed)
- [x] Full Desktop CRUD (create, view, edit with prefilled form, delete with confirmation).
- [x] Syntax-highlighted code viewer with PrismJS for multiple languages.
- [x] Multi-facet filtering by domain, technology, and tags.
- [x] Fast copy code to clipboard with visual confirmation.
- [x] Copy code as Markdown (```````{language}\n{code}\n```````) directly to clipboard.
- [x] Smart Details Autofill from code (heuristic extraction of title, language, domain, technology, tags, complexity).
- [x] Snippet version increments and complexity metrics (Time & Space).

### Phase 3: Search & Markdown Integration (Completed)
- [x] Portable YAML frontmatter Markdown serialization & parsing (`@codeshelf/shared`).
- [x] Rich Markdown preview rendering for snippet explanations (`marked`).
- [x] Single snippet Markdown export (`.md`) and full collection backup export (`.json`).
- [x] Drag-and-drop / file upload Markdown import with instant schema parsing.
- [x] Advanced query parsing with prefix filters (`lang:<l>`, `tag:<t>`, `domain:<d>`) and sort options.

### Phase 4: IDE Extension Capabilities (Completed)
- [x] Multi-step quick code capture (`Ctrl+Alt+S` / `Cmd+Alt+S`) with smart prefilled heuristics.
- [x] Dedicated CodeShelf Activity Bar icon and Snippets Explorer sidebar tree view.
- [x] Interactive Command Palette snippet search with live preview (`Ctrl+Alt+F` / `Cmd+Alt+F`).
- [x] Direct snippet insertion at cursor position (`Ctrl+Alt+I` / `Cmd+Alt+I`).
- [x] Context menu integration (editor right-click capture, tree item actions, copy raw/markdown code).
- [x] Batch export snippets to Markdown files directly from VS Code.
- [x] Check for updates command (`codeshelf.checkForUpdates`) and background auto-check.

### Phase 5: Versioning & Synchronization (Completed)
- [x] Automated snippet revision history & snapshots (`v1`, `v2`, etc.).
- [x] Line-by-line diffing engine (`computeLineDiff`) using LCS algorithms (`@codeshelf/shared`).
- [x] Visual diff viewer with color-coded additions/removals in Desktop app.
- [x] One-click revision rollback restoring past versions.
- [x] Optional revision summary / commit notes when updating snippets.
- [x] Git-compatible sync manifest export mapping snippets to domain folders.
- [x] Conflict-aware backup restoration and timestamp-based history merging.
- [x] Real-time bidirectional synchronization between Desktop and VS Code extension via `~/.codeshelf/snippets.json`.

### Phase 6: Advanced Capabilities (Completed)
- [x] Multi-dimensional similarity scoring engine (`@codeshelf/shared`).
- [x] Semantic query intent ranking mode for natural-language discovery.
- [x] "Related Knowledge" recommendations linking top similar snippets.
- [x] Smart heuristic code analysis, complexity estimation, and automated tag generation.

### Phase 7: Application Updates & Distribution (Completed)
- [x] Desktop in-app update notification banner and interactive modal (`UpdateModal.tsx`).
- [x] In-app download progress tracking and direct installer launcher.
- [x] Official GitHub Releases API integration with SemVer comparison logic.
- [x] Windows NSIS setup wizard (`.exe`), portable executable (`.exe`), and VS Code bundle (`.vsix`).

### Phase 8: Modern Architecture & Tooling (Completed)
- [x] Full migration from `npm` to `pnpm` (v12) with hoisted native linking.
- [x] Domain-sliced, feature-based directory structure across all workspaces (`packages/shared`, `apps/desktop`, `apps/vscode`).
- [x] WHATWG URL API adoption throughout networking layers (zero `DEP0169` deprecation warnings).
- [x] Strict Semantic Versioning policy (`MAJOR.MINOR.PATCH`) enforced for all fixes and features.

### Phase 9: Flexible Taxonomy & Adaptive Workspace Views (Completed)
- [x] **Flexible Categorization**: Custom categories/domains, dynamic taxonomy aggregation (`extractAllCategories`, `extractCategorySubcategories`), hierarchical subcategory tree views, and suggestion datalists.
- [x] **Toggleable Sidebars & Focus Mode**: Collapsible primary navigation sidebar (`Ctrl+B` / `Cmd+B`) and collapsible snippets list (`Ctrl+Shift+B` / `Cmd+Shift+B`) for distraction-free code reading.
- [x] **Filters in Modal Views**: Multi-faceted interactive Filter Modal (`FilterModal.tsx`) with category, subcategory, technology, language, usage, and complexity filters; in-modal search and diff line filtering in `VersionHistoryModal`.

---

## Installation & Packages

### 1. VS Code Extension (`.vsix`)
The installable extension bundle is available at:
`apps/vscode/codeshelf-0.1.1.vsix`

**Command line installation:**
```bash
code --install-extension apps/vscode/codeshelf-0.1.1.vsix
```

**VS Code UI installation:**
1. Open VS Code.
2. Navigate to Extensions (`Ctrl+Shift+X`).
3. Click the `...` (More Actions) menu at the top right of the Extensions view.
4. Select **Install from VSIX...** and choose `apps/vscode/codeshelf-0.1.1.vsix`.

---

### 2. Desktop Application (`.exe`)
The desktop installers and executables are built at:
- **Windows Installer (NSIS)**: `apps/desktop/release/CodeShelf Setup 0.1.1.exe`
- **Portable Executable**: `apps/desktop/release/CodeShelf 0.1.1.exe` (runs directly without installation)
- **Unpacked Folder**: `apps/desktop/release/win-unpacked/CodeShelf.exe`

**Packaging commands:**
```bash
# Build desktop installer and portable executable
pnpm run desktop:dist

# Build VS Code extension package (.vsix)
pnpm run vscode:package
```

---

## Development Guidelines

### 1. Semantic Versioning (SemVer)
All packages and applications in the repository adhere to strict Semantic Versioning (`MAJOR.MINOR.PATCH`):
- **PATCH** (`x.y.Z+1`): Applied for every bug fix, security patch, runtime deprecation/warning fix, performance enhancement, or refactoring.
- **MINOR** (`x.Y+1.0`): Applied for every new user-facing feature, new command, or backwards-compatible capability addition.
- **MAJOR** (`X+1.0.0`): Applied for breaking architectural changes or storage schema migrations.

When introducing a fix or feature, bump the corresponding `package.json` version in the affected workspace(s) and synchronize release tags (`vMAJOR.MINOR.PATCH`).

### 2. Feature-Based Workspace Structure
Each workspace organizes code around distinct domain features rather than flat technical layers:
- **`src/features/<feature-name>/`**: Colocates components, custom hooks, utilities, and unit tests specific to that feature (e.g. `snippets`, `search`, `updates`, `export-import`).
- **`src/components/common/`**: Houses shared UI building blocks (buttons, modals, input elements, badges) reused across features.
- **`packages/shared/src/features/`**: Modular domain logic (autofill, diffing, similarity, markdown, update checks) tested beside their implementation.

