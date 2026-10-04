import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compressString,
  decompressString,
  compressToBase64,
  decompressFromBase64,
  getCompressionMetrics,
  isGzipCompressed,
} from './compression';

test('compressString and decompressString roundtrip text accurately', async () => {
  const original = 'function helloWorld() {\n  console.log("Hello from CodeShelf!");\n}\n'.repeat(10);
  const compressed = await compressString(original, 'gzip');

  assert.ok(compressed.length > 0);
  assert.ok(isGzipCompressed(compressed));

  const decompressed = await decompressString(compressed, 'gzip');
  assert.equal(decompressed, original);
});

test('compressToBase64 and decompressFromBase64 roundtrip JSON snippet content', async () => {
  const snippetJson = JSON.stringify({
    title: 'Binary Search Algorithm',
    code: 'function binarySearch(arr, target) { ... }',
    description: 'Detailed binary search explanation and performance intuition',
  });

  const base64 = await compressToBase64(snippetJson);
  assert.ok(typeof base64 === 'string');
  assert.ok(base64.length > 0);

  const restored = await decompressFromBase64(base64);
  assert.equal(restored, snippetJson);
});

test('getCompressionMetrics calculates savings accurately', () => {
  const original = 'A'.repeat(1000);
  const dummyCompressed = new Uint8Array(200);

  const metrics = getCompressionMetrics(original, dummyCompressed);
  assert.equal(metrics.originalBytes, 1000);
  assert.equal(metrics.compressedBytes, 200);
  assert.equal(metrics.savedBytes, 800);
  assert.equal(metrics.percentSaved, 80);
  assert.equal(metrics.ratio, 5);
});

test('getCompressionMetrics handles edge cases (empty strings, string data, zero/negative savings)', () => {
  // 1. Empty original string
  const emptyMetrics = getCompressionMetrics('', new Uint8Array(0));
  assert.equal(emptyMetrics.originalBytes, 0);
  assert.equal(emptyMetrics.compressedBytes, 0);
  assert.equal(emptyMetrics.savedBytes, 0);
  assert.equal(emptyMetrics.percentSaved, 0);
  assert.equal(emptyMetrics.ratio, 1);

  // 2. Data that expands when compressed (negative savings clamped to 0)
  const shortText = 'hi';
  const largerOutput = new Uint8Array(50);
  const expandedMetrics = getCompressionMetrics(shortText, largerOutput);
  assert.equal(expandedMetrics.originalBytes, 2);
  assert.equal(expandedMetrics.compressedBytes, 50);
  assert.equal(expandedMetrics.savedBytes, 0);
  assert.equal(expandedMetrics.percentSaved, 0);
  assert.equal(expandedMetrics.ratio, 0.04);

  // 3. compressedData provided as string
  const stringCompressed = 'compressed-base64-content';
  const strMetrics = getCompressionMetrics('original content that is longer', stringCompressed);
  assert.equal(strMetrics.originalBytes, 31);
  assert.equal(strMetrics.compressedBytes, 25);
  assert.equal(strMetrics.savedBytes, 6);
  assert.equal(strMetrics.percentSaved, 19);
  assert.equal(strMetrics.ratio, 1.24);

  // 4. Unicode multi-byte UTF-8 character byte counting
  const emojiText = '🚀🔥🎉'; // Each emoji is 4 UTF-8 bytes -> 12 bytes total
  const emojiMetrics = getCompressionMetrics(emojiText, new Uint8Array(6));
  assert.equal(emojiMetrics.originalBytes, 12);
  assert.equal(emojiMetrics.compressedBytes, 6);
  assert.equal(emojiMetrics.savedBytes, 6);
  assert.equal(emojiMetrics.percentSaved, 50);
  assert.equal(emojiMetrics.ratio, 2);
});
