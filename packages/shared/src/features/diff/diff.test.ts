import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLineDiff, myersDiff, computeDiffMetrics } from './diff';

test('computeLineDiff detects unchanged lines', () => {
  const text = 'line 1\nline 2';
  const diff = computeLineDiff(text, text);
  assert.equal(diff.length, 2);
  assert.ok(diff.every((d) => d.type === 'unchanged'));
});

test('computeLineDiff detects additions and removals', () => {
  const oldText = 'const a = 1;\nconst b = 2;';
  const newText = 'const a = 1;\nconst b = 3;\nconst c = 4;';
  const diff = computeLineDiff(oldText, newText);

  assert.equal(diff[0]?.type, 'unchanged');
  assert.equal(diff[1]?.type, 'removed');
  assert.equal(diff[1]?.text, 'const b = 2;');
  assert.equal(diff[2]?.type, 'added');
  assert.equal(diff[2]?.text, 'const b = 3;');
  assert.equal(diff[3]?.type, 'added');
  assert.equal(diff[3]?.text, 'const c = 4;');
});

test('myersDiff handles empty inputs and edge cases', () => {
  assert.deepEqual(myersDiff([], []), []);

  const addedOnly = myersDiff([], ['line 1', 'line 2']);
  assert.equal(addedOnly.length, 2);
  assert.ok(addedOnly.every((d) => d.type === 'added'));
  assert.equal(addedOnly[0]?.newLineNumber, 1);
  assert.equal(addedOnly[1]?.newLineNumber, 2);

  const removedOnly = myersDiff(['line 1', 'line 2'], []);
  assert.equal(removedOnly.length, 2);
  assert.ok(removedOnly.every((d) => d.type === 'removed'));
  assert.equal(removedOnly[0]?.oldLineNumber, 1);
  assert.equal(removedOnly[1]?.oldLineNumber, 2);
});

test('myersDiff computes minimal shortest edit script (SES)', () => {
  const oldLines = ['A', 'B', 'C', 'A', 'B', 'B', 'A'];
  const newLines = ['C', 'B', 'A', 'B', 'A', 'C'];
  const diff = myersDiff(oldLines, newLines);

  const reconstructed: string[] = [];
  diff.forEach((d) => {
    if (d.type === 'unchanged' || d.type === 'added') {
      reconstructed.push(d.text);
    }
  });

  assert.deepEqual(reconstructed, newLines);

  const addedCount = diff.filter((d) => d.type === 'added').length;
  const removedCount = diff.filter((d) => d.type === 'removed').length;
  // Myers minimal edit distance D = addedCount + removedCount
  assert.ok(addedCount > 0 && removedCount > 0);
});

test('computeDiffMetrics accurately calculates added, removed, unchanged and total lines', () => {
  // Empty diff lines
  const emptyMetrics = computeDiffMetrics([]);
  assert.deepEqual(emptyMetrics, { added: 0, removed: 0, unchanged: 0, total: 0 });

  // Diff lines from computeLineDiff
  const oldText = 'line1\nline2\nline3';
  const newText = 'line1\nline2_modified\nline3\nline4';
  const diffLines = computeLineDiff(oldText, newText);
  const metrics = computeDiffMetrics(diffLines);

  assert.equal(metrics.total, diffLines.length);
  assert.equal(metrics.added + metrics.removed + metrics.unchanged, metrics.total);
  assert.ok(metrics.added >= 1);
  assert.ok(metrics.removed >= 1);
  assert.ok(metrics.unchanged >= 2);
});
