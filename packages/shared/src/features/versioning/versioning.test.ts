import { test } from 'node:test';
import assert from 'node:assert';
import {
  normalizeSnippetVersion,
  getSnippetVersionCount,
  hasSnippetMarkdownChanged,
  getRevisionMarkdown,
} from './versioning';
import type { Snippet } from '../../models/models';

test('normalizeSnippetVersion handles snippet with empty history', () => {
  const snippet: Snippet = {
    id: 'snip-hello',
    title: 'hello_world',
    code: 'console.log("hello");',
    language: 'javascript',
    tags: [],
    version: 3, // Inflated from metadata edits
    createdAt: '2026-09-24T12:00:00.000Z',
    updatedAt: '2026-09-25T12:00:00.000Z',
    history: [],
  };

  const normalized = normalizeSnippetVersion(snippet);
  assert.strictEqual(normalized.version, 1, 'Version should be normalized to 1');
  assert.strictEqual(normalized.history?.length, 0);
  assert.strictEqual(getSnippetVersionCount(normalized), 1, 'Total version count should be 1');
});

test('normalizeSnippetVersion normalizes Sentinel Search with 1 prior revision and inflated version', () => {
  const snippet: Snippet = {
    id: 'snip-sentinel',
    title: 'Sentinel Search',
    code: 'function sentinelSearch(arr, target) { return -1; }',
    language: 'javascript',
    tags: [],
    version: 5, // Inflated from metadata updates
    createdAt: '2026-09-24T09:00:00.000Z',
    updatedAt: '2026-09-25T09:00:00.000Z',
    history: [
      {
        version: 2, // Non-sequential revision version
        code: 'function sentinelSearch(target, arr) {}',
        changeSummary: 'Version 2 snapshot',
        timestamp: '2026-09-24T09:30:00.000Z',
      },
    ],
  };

  const normalized = normalizeSnippetVersion(snippet);
  assert.strictEqual(normalized.version, 2, 'Current version should be 2 (1 prior + 1 current)');
  assert.strictEqual(normalized.history?.length, 1);
  assert.strictEqual(normalized.history?.[0]?.version, 1, 'Prior revision should be normalized to v1');
  assert.strictEqual(getSnippetVersionCount(normalized), 2, 'Total version count should be 2');
});

test('normalizeSnippetVersion preserves and normalizes multiple revisions sequentially', () => {
  const snippet: Snippet = {
    id: 'snip-multi',
    title: 'Multi Revision Snippet',
    code: 'const v = 3;',
    language: 'javascript',
    tags: [],
    version: 99,
    createdAt: '2026-09-24T00:00:00.000Z',
    updatedAt: '2026-09-24T03:00:00.000Z',
    history: [
      {
        version: 12,
        code: 'const v = 2;',
        timestamp: '2026-09-24T02:00:00.000Z',
      },
      {
        version: 7,
        code: 'const v = 1;',
        timestamp: '2026-09-24T01:00:00.000Z',
      },
    ],
  };

  const normalized = normalizeSnippetVersion(snippet);
  assert.strictEqual(normalized.version, 3, 'Current version should be 3');
  assert.strictEqual(normalized.history?.length, 2);
  assert.strictEqual(normalized.history?.[0]?.version, 2, 'Newest previous revision should be v2');
  assert.strictEqual(normalized.history?.[1]?.version, 1, 'Oldest revision should be v1');
  assert.strictEqual(getSnippetVersionCount(normalized), 3);
  assert.ok(normalized.history?.[0]?.markdown?.includes('const v = 2;'));
});

test('hasSnippetMarkdownChanged detects changes across markdown content', () => {
  const base: Snippet = {
    id: 'snip-test',
    title: 'Original Title',
    code: 'const a = 1;',
    language: 'javascript',
    description: 'Original description',
    tags: ['tag1'],
    version: 1,
    createdAt: '2026-09-24T00:00:00.000Z',
    updatedAt: '2026-09-24T00:00:00.000Z',
  };

  // Code change
  assert.strictEqual(hasSnippetMarkdownChanged(base, { code: 'const a = 2;' }), true);

  // Description / notes change
  assert.strictEqual(hasSnippetMarkdownChanged(base, { description: 'Updated notes' }), true);

  // Title change
  assert.strictEqual(hasSnippetMarkdownChanged(base, { title: 'New Title' }), true);

  // Tags change
  assert.strictEqual(hasSnippetMarkdownChanged(base, { tags: ['tag1', 'tag2'] }), true);

  // Complexity change
  assert.strictEqual(hasSnippetMarkdownChanged(base, { complexity: { time: 'O(1)' } }), true);

  // No change
  assert.strictEqual(hasSnippetMarkdownChanged(base, { code: 'const a = 1;', description: 'Original description' }), false);
  assert.strictEqual(hasSnippetMarkdownChanged(base, { tags: ['tag1'] }), false);
});

test('getRevisionMarkdown reconstructs full markdown from snapshot and legacy fields', () => {
  const snippet: Snippet = {
    id: 'snip-full',
    title: 'Snapshot Test',
    code: 'const current = true;',
    language: 'typescript',
    tags: ['react'],
    description: 'Current description',
    version: 2,
    createdAt: '2026-09-24T00:00:00.000Z',
    updatedAt: '2026-09-24T01:00:00.000Z',
  };

  // Case 1: Revision with explicit markdown string
  const revWithMarkdown = {
    version: 1,
    code: 'const old = 1;',
    markdown: '# Custom Markdown Document\n\n```typescript\nconst old = 1;\n```\n',
    timestamp: '2026-09-24T00:30:00.000Z',
  };
  assert.strictEqual(
    getRevisionMarkdown(revWithMarkdown, snippet),
    '# Custom Markdown Document\n\n```typescript\nconst old = 1;\n```\n'
  );

  // Case 2: Legacy revision with only code & description
  const legacyRev = {
    version: 1,
    code: 'const legacy = 1;',
    description: 'Legacy notes',
    timestamp: '2026-09-24T00:30:00.000Z',
  };
  const synthesized = getRevisionMarkdown(legacyRev, snippet);
  assert.ok(synthesized.includes('# Snapshot Test'));
  assert.ok(synthesized.includes('const legacy = 1;'));
  assert.ok(synthesized.includes('Legacy notes'));
});

