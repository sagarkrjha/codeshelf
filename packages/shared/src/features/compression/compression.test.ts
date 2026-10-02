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
