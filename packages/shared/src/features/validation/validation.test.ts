import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateSnippetInput, validateSnippet } from './validation';

test('validateCreateSnippetInput detects valid input', () => {
  const result = validateCreateSnippetInput({
    title: 'Binary Search',
    code: 'function binarySearch() {}',
    language: 'typescript',
  });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validateCreateSnippetInput detects missing required fields', () => {
  const result = validateCreateSnippetInput({
    title: '',
    code: '',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 2);
});

test('validateSnippet validates complete snippet', () => {
  const result = validateSnippet({
    id: 'snip-123',
    title: 'Two Sum',
    code: 'const twoSum = () => {};',
    language: 'javascript',
    tags: ['array', 'hashmap'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  assert.equal(result.valid, true);
});
