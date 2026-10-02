import test from 'node:test';
import assert from 'node:assert/strict';
import { generateHeuristicCommitMessage } from './commitMessage';
import { computeLineDiff } from './diff';

test('generateHeuristicCommitMessage generates conventional commit prefixes', () => {
  // Test perf
  const perfDiff = computeLineDiff(
    'function search() { for (let i = 0; i < n; i++) {} }',
    'function search() { // binary search with bitwise memo\nlet mid = (l + r) >> 1; }'
  );
  const perfMsg = generateHeuristicCommitMessage(perfDiff, 'Search Algorithm');
  assert.ok(perfMsg.startsWith('perf:'));

  // Test docs
  const docsDiff = computeLineDiff(
    'function add(a, b) { return a + b; }',
    '/**\n * Adds two numbers\n */\nfunction add(a, b) { return a + b; }'
  );
  const docsMsg = generateHeuristicCommitMessage(docsDiff, 'Add Helper');
  assert.ok(docsMsg.startsWith('docs:'));

  // Test fix
  const fixDiff = computeLineDiff(
    'function parse(val) { return val.name; }',
    'function parse(val) { if (!val) throw new Error("null"); return val.name; }'
  );
  const fixMsg = generateHeuristicCommitMessage(fixDiff, 'Parser');
  assert.ok(fixMsg.startsWith('fix:'));
});
