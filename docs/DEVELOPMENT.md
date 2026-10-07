# Development & Contribution Guide

This document outlines the local development workflow, quality checks, package boundaries, and contribution standards for CodeShelf.

## Prerequisites & Tooling

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **pnpm**: Version `12.6.0` (or `10+`)
- **TypeScript**: `7.0.2` (managed per package and workspace)

```bash
# Verify tooling
node -v
pnpm -v
```

---

## Monorepo Layout

```text
codeshelf/
├── apps/
│   ├── desktop/             # Electron shell (main, preload, services, windowManager)
│   ├── vscode/              # VS Code extension (capture, search, explorer, updates)
│   └── web/                 # React 19 web app (layout, editor, viewers, search, modals)
├── packages/
│   └── shared/              # Core domain models, diff engine, validators, algorithms & tests
├── docs/                    # Technical documentation
├── .github/
│   └── workflows/           # CI and release automation pipelines
├── package.json             # Root workspace orchestration
├── pnpm-workspace.yaml      # pnpm workspace definition
└── tsconfig.base.json       # Base TypeScript compiler configuration
```

---

## Package Boundaries & Architectural Rules

To maintain code quality and prevent circular dependencies:

1. **Shared Logic Lives in `@codeshelf/shared`**:
   - Data models (`Snippet`, `CodeShelfConfig`), diff algorithms, hashing, markdown AST parsing, similarity scoring, and canonical taxonomy must live in `@codeshelf/shared`.
   - Never duplicate normalization or models in `apps/web`, `apps/desktop`, or `apps/vscode`.
2. **Zero DOM or Electron Dependencies in Shared**:
   - `@codeshelf/shared` is isomorphic and must remain runnable in Node.js, Electron, web browsers, and extension hosts.
3. **No Direct `localStorage` for Sensitive Data**:
   - The user's Gemini API key is stored exclusively in `~/.codeshelf/config.json` on the filesystem or in memory.
4. **Canonical Taxonomy Matching**:
   - Always utilize canonical taxonomy functions (`canonicalizeLanguage`, `normalizeTechnologies`, `normalizeTags`, `matchesTechnologyOrTag`) rather than direct lowercase string comparisons.
5. **Atomic File Persistence**:
   - Storage writers on disk must use temporary sibling files and atomic renames.

---

## Development Scripts

The root `package.json` provides scripts across workspaces:

```bash
# Install dependencies across all workspaces
pnpm install

# Build all packages and applications
pnpm run build

# Run type checks across all workspaces (tsc --noEmit)
pnpm run typecheck

# Run unit tests across all workspaces
pnpm run test

# Run micro-benchmarks (@codeshelf/shared)
pnpm run bench

# Web client development server (http://localhost:5173)
pnpm run web:dev

# Desktop application development
pnpm run desktop:dev

# Desktop application production build
pnpm run desktop:build

# VS Code extension compile & package
pnpm run vscode:build
pnpm run vscode:package
```

---

## Testing & Quality Assurance

### Unit Tests
Unit tests in `@codeshelf/shared` run using Node's native test runner via `tsx`:
```bash
pnpm run test
```
Test suites cover:
- AI client error masking and prompt response schemas
- GZIP and Base64 compression roundtrips
- Configuration sanitization and permission merging
- SHA-256 cryptographic hashing and NIST vector validation
- Myers SES line diffing and metrics
- Markdown serialization, parsing, and multi-block code fences
- Jaccard similarity, query ranking, and taxonomy mapping
- Snippet versioning and merge conflict resolution

### Typechecking
Strict TypeScript checks run across every workspace:
```bash
pnpm run typecheck
```

---

## Git Conventions & Pull Requests

### Commit Message Format
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat(scope): description` for new features
- `fix(scope): description` for bug fixes
- `docs(scope): description` for documentation changes
- `refactor(scope): description` for code refactoring
- `test(scope): description` for test improvements

### Pull Request Process
1. Create a feature branch off `main` (`git checkout -b feat/my-feature`).
2. Implement your changes following monorepo boundaries.
3. Add or update unit tests under `packages/shared/src/**/*.test.ts` where applicable.
4. Verify that `pnpm run typecheck`, `pnpm run test`, and `pnpm run build` all pass cleanly.
5. Submit a pull request against `main`. Continuous Integration ([`ci.yml`](../.github/workflows/ci.yml)) will automatically validate linting, typechecking, tests, and build artifacts.
