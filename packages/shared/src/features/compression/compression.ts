/**
 * Cross-platform data compression utilities supporting GZIP, Deflate,
 * and Base64 encoding with compression metrics.
 */

export interface CompressionMetrics {
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  percentSaved: number;
  ratio: number;
}

/**
 * Checks whether the input byte array begins with standard GZIP magic bytes (0x1F, 0x8B).
 */
export function isGzipCompressed(data: Uint8Array): boolean {
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

/**
 * Compresses a UTF-8 string into a GZIP or Deflate byte array using the Web Streams API.
 */
export async function compressString(
  input: string,
  format: 'gzip' | 'deflate' = 'gzip'
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(input);

  if (typeof CompressionStream !== 'undefined') {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(inputBytes);
        controller.close();
      },
    }).pipeThrough(new CompressionStream(format));

    const response = new Response(stream);
    const blob = await response.arrayBuffer();
    return new Uint8Array(blob);
  }

  // Fallback: return raw bytes if CompressionStream is unavailable
  return inputBytes;
}

/**
 * Decompresses a GZIP or Deflate byte array back into a UTF-8 string.
 */
export async function decompressString(
  compressed: Uint8Array,
  format: 'gzip' | 'deflate' = 'gzip'
): Promise<string> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(compressed);
          controller.close();
        },
      }).pipeThrough(new DecompressionStream(format));

      const response = new Response(stream);
      return await response.text();
    } catch {
      // If decompression fails (e.g. was uncompressed raw text), decode directly
      const decoder = new TextDecoder();
      return decoder.decode(compressed);
    }
  }

  const decoder = new TextDecoder();
  return decoder.decode(compressed);
}

/**
 * Compresses a text string into a URL/JSON-safe Base64 representation.
 */
export async function compressToBase64(input: string): Promise<string> {
  const compressed = await compressString(input, 'gzip');
  let binary = '';
  const len = compressed.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(compressed[i]!);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  return Buffer.from(compressed).toString('base64');
}

/**
 * Decompresses a Base64 string produced by compressToBase64 back to text.
 */
export async function decompressFromBase64(base64: string): Promise<string> {
  let binary: string;
  if (typeof atob !== 'undefined') {
    binary = atob(base64);
  } else {
    binary = Buffer.from(base64, 'base64').toString('binary');
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return decompressString(bytes, 'gzip');
}

/**
 * Computes compression metrics (bytes saved, percent saved, compression ratio).
 */
export function getCompressionMetrics(
  originalText: string,
  compressedData: Uint8Array | string
): CompressionMetrics {
  const originalBytes = new TextEncoder().encode(originalText).length;
  const compressedBytes =
    typeof compressedData === 'string'
      ? new TextEncoder().encode(compressedData).length
      : compressedData.length;

  const savedBytes = Math.max(0, originalBytes - compressedBytes);
  const percentSaved =
    originalBytes > 0
      ? Math.max(0, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100))
      : 0;
  const ratio =
    compressedBytes > 0 ? Number((originalBytes / compressedBytes).toFixed(2)) : 1;

  return {
    originalBytes,
    compressedBytes,
    savedBytes,
    percentSaved,
    ratio,
  };
}
