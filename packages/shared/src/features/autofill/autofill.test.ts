import test from 'node:test';
import assert from 'node:assert/strict';
import { autofillSnippetDetails, detectLanguageFromCode } from './autofill';

test('detectLanguageFromCode detects python, rust, sql, and typescript', () => {
  assert.equal(detectLanguageFromCode('def hello_world():\n    print("hello")'), 'python');
  assert.equal(detectLanguageFromCode('fn main() {\n    println!("hello");\n}'), 'rust');
  assert.equal(detectLanguageFromCode('SELECT id, name FROM users WHERE active = 1;'), 'sql');
  assert.equal(
    detectLanguageFromCode('interface User {\n  id: string;\n}\nexport function getUser(): User {}'),
    'typescript'
  );
});

test('autofillSnippetDetails extracts title, category, tech, tags, and complexity', () => {
  const binarySearchCode = `function binarySearch(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor(left + (right - left) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`;

  const result = autofillSnippetDetails(binarySearchCode);
  assert.equal(result.title, 'Binary Search');
  assert.equal(result.language, 'typescript');
  assert.equal(result.category, 'Algorithms');
  assert.equal(result.subcategory, 'Searching');
  assert.ok(result.tags.includes('binary-search'));
  assert.ok(result.tags.includes('logarithmic'));
  assert.equal(result.complexity?.time, 'O(log n)');
  assert.equal(result.complexity?.space, 'O(1)');
  assert.ok(result.description.includes('Binary Search'));
});

test('autofillSnippetDetails extracts React hook details', () => {
  const hookCode = `import { useState, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}`;

  const result = autofillSnippetDetails(hookCode);
  assert.equal(result.title, 'useDebounce Hook');
  assert.equal(result.category, 'Frontend');
  assert.equal(result.subcategory, 'Hooks');
  assert.ok(result.technology.includes('React'));
  assert.ok(result.tags.includes('hook'));
  assert.ok(result.tags.includes('react'));
});
