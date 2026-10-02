import test from 'node:test';
import assert from 'node:assert/strict';
import type { Snippet } from '../../models/models';
import {
  extractAllCategories,
  extractCategorySubcategories,
  extractAllTechnologies,
  extractAllLanguages,
  filterSnippets,
} from './taxonomy';

const mockSnippets: Snippet[] = [
  {
    id: 's1',
    title: 'Binary Search',
    code: 'function binarySearch() {}',
    language: 'typescript',
    category: 'Algorithms',
    subcategory: 'Searching',
    technology: ['TypeScript'],
    tags: ['binary-search', 'array'],
    usage: ['LeetCode'],
    complexity: { time: 'O(log n)', space: 'O(1)' },
    createdAt: '2026-09-24T12:00:00Z',
    updatedAt: '2026-09-24T12:00:00Z',
  },
  {
    id: 's2',
    title: 'Custom Deep Learning Layer',
    code: 'class CustomLayer(tf.keras.layers.Layer): pass',
    language: 'python',
    category: 'Machine Learning', // Custom category!
    subcategory: 'Neural Networks', // Custom subcategory!
    technology: ['Python', 'TensorFlow'],
    tags: ['deep-learning', 'keras'],
    usage: ['Production'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    createdAt: '2026-09-24T12:00:00Z',
    updatedAt: '2026-09-24T12:00:00Z',
  },
];

test('extractAllCategories includes default and custom categories', () => {
  const cats = extractAllCategories(mockSnippets);
  assert.ok(cats.includes('Algorithms'));
  assert.ok(cats.includes('Machine Learning'));
});

test('extractCategorySubcategories groups subcategories properly', () => {
  const map = extractCategorySubcategories(mockSnippets);
  assert.deepEqual(map['Algorithms'], ['Searching']);
  assert.deepEqual(map['Machine Learning'], ['Neural Networks']);
});

test('extractAllTechnologies includes custom technologies', () => {
  const techs = extractAllTechnologies(mockSnippets);
  assert.ok(techs.includes('TypeScript'));
  assert.ok(techs.includes('TensorFlow'));
});

test('extractAllLanguages extracts unique languages', () => {
  const langs = extractAllLanguages(mockSnippets);
  assert.deepEqual(langs, ['python', 'typescript']);
});

test('filterSnippets filters by flexible category, subcategory and complexity', () => {
  const mlSnippets = filterSnippets(mockSnippets, { domain: 'Machine Learning' });
  assert.equal(mlSnippets.length, 1);
  assert.equal(mlSnippets[0]?.id, 's2');

  const subSnippets = filterSnippets(mockSnippets, { subcategory: 'Searching' });
  assert.equal(subSnippets.length, 1);
  assert.equal(subSnippets[0]?.id, 's1');

  const complexSnippets = filterSnippets(mockSnippets, { complexityTime: 'log n' });
  assert.equal(complexSnippets.length, 1);
  assert.equal(complexSnippets[0]?.id, 's1');
});
