import { test } from 'node:test';
import assert from 'node:assert';
import { mergeSnippets } from './sync';
import type { Snippet } from '../../models/models';

test('mergeSnippets adds new incoming snippets', () => {
  const base: Snippet[] = [
    {
      id: 's1',
      title: 'First Snippet',
      code: 'console.log("1");',
      language: 'javascript',
      tags: [],
      createdAt: '2026-09-24T10:00:00Z',
      updatedAt: '2026-09-24T10:00:00Z',
    },
  ];

  const incoming: Snippet[] = [
    {
      id: 's2',
      title: 'Second Snippet',
      code: 'console.log("2");',
      language: 'javascript',
      tags: [],
      createdAt: '2026-09-24T11:00:00Z',
      updatedAt: '2026-09-24T11:00:00Z',
    },
  ];

  const result = mergeSnippets(base, incoming);
  assert.strictEqual(result.added, 1);
  assert.strictEqual(result.merged.length, 2);
  assert.strictEqual(result.merged[0]?.id, 's2'); // Newer updatedAt first
});

test('mergeSnippets updates existing snippet when incoming is newer', () => {
  const base: Snippet[] = [
    {
      id: 's1',
      title: 'Old Title',
      code: 'console.log("old");',
      language: 'javascript',
      tags: [],
      version: 1,
      createdAt: '2026-09-24T10:00:00Z',
      updatedAt: '2026-09-24T10:00:00Z',
    },
  ];

  const incoming: Snippet[] = [
    {
      id: 's1',
      title: 'Updated Title',
      code: 'console.log("new");',
      language: 'javascript',
      tags: [],
      version: 2,
      createdAt: '2026-09-24T10:00:00Z',
      updatedAt: '2026-09-24T12:00:00Z',
      history: [
        {
          version: 1,
          code: 'console.log("old");',
          changeSummary: 'v1',
          timestamp: '2026-09-24T10:00:00Z',
        },
      ],
    },
  ];

  const result = mergeSnippets(base, incoming);
  assert.strictEqual(result.updated, 1);
  assert.strictEqual(result.merged.length, 1);
  assert.strictEqual(result.merged[0]?.title, 'Updated Title');
  assert.strictEqual(result.merged[0]?.history?.length, 1);
});

test('mergeSnippets keeps existing snippet when base is newer', () => {
  const base: Snippet[] = [
    {
      id: 's1',
      title: 'Newer Base Title',
      code: 'console.log("newer");',
      language: 'javascript',
      tags: [],
      createdAt: '2026-09-24T10:00:00Z',
      updatedAt: '2026-09-24T13:00:00Z',
    },
  ];

  const incoming: Snippet[] = [
    {
      id: 's1',
      title: 'Older Incoming Title',
      code: 'console.log("older");',
      language: 'javascript',
      tags: [],
      createdAt: '2026-09-24T10:00:00Z',
      updatedAt: '2026-09-24T11:00:00Z',
    },
  ];

  const result = mergeSnippets(base, incoming);
  assert.strictEqual(result.unchanged, 1);
  assert.strictEqual(result.merged[0]?.title, 'Newer Base Title');
});
