import { performance } from 'node:perf_hooks';
import {
  compressString,
  decompressString,
  compressToBase64,
  decompressFromBase64,
  getCompressionMetrics,
  computeLineDiff,
  computeDiffMetrics,
  computeSha256Sync,
  computeSnippetHash,
  jaccardSimilarity,
  extractTokens,
  rankSnippetsByQuery,
  canonicalizeTechnology,
  canonicalizeLanguage,
  normalizeTags,
  normalizeTechnologies,
  serializeSnippetToMarkdown,
  parseMarkdownToSnippet,
  type Snippet,
} from './index';

function runBenchmark(name: string, fn: () => void | Promise<void>, iterations = 1000): Promise<void> | void {
  // Warmup
  for (let i = 0; i < Math.min(20, iterations); i++) {
    const res = fn();
    if (res instanceof Promise) {
      return (async () => {
        await res;
        for (let j = 0; j < Math.min(10, iterations); j++) {
          await fn();
        }
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          await fn();
        }
        const totalMs = performance.now() - start;
        const opsPerSec = Math.round((iterations / (totalMs / 1000)));
        const avgMs = (totalMs / iterations).toFixed(4);
        console.log(`⏱️  [Async] ${name.padEnd(45)} | ${iterations.toString().padStart(6)} ops | ${totalMs.toFixed(2).padStart(8)} ms | ${avgMs.padStart(8)} ms/op | ${opsPerSec.toLocaleString().padStart(10)} ops/s`);
      })();
    }
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const totalMs = performance.now() - start;
  const opsPerSec = Math.round((iterations / (totalMs / 1000)));
  const avgMs = (totalMs / iterations).toFixed(4);
  console.log(`⚡ [Sync]  ${name.padEnd(45)} | ${iterations.toString().padStart(6)} ops | ${totalMs.toFixed(2).padStart(8)} ms | ${avgMs.padStart(8)} ms/op | ${opsPerSec.toLocaleString().padStart(10)} ops/s`);
}

async function main() {
  console.log('='.repeat(96));
  console.log('🚀 CodeShelf Performance Benchmarks (@codeshelf/shared)');
  console.log('='.repeat(96));
  console.log(`Node Environment: Node ${process.version} (${process.platform} ${process.arch})\n`);

  // Sample data
  const sampleCode = `
import React, { useState, useEffect } from 'react';

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/' + userId)
      .then(r => r.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div><h1>{user.name}</h1><p>{user.email}</p></div>;
}
`.trim();

  const sampleModifiedCode = sampleCode
    .replace('fetch(', 'window.fetch(')
    .replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n  const [error, setError] = useState<string | null>(null);')
    .replace('setLoading(false);', 'setLoading(false);\n      }).catch(err => {\n        setError(err.message);\n        setLoading(false);');

  const sampleSnippet: Snippet = {
    id: 'snip-101',
    title: 'React User Profile Component',
    code: sampleCode,
    language: 'typescript',
    category: 'React Components',
    subcategory: 'Hooks & Data Fetching',
    tags: ['react', 'typescript', 'hooks', 'frontend'],
    technology: ['React', 'TypeScript'],
    complexity: { time: 'O(1)', space: 'O(1)' },
    description: 'A component fetching user details with state and lifecycle hooks.',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleSnippetsList = Array.from({ length: 50 }, (_, i) => ({
    ...sampleSnippet,
    id: `snip-${i}`,
    title: `Snippet ${i} - ${i % 2 === 0 ? 'Algorithm' : 'React component'}`,
    tags: i % 2 === 0 ? ['algorithm', 'sorting', 'utils'] : ['react', 'hooks', 'ui'],
    technologies: i % 2 === 0 ? ['TypeScript'] : ['React', 'TypeScript'],
  }));

  // 1. Cryptography / Hashing
  console.log('--- 1. Cryptography & Hashing ---');
  runBenchmark('computeSha256Sync (sample text)', () => {
    computeSha256Sync(sampleCode);
  }, 5000);

  runBenchmark('computeSnippetHash (deterministic hash)', () => {
    computeSnippetHash(sampleSnippet);
  }, 5000);

  // 2. Myers Diff & Diff Metrics
  console.log('\n--- 2. Myers Diff Algorithm & Metrics ---');
  let diffLinesCached: any[] = [];
  runBenchmark('computeLineDiff (Myers SES diff)', () => {
    diffLinesCached = computeLineDiff(sampleCode, sampleModifiedCode);
  }, 2000);

  runBenchmark('computeDiffMetrics (Diff stats calculation)', () => {
    computeDiffMetrics(diffLinesCached);
  }, 10000);

  // 3. Taxonomy & Normalization
  console.log('\n--- 3. Taxonomy, Canonicalization & Normalization ---');
  const dirtyTags = ['  React.JS ', 'Typescript', '.TS', 'NODE.JS', 'react', 'FRONTEND', '  '];
  const dirtyTech = ['ts', 'REACT', 'c++', '.cpp', 'Node.js', 'Typescript'];

  runBenchmark('canonicalizeTechnology', () => {
    canonicalizeTechnology('cpp');
    canonicalizeTechnology('TypeScript');
    canonicalizeTechnology('.ts');
  }, 10000);

  runBenchmark('canonicalizeLanguage', () => {
    canonicalizeLanguage('TypeScript');
    canonicalizeLanguage('PYTHON');
    canonicalizeLanguage('csharp');
  }, 10000);

  runBenchmark('normalizeTags (dedupe & clean)', () => {
    normalizeTags(dirtyTags);
  }, 5000);

  runBenchmark('normalizeTechnologies (canonical & dedupe)', () => {
    normalizeTechnologies(dirtyTech);
  }, 5000);

  // 4. Search & Similarity
  console.log('\n--- 4. Search, Similarity & Ranking ---');
  runBenchmark('extractTokens & jaccardSimilarity', () => {
    const t1 = extractTokens('React component with data fetching and useEffect hooks');
    const t2 = extractTokens('Frontend React component utilizing hooks and state');
    jaccardSimilarity(t1, t2);
  }, 5000);

  runBenchmark('rankSnippetsByQuery (over 50 snippets)', () => {
    rankSnippetsByQuery('react hooks data fetching', sampleSnippetsList as any);
  }, 1000);

  // 5. Markdown Serialization & Parsing
  console.log('\n--- 5. Markdown Serialization & Parsing ---');
  let serializedMd = '';
  runBenchmark('serializeSnippetToMarkdown', () => {
    serializedMd = serializeSnippetToMarkdown(sampleSnippet);
  }, 2000);

  runBenchmark('parseMarkdownToSnippet', () => {
    parseMarkdownToSnippet(serializedMd);
  }, 2000);

  // 6. Data Compression & Metrics
  console.log('\n--- 6. Compression & Metrics ---');
  runBenchmark('getCompressionMetrics', () => {
    getCompressionMetrics(sampleCode, sampleModifiedCode);
  }, 10000);

  await runBenchmark('compressString & decompressString (GZIP)', async () => {
    const compressed = await compressString(sampleCode, 'gzip');
    await decompressString(compressed, 'gzip');
  }, 200);

  await runBenchmark('compressToBase64 & decompressFromBase64', async () => {
    const base64 = await compressToBase64(sampleCode);
    await decompressFromBase64(base64);
  }, 200);

  console.log('\n' + '='.repeat(96));
  console.log('✅ Benchmarks completed successfully!');
  console.log('='.repeat(96));
}

main().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
