import { test } from 'node:test';
import assert from 'node:assert';
import {
  createGenAIClient,
  executeSafeAiCall,
  DEFAULT_GEMINI_MODEL,
} from './client';
import { aiAutofillFromCode } from './autofill';
import { aiGenerateCommitMessage } from './commit';

test('createGenAIClient validates apiKey', () => {
  assert.throws(() => {
    createGenAIClient('');
  }, /Gemini API key is required/);

  assert.throws(() => {
    createGenAIClient('   ');
  }, /Gemini API key is required/);

  const client = createGenAIClient('test-key');
  assert.ok(client);
  assert.strictEqual(typeof client.models.generateContent, 'function');
  assert.strictEqual(DEFAULT_GEMINI_MODEL, 'gemini-3.8-flash');
});

test('executeSafeAiCall redacts secret API key if error occurs', async () => {
  const secretKey = 'AIzaSyTopSecretKey987654321';
  let thrownError: Error | null = null;

  try {
    await executeSafeAiCall(secretKey, async () => {
      throw new Error(`Authentication failed with key: ${secretKey}`);
    });
  } catch (err: any) {
    thrownError = err;
  }

  assert.ok(thrownError);
  assert.ok(
    !thrownError.message.includes(secretKey),
    'Secret API key must not appear in error message'
  );
  assert.ok(
    thrownError.message.includes('[REDACTED_API_KEY]'),
    'Secret API key must be replaced with [REDACTED_API_KEY]'
  );
});

test('aiAutofillFromCode validates required inputs', async () => {
  await assert.rejects(
    async () => {
      await aiAutofillFromCode({
        code: '',
        apiKey: 'test-key',
      });
    },
    /Code snippet cannot be empty/
  );
});

test('aiGenerateCommitMessage validates required inputs', async () => {
  await assert.rejects(
    async () => {
      await aiGenerateCommitMessage({
        currentCode: '',
        diffText: '',
        apiKey: 'test-key',
      });
    },
    /Current code or diff text must be provided/
  );
});

test('extractCodeBlocks handles raw and multiple fenced blocks with language aliases', async () => {
  const { extractCodeBlocks } = await import('./autofill');

  // Single raw block with fallback
  const raw = extractCodeBlocks('const x = 1;', 'TS');
  assert.strictEqual(raw.length, 1);
  assert.strictEqual(raw[0]?.language, 'TypeScript');
  assert.strictEqual(raw[0]?.code, 'const x = 1;');

  // Multiple fenced code blocks with case-insensitive aliases
  const multi = `
Here is some TypeScript:
\`\`\`TS
interface User { id: string }
\`\`\`
And here is some C++:
\`\`\`c++
int main() { return 0; }
\`\`\`
`;
  const blocks = extractCodeBlocks(multi);
  assert.strictEqual(blocks.length, 2);
  assert.strictEqual(blocks[0]?.language, 'TypeScript');
  assert.strictEqual(blocks[0]?.code, 'interface User { id: string }');
  assert.strictEqual(blocks[1]?.language, 'C++');
  assert.strictEqual(blocks[1]?.code, 'int main() { return 0; }');
});

test('cleanJsonResponse and parseAutofillResponse handle fences and malformed JSON safely', async () => {
  const { parseAutofillResponse, cleanJsonResponse } = await import('./autofill');

  const rawJsonWithNoise = `\`\`\`json\n{"hello": "world"}\n\`\`\``;
  assert.strictEqual(cleanJsonResponse(rawJsonWithNoise), '{"hello": "world"}');

  const wrappedJson = `\`\`\`json
{
  "title": "Sentinel Linear Search",
  "description": "Searches an unsorted array by placing a sentinel value at the end, eliminating loop bounds checking while retaining linear time complexity.",
  "explanation": {
    "headings": ["algorithmicApproach", "loopOptimization", "tradeoffsAndConstraints", "practicalUseCases"],
    "content": {
      "algorithmicApproach": "Appends target as sentinel to guarantee termination.",
      "loopOptimization": "Avoids index bounds checking inside the loop.",
      "tradeoffsAndConstraints": "Requires array mutation or temporary allocation.",
      "practicalUseCases": "Useful for tight inner loops in performance-critical C/C++ routines."
    }
  },
  "category": "Algorithms",
  "subcategory": "Searching",
  "tags": ["linear-search", "sentinel-search", "optimization"],
  "technology": ["C++", "cpp"],
  "usage": ["search", "optimization", "arrays"],
  "complexity": {
    "time": "O(n)",
    "space": "O(1)"
  }
}
\`\`\``;

  const result = parseAutofillResponse(wrappedJson);
  assert.strictEqual(result.title, 'Sentinel Linear Search');
  assert.strictEqual(result.category, 'Algorithms');
  assert.strictEqual(result.subcategory, 'Searching');
  // Technology canonicalized & deduplicated to C++
  assert.deepStrictEqual(result.technology, ['C++']);
  // Tags normalized
  assert.deepStrictEqual(result.tags, ['linear-search', 'sentinel-search', 'optimization']);
  // Usage tags normalized without sentences
  assert.deepStrictEqual(result.usage, ['search', 'optimization', 'arrays']);
  // Complexity preserved
  assert.deepStrictEqual(result.complexity, { time: 'O(n)', space: 'O(1)' });
  // Explanation has 4 camelCase headings
  assert.ok(result.explanation);
  assert.strictEqual(result.explanation?.headings.length, 4);
  assert.deepStrictEqual(result.explanation?.headings, [
    'algorithmicApproach',
    'loopOptimization',
    'tradeoffsAndConstraints',
    'practicalUseCases',
  ]);
  assert.strictEqual(
    result.explanation?.content.algorithmicApproach,
    'Appends target as sentinel to guarantee termination.'
  );
});

test('parseAutofillResponse normalizes technologies without automatically adding JavaScript to TypeScript', async () => {
  const { parseAutofillResponse } = await import('./autofill');

  const json = JSON.stringify({
    title: 'Custom React Hook',
    description: 'A reusable debounce hook managing timer lifecycle with cleanup.',
    explanation: {
      headings: ['componentLifecycle', "eventDebouncing", "memoryManagement", "stateConsistency"],
      content: {
        componentLifecycle: 'Manages timer on unmount.',
        eventDebouncing: 'Delays execution.',
        memoryManagement: 'Cleans up timers.',
        stateConsistency: 'Keeps latest state value.'
      }
    },
    category: 'Frontend',
    subcategory: 'Hooks',
    tags: ['react', 'debounce', 'custom-hook'],
    technology: ['TypeScript', 'React'],
    usage: ['debounce', 'forms', 'ui'],
  });

  const result = parseAutofillResponse(json);
  // Must contain TypeScript and React, but NOT JavaScript
  assert.ok(result.technology.includes('TypeScript'));
  assert.ok(result.technology.includes('React'));
  assert.strictEqual(result.technology.includes('JavaScript'), false);
});

test('normalizeUsage rejects sentences and retains 2-4 short lowercase metadata tags', async () => {
  const { normalizeUsage } = await import('./autofill');

  const sentenceLike = [
    'Used when searching through large collections of numbers efficiently.',
    'search',
    'optimization',
    'This is another full sentence explaining how to use it.',
    'algorithms',
    'arrays',
  ];

  const cleaned = normalizeUsage(sentenceLike);
  assert.deepStrictEqual(cleaned, ['search', 'optimization', 'algorithms', 'arrays']);
});
