import test from 'node:test';
import assert from 'node:assert/strict';
import type { Snippet } from '../../models/models';
import {
  extractTokens,
  jaccardSimilarity,
  computeSnippetSimilarity,
  findRelatedSnippets,
  rankSnippetsByQuery,
} from './similarity';

test('extractTokens normalizes words and removes punctuation', () => {
  const tokens = extractTokens('Binary-Search, for O(log n) arrays!');
  assert.ok(tokens.has('binary-search') || tokens.has('binary'));
  assert.ok(tokens.has('arrays'));
  assert.ok(tokens.has('log'));
});

test('jaccardSimilarity computes set overlap', () => {
  const setA = new Set(['react', 'hook', 'state']);
  const setB = new Set(['react', 'hook', 'effect']);
  const sim = jaccardSimilarity(setA, setB);
  assert.ok(sim > 0.4 && sim < 0.6);
});

test('findRelatedSnippets recommends snippets with matching category and tags', () => {
  const snip1: Snippet = {
    id: '1',
    title: 'Binary Search',
    code: 'function binarySearch() {}',
    language: 'typescript',
    category: 'Algorithms',
    tags: ['search', 'array'],
    createdAt: '',
    updatedAt: '',
  };

  const snip2: Snippet = {
    id: '2',
    title: 'Ternary Search',
    code: 'function ternarySearch() {}',
    language: 'typescript',
    category: 'Algorithms',
    tags: ['search', 'divide-and-conquer'],
    createdAt: '',
    updatedAt: '',
  };

  const snip3: Snippet = {
    id: '3',
    title: 'useDebounce Hook',
    code: 'function useDebounce() {}',
    language: 'typescript',
    category: 'Frontend',
    tags: ['react', 'hook'],
    createdAt: '',
    updatedAt: '',
  };

  assert.ok(computeSnippetSimilarity(snip1, snip2) > computeSnippetSimilarity(snip1, snip3));
  const related = findRelatedSnippets(snip1, [snip1, snip2, snip3]);
  assert.ok(related.length >= 1);
  assert.equal(related[0]?.snippet.id, '2');
});

test('rankSnippetsByQuery ranks relevant snippet at the top', () => {
  const snippets: Snippet[] = [
    {
      id: '1',
      title: 'Quick Sort',
      code: 'function quickSort() {}',
      language: 'typescript',
      tags: ['sorting'],
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      title: 'Dijkstra Shortest Path',
      code: 'function dijkstra() {}',
      language: 'typescript',
      tags: ['graph', 'shortest-path'],
      createdAt: '',
      updatedAt: '',
    },
  ];

  const results = rankSnippetsByQuery('shortest path graph', snippets);
  assert.equal(results[0]?.snippet.id, '2');
});
