import type { Snippet, SnippetRevision } from '../../models/models';

// SHA-256 Round Constants (first 32 bits of fractional parts of cube roots of first 64 primes)
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, b: number): number {
  return (n >>> b) | (n << (32 - b));
}

/**
 * Encodes a JavaScript UTF-16 string into a UTF-8 Uint8Array.
 */
function utf8Encode(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Pure, self-contained, synchronous SHA-256 cryptographic hash (FIPS 180-4).
 * Works reliably in any environment (Browser, Node, Electron, Web Workers).
 *
 * @param data Input string to hash
 * @returns 64-character lowercase hex digest
 */
export function computeSha256Sync(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? utf8Encode(data) : data;
  const len = bytes.length;

  // Pre-processing (Padding)
  // Length in bits is len * 8
  const bitLen = len * 8;
  const paddingLen = ((len + 8) >> 6) + 1;
  const words = new Uint32Array(paddingLen * 16);

  for (let i = 0; i < len; i++) {
    const wordIdx = i >> 2;
    words[wordIdx] = (words[wordIdx] ?? 0) | (bytes[i]! << (24 - (i % 4) * 8));
  }
  const lenIdx = len >> 2;
  words[lenIdx] = (words[lenIdx] ?? 0) | (0x80 << (24 - (len % 4) * 8));

  // Big-endian 64-bit length at the very end
  const wLen = words.length;
  words[wLen - 2] = Math.floor(bitLen / 0x100000000);
  words[wLen - 1] = bitLen & 0xffffffff;

  // Initial hash values
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  // Process message in 512-bit chunks (16 32-bit words)
  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) {
      w[t] = words[i + t]!;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15]!, 7) ^ rotr(w[t - 15]!, 18) ^ (w[t - 15]! >>> 3);
      const s1 = rotr(w[t - 2]!, 17) ^ rotr(w[t - 2]!, 19) ^ (w[t - 2]! >>> 10);
      w[t] = (w[t - 16]! + s0 + w[t - 7]! + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + K[t]! + w[t]!) | 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const hex = [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((val) => (val >>> 0).toString(16).padStart(8, '0'))
    .join('');

  return hex;
}

/**
 * Asynchronous SHA-256 computation leveraging Web Crypto API if available,
 * falling back to the pure synchronous implementation.
 */
export async function computeSha256(data: string | Uint8Array): Promise<string> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    try {
      const bytes = typeof data === 'string' ? utf8Encode(data) : data;
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }
  return computeSha256Sync(data);
}

/**
 * Generates a deterministic SHA-256 hash for a snippet or snippet revision.
 * Canonicalizes content (title, code, language, markdown, description) to form an addressable commit hash.
 */
export function computeSnippetHash(snippetOrRevision: Partial<Snippet> | Partial<SnippetRevision>): string {
  const parts: string[] = [
    ('title' in snippetOrRevision && snippetOrRevision.title) ? snippetOrRevision.title.trim() : '',
    snippetOrRevision.code ? snippetOrRevision.code.trim() : '',
    ('language' in snippetOrRevision && snippetOrRevision.language) ? snippetOrRevision.language.trim().toLowerCase() : '',
    snippetOrRevision.markdown ? snippetOrRevision.markdown.trim() : '',
    snippetOrRevision.description ? snippetOrRevision.description.trim() : '',
  ];
  const canonicalString = parts.join('\x1f'); // Unit separator delimiter
  return computeSha256Sync(canonicalString);
}

/**
 * Formats a SHA-256 hash into a short commit-like identifier (e.g. "c4f1a23").
 */
export function formatShortHash(hash: string, length = 7): string {
  if (!hash) return '';
  return hash.slice(0, Math.max(4, Math.min(length, hash.length)));
}
