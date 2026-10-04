# CodeShelf Performance & Metrics Report

This document records the official performance metrics, TypeScript compiler diagnostics, benchmark execution results, and test suite verification for the CodeShelf monorepo.

---

## 1. Executive Summary

- **Total Unit & Feature Tests**: 69 passing (100% pass rate) across 13 test suites.
- **Strict TypeScript Diagnostics**: 0 errors across `@codeshelf/shared`, `apps/web`, `apps/desktop`, and `apps/vscode`.
- **Myers Diff Performance**: ~57,500 operations/sec for full line diffing; **1,290,000+ operations/sec** for diff statistics aggregation.
- **Canonicalization & Taxonomy**: Over **2,900,000 operations/sec** for technology/language resolution.
- **Data Compression**: GZIP stream compression roundtrips at **~1,460+ ops/sec**; metadata savings calculation executes at **340,000+ ops/sec**.

---

## 2. Official TypeScript Compiler Diagnostics (`tsc --extendedDiagnostics`)

The following diagnostics were measured using TypeScript compiler version **7.0.2** across each monorepo package with strict type checking enabled (`--noEmit`):

| Package / App | Source Files | Lines of Code | Identifiers | Symbols | Types | Check Time | Total Time | Memory Used |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`@codeshelf/shared`** | 282 | 146,372 | 112,050 | 82,597 | 7,883 | 0.031s | **0.168s** | 69.4 MB |
| **`apps/web`** (React + Vite) | 312 | 205,494 | 180,807 | 169,078 | 32,672 | 0.216s | **0.490s** | 142.8 MB |
| **`apps/desktop`** (Electron) | 273 | 123,720 | 86,073 | 68,202 | 3,224 | 0.014s | **0.147s** | 54.5 MB |
| **`apps/vscode`** (Extension) | 279 | 117,800 | 77,534 | 57,467 | 3,874 | 0.018s | **0.133s** | 50.0 MB |

> **Compiler Health**: Total workspace typechecking finishes in under **0.95s** cumulatively with zero type errors.

---

## 3. Micro-Benchmark Execution Results (`pnpm bench`)

Ran under Node v24.19.0 (win32 x64) testing core cryptographic, diffing, taxonomy, search, and compression algorithms:

```text
================================================================================================
🚀 CodeShelf Performance Benchmarks (@codeshelf/shared)
================================================================================================

--- 1. Cryptography & Hashing ---
⚡ [Sync]  computeSha256Sync (sample text)               |   5000 ops |   0.0174 ms/op |     57,596 ops/s
⚡ [Sync]  computeSnippetHash (deterministic hash)       |   5000 ops |   0.0150 ms/op |     66,884 ops/s

--- 2. Myers Diff Algorithm & Metrics ---
⚡ [Sync]  computeLineDiff (Myers SES diff)              |   2000 ops |   0.0174 ms/op |     57,539 ops/s
⚡ [Sync]  computeDiffMetrics (Diff stats calculation)   |  10000 ops |   0.0008 ms/op |  1,290,256 ops/s

--- 3. Taxonomy, Canonicalization & Normalization ---
⚡ [Sync]  canonicalizeTechnology                        |  10000 ops |   0.0003 ms/op |  2,972,828 ops/s
⚡ [Sync]  canonicalizeLanguage                          |  10000 ops |   0.0005 ms/op |  2,148,689 ops/s
⚡ [Sync]  normalizeTags (dedupe & clean)                |   5000 ops |   0.0054 ms/op |    183,826 ops/s
⚡ [Sync]  normalizeTechnologies (canonical & dedupe)    |   5000 ops |   0.0033 ms/op |    306,782 ops/s

--- 4. Search, Similarity & Ranking ---
⚡ [Sync]  extractTokens & jaccardSimilarity             |   5000 ops |   0.0061 ms/op |    162,735 ops/s
⚡ [Sync]  rankSnippetsByQuery (over 50 snippets)        |   1000 ops |   1.1044 ms/op |        905 ops/s

--- 5. Markdown Serialization & Parsing ---
⚡ [Sync]  serializeSnippetToMarkdown                    |   2000 ops |   0.0050 ms/op |    199,561 ops/s
⚡ [Sync]  parseMarkdownToSnippet                        |   2000 ops |   0.0423 ms/op |     23,659 ops/s

--- 6. Compression & Metrics ---
⚡ [Sync]  getCompressionMetrics                         |  10000 ops |   0.0029 ms/op |    341,140 ops/s
⏱️  [Async] compressString & decompressString (GZIP)      |    200 ops |   0.6820 ms/op |      1,466 ops/s
⏱️  [Async] compressToBase64 & decompressFromBase64       |    200 ops |   0.6179 ms/op |      1,618 ops/s

================================================================================================
✅ Benchmarks completed successfully!
================================================================================================
```

---

## 4. Test Suite Standard Metrics (TAP 13)

Standard TAP test execution via `tsx --test --test-reporter=tap`:

```text
1..69
# tests 69
# suites 0
# pass 69
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1891.7391
```

### Verified Test Areas:
1. **AI Generation & Sanitization**: API key validation, redaction on failure, autofill extraction, conventional commit generation.
2. **Data Compression**: GZIP and Base64 compression roundtrips, multi-byte UTF-8 handling, edge cases, compression metrics savings/ratio.
3. **Configuration & Security**: Default configuration guarantees, permissions schema enforcement, config merging.
4. **Cryptography**: NIST SHA-256 test vectors, async/sync equivalence, snippet content hash determinism.
5. **Myers Diff Engine**: Minimal Shortest Edit Script (SES), edge cases (empty inputs, addition-only, deletion-only), line diff metrics calculation.
6. **Markdown Engine**: Multi-block sequence preservation, code heading isolation, metadata sync.
7. **Similarity & Taxonomy**: Jaccard similarity, canonical technology mapping, duplicate elimination, semantic snippet ranking.
8. **Versioning & History**: Semver comparisons, revision reconstruction, change summary detection.
