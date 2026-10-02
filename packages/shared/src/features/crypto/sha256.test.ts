import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSha256Sync,
  computeSha256,
  computeSnippetHash,
  formatShortHash,
} from './sha256';

test('computeSha256Sync matches official NIST SHA-256 test vectors', () => {
  // Empty string
  assert.equal(
    computeSha256Sync(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );

  // "hello world"
  assert.equal(
    computeSha256Sync('hello world'),
    'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
  );

  // "The quick brown fox jumps over the lazy dog"
  assert.equal(
    computeSha256Sync('The quick brown fox jumps over the lazy dog'),
    'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
  );
});

test('computeSha256 async matches synchronous output', async () => {
  const text = 'CodeShelf snippet test string with unicode: 🚀 ✨ 💻';
  const syncHash = computeSha256Sync(text);
  const asyncHash = await computeSha256(text);
  assert.equal(asyncHash, syncHash);
});

test('computeSnippetHash is deterministic and sensitive to content changes', () => {
  const s1 = {
    title: 'Quicksort',
    code: 'function qs() {}',
    language: 'typescript',
  };
  const s2 = {
    title: 'Quicksort',
    code: 'function qs() {}',
    language: 'typescript',
  };
  const s3 = {
    title: 'Quicksort',
    code: 'function qs(arr) {}',
    language: 'typescript',
  };

  const h1 = computeSnippetHash(s1);
  const h2 = computeSnippetHash(s2);
  const h3 = computeSnippetHash(s3);

  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
  assert.equal(h1.length, 64);
  assert.equal(formatShortHash(h1, 7), h1.slice(0, 7));
});
