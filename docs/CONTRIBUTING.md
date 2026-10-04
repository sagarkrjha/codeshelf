# Contributing to CodeShelf

Thank you for your interest in contributing to **CodeShelf**! We welcome community contributions, suggestions, and bug reports from developers of all backgrounds.

---

## Code of Conduct

We are committed to providing a friendly, safe, and welcoming environment for all contributors. Please treat others with respect, empathy, and professional courtesy in all interactions across issues, discussions, and pull requests.

---

## How Can You Contribute?

You can contribute to CodeShelf in several ways:

1. **Reporting Bugs**: Let us know if you find unexpected behavior or crashes.
2. **Suggesting Enhancements**: Propose new features or improvements to the developer experience.
3. **Improving Documentation**: Fix typos, clarify steps, or add real-world snippet workflows.
4. **Submitting Code**: Fix open issues or implement agreed-upon features.

---

## Getting Started with Development

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/codeshelf.git
cd codeshelf
```

### 2. Install Dependencies

CodeShelf uses [pnpm](https://pnpm.io/) workspaces. Make sure you have Node.js 20+ and pnpm installed:

```bash
pnpm install
```

### 3. Build & Verify

Before making changes, verify that the project builds and all tests pass:

```bash
# Build all workspaces
pnpm run build

# Run type checks across all workspaces
pnpm run typecheck

# Run test suite
pnpm run test

# Run micro-benchmarks
pnpm run bench
```

---

## Workspace Structure

- `packages/shared`: Shared types, domain models (`folder`, `category`, `technologies`, `language`), canonicalization utilities, AI utilities (`@google/genai`), diffing, and Markdown serialization.
- `apps/web`: React-based web client and shared UI components with instant search, split view, and Monaco/editor integration.
- `apps/desktop`: Electron wrapper connecting desktop native capabilities with the web client via hardened IPC and atomic JSON storage.
- `apps/vscode`: Visual Studio Code extension with commands, tree views, selection capture, and editor integrations.

---

## Development Guidelines

### Core Architectural Principles

1. **Shared Logic Lives in Shared**: Any data models, taxonomy normalization, search ranking, diffing, and markdown serialization must live in `@codeshelf/shared` rather than being duplicated in individual client apps.
2. **Strict TypeScript & Declarations**: `@codeshelf/shared` is configured with `isolatedDeclarations: true`. Exported functions and types must have explicit type annotations.
3. **Preserve Content Integrity**: Source code and snippet markdown must never have meaningful whitespace or newlines silently altered.
4. **Data Normalization**: Never scatter `.toLowerCase()` for technology or language comparisons. Always utilize canonical helpers (`normalizeTechnology`, `normalizeLanguage`, `normalizeExtension`, `canonicalizeTechnology`).
5. **Atomic Persistence**: Disk-backed storage routines must use atomic temporary-file writes to eliminate corruption risks during unexpected power/system loss.

### Git & Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(scope): ...` for new capabilities or user-facing additions.
- `fix(scope): ...` for bug fixes or corrections.
- `docs(scope): ...` for documentation modifications.
- `refactor(scope): ...` for code adjustments without behavior changes.
- `test(scope): ...` for adding or improving test coverage.

### Pull Request Process

1. **Create a branch**: Branch off `main` with a descriptive name (`git checkout -b feat/your-feature-name`).
2. **Make your changes**: Keep commits focused and granular.
3. **Add Tests**: When adding domain features or fixing bugs in `@codeshelf/shared`, include unit tests under `src/**/*.test.ts`.
4. **Ensure Clean Checks**:
   - `pnpm run typecheck`
   - `pnpm run test`
   - `pnpm run build`
5. **Open a PR**: Submit a pull request against `main`. Provide a clear description of what changed and link any relevant issues.

---

## Questions or Need Help?

If you have questions or need guidance on how to implement something, please feel free to open a [GitHub Issue](https://github.com/sagarkrjha/codeshelf/issues) or reach out in the repository discussions. We are happy to help!
