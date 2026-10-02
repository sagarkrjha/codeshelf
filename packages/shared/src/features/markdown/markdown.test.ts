import test from 'node:test';
import assert from 'node:assert/strict';
import type { Snippet } from '../../models/models';
import {
  serializeSnippetToMarkdown,
  parseMarkdownToSnippet,
  extractAllCodeBlocks,
  parseFencedCodeBlocks,
  cleanCodeContent,
} from './markdown';

test('serializeSnippetToMarkdown and parseMarkdownToSnippet roundtrip correctly', () => {
  const original: Snippet = {
    id: 'snip-test-1',
    title: 'Merge Sort',
    description: 'Divides the array into two halves, sorts them and then merges them.',
    code: 'function mergeSort(arr: number[]): number[] { return arr; }',
    language: 'typescript',
    category: 'Algorithms',
    subcategory: 'Sorting',
    tags: ['sorting', 'divide-and-conquer'],
    technology: ['TypeScript'],
    usage: ['LeetCode'],
    complexity: {
      time: 'O(n log n)',
      space: 'O(n)',
    },
    version: 2,
    createdAt: '2026-09-24T10:00:00.000Z',
    updatedAt: '2026-09-24T11:00:00.000Z',
  };

  const md = serializeSnippetToMarkdown(original);
  assert.ok(md.includes('title: "Merge Sort"'));
  assert.ok(md.includes('```typescript'));
  assert.ok(md.includes('## Complexity'));

  const parsed = parseMarkdownToSnippet(md, 'snip-test-1');
  assert.equal(parsed.title, original.title);
  assert.equal(parsed.language, original.language);
  assert.equal(parsed.code, original.code);
  assert.equal(parsed.category, original.category);
  assert.equal(parsed.subcategory, original.subcategory);
  assert.deepEqual(parsed.tags, original.tags);
  assert.equal(parsed.complexity?.time, original.complexity?.time);
  assert.equal(parsed.complexity?.space, original.complexity?.space);
  assert.deepEqual(parsed.usage, original.usage);
  assert.equal(parsed.version, original.version);
});

test('parseMarkdownToSnippet parses Usage Context from markdown body', () => {
  const doc = `# LRU Cache

### Intuition
Evicts least recently used items.

### Usage Context
- **Context**: LeetCode, Interview
Ideal for fast in-memory caching.

## Implementation
\`\`\`typescript
function lru() {}
\`\`\`
`;

  const parsed = parseMarkdownToSnippet(doc, 'snip-lru');
  assert.deepEqual(parsed.usage, ['LeetCode', 'Interview']);
  assert.ok(parsed.description?.includes('### Usage Context'));
});

test('parseMarkdownToSnippet parses freeform Notion-style markdown document', () => {
  const notionMarkdown = `# Binary Search

Binary search works on sorted collections and runs in logarithmic time.
It checks the middle element repeatedly.

## Implementation

\`\`\`python
def binary_search(arr, target):
    l, r = 0, len(arr) - 1
    while l <= r:
        m = (l + r) // 2
        if arr[m] == target:
            return m
        elif arr[m] < target:
            l = m + 1
        else:
            r = m - 1
    return -1
\`\`\`

## Complexity
- **Time**: O(log n)
- **Space**: O(1)
`;

  const parsed = parseMarkdownToSnippet(notionMarkdown, 'snip-notion');
  assert.equal(parsed.title, 'Binary Search');
  assert.equal(parsed.language, 'python');
  assert.ok(parsed.code.includes('def binary_search'));
  assert.ok(parsed.description?.includes('Binary search works on sorted collections'));
  assert.equal(parsed.complexity?.time, 'O(log n)');
  assert.equal(parsed.complexity?.space, 'O(1)');
});

test('parseMarkdownToSnippet prioritizes edits made to body heading, code language, and complexity', () => {
  const baseSnippet: Snippet = {
    id: 'snip-edit-test',
    title: 'Initial Title',
    language: 'typescript',
    code: 'function initial() {}',
    category: 'Algorithms',
    subcategory: 'Search',
    tags: ['dsa', 'search'],
    complexity: { time: 'O(log n)', space: 'O(1)' },
    version: 1,
    createdAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
  };

  const serialized = serializeSnippetToMarkdown(baseSnippet);

  // Edit title in body
  let edited = serialized.replace('# Initial Title', '# Updated Title In-Place');
  // Edit language in code fence
  edited = edited.replace('```typescript', '```python');
  // Edit complexity in body
  edited = edited.replace('- **Time**: O(log n)', '- **Time**: O(1)');
  edited = edited.replace('- **Space**: O(1)', '- **Space**: O(log n)');
  // Edit tags without brackets in frontmatter
  edited = edited.replace('tags: ["dsa", "search"]', 'tags: binary-search, algorithms, divide-and-conquer');

  const parsed = parseMarkdownToSnippet(edited, 'snip-edit-test');
  assert.equal(parsed.title, 'Updated Title In-Place');
  assert.equal(parsed.language, 'python');
  assert.equal(parsed.complexity?.time, 'O(1)');
  assert.equal(parsed.complexity?.space, 'O(log n)');
  assert.deepEqual(parsed.tags, ['binary-search', 'algorithms', 'divide-and-conquer']);
});

test('parseMarkdownToSnippet and serializeSnippetToMarkdown preserve multiple code blocks in exact sequence', () => {
  const multiBlockDoc = `---
category: "Algorithms"
tags: ["binary-search"]
---

# Binary Search Variations

Here is the iterative approach:

\`\`\`typescript
function binarySearchIterative(arr: number[], target: number) {
  return 0;
}
\`\`\`

Here is the recursive approach:

\`\`\`python
def binary_search_recursive(arr, target):
    return 0
\`\`\`

Here are the test cases:

\`\`\`typescript
console.log(binarySearchIterative([1, 2, 3], 2));
\`\`\`
`;

  const parsed = parseMarkdownToSnippet(multiBlockDoc, 'snip-multi-1');
  assert.equal(parsed.title, 'Binary Search Variations');
  assert.equal(parsed.code, 'function binarySearchIterative(arr: number[], target: number) {\n  return 0;\n}');
  assert.equal(parsed.language, 'typescript');
  assert.equal(parsed.codeBlocks?.length, 3);
  assert.equal(parsed.codeBlocks?.[0]?.language, 'typescript');
  assert.equal(parsed.codeBlocks?.[1]?.language, 'python');
  assert.equal(parsed.codeBlocks?.[2]?.language, 'typescript');

  // Serialization must preserve original markdown without inverting or moving code blocks
  const serialized = serializeSnippetToMarkdown(parsed);
  assert.equal(serialized, multiBlockDoc);

  // Extract all code blocks helper
  const extracted = extractAllCodeBlocks(parsed);
  assert.equal(extracted.length, 3);
  assert.equal(extracted[0]?.name, 'Here is the iterative approach');
  assert.equal(extracted[1]?.name, 'Here is the recursive approach');
  assert.equal(extracted[2]?.name, 'Here are the test cases');
});

test('extractAllCodeBlocks correctly extracts every fenced code block and never treats headings like ## Implementation as code', () => {
  // 1. Fenced with various delimiters (backticks, tildes, languages with +, #, and meta attributes)
  const complexMarkdown = `# Multi-Language Snippet

## Implementation
\`\`\`c++ title="solution.cpp"
#include <iostream>
int main() { return 0; }
\`\`\`

### C# Solution
\`\`\`c#
Console.WriteLine("Hello");
\`\`\`

### Python with Tildes
~~~python   
print("Python tildes")
~~~
`;

  const blocks = extractAllCodeBlocks({ markdown: complexMarkdown });
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0]?.language, 'c++');
  assert.ok(blocks[0]?.code.includes('#include <iostream>'));
  assert.ok(!blocks[0]?.code.includes('## Implementation'), 'Heading must not be in code');
  assert.equal(blocks[0]?.name, 'Implementation');

  assert.equal(blocks[1]?.language, 'c#');
  assert.equal(blocks[1]?.code, 'Console.WriteLine("Hello");');
  assert.equal(blocks[1]?.name, 'C# Solution');

  assert.equal(blocks[2]?.language, 'python');
  assert.equal(blocks[2]?.code, 'print("Python tildes")');
  assert.equal(blocks[2]?.name, 'Python with Tildes');

  // 2. Never treats ## Implementation as code when snippet.code contains the heading
  const headingInCodeOnly = extractAllCodeBlocks({
    code: '## Implementation\n\n```typescript\nfunction solve() {\n  return 42;\n}\n```',
    language: 'typescript',
  });
  assert.equal(headingInCodeOnly.length, 1);
  assert.equal(headingInCodeOnly[0]?.code, 'function solve() {\n  return 42;\n}');
  assert.ok(!headingInCodeOnly[0]?.code.includes('## Implementation'));

  // 3. When snippet.code has ## Implementation followed by unfenced code
  const unfencedHeadingInCode = extractAllCodeBlocks({
    code: '## Implementation\nfunction solveDirect() {\n  return 100;\n}',
    language: 'typescript',
  });
  assert.equal(unfencedHeadingInCode.length, 1);
  assert.equal(unfencedHeadingInCode[0]?.code, 'function solveDirect() {\n  return 100;\n}');
  assert.ok(!unfencedHeadingInCode[0]?.code.includes('## Implementation'));

  // 4. When snippet.code is literally ONLY '## Implementation'
  const onlyHeading = extractAllCodeBlocks({
    code: '## Implementation',
    language: 'typescript',
  });
  assert.equal(onlyHeading.length, 0, 'Literal heading must never be treated as a code block');

  // 5. When snippet.codeBlocks contains an accidental heading
  const headingInBlocks = extractAllCodeBlocks({
    codeBlocks: [
      { code: '## Implementation', language: 'typescript' },
      { code: '## Implementation\nconsole.log("valid");', language: 'javascript', name: 'Example' },
    ],
  });
  assert.equal(headingInBlocks.length, 1);
  assert.equal(headingInBlocks[0]?.code, 'console.log("valid");');
  assert.equal(headingInBlocks[0]?.name, 'Example');
});

test('extractAllCodeBlocks extracts immediately adjacent fenced code blocks without blank lines', () => {
  const adjacentMd = `# Adjacent Blocks

\`\`\`typescript
const a = 1;
\`\`\`
\`\`\`python
b = 2
\`\`\`
\`\`\`rust
let c = 3;
\`\`\`
`;

  const blocks = extractAllCodeBlocks({ markdown: adjacentMd });
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0]?.language, 'typescript');
  assert.equal(blocks[0]?.code, 'const a = 1;');
  assert.equal(blocks[1]?.language, 'python');
  assert.equal(blocks[1]?.code, 'b = 2');
  assert.equal(blocks[2]?.language, 'rust');
  assert.equal(blocks[2]?.code, 'let c = 3;');
});

test('parseMarkdownToSnippet extracts clean description without code blocks or implementation headings for multi-block document', () => {
  const doc = `# Multi-Block Snippet

This is the snippet overview and description.

## Implementation 1
\`\`\`typescript
const x = 10;
\`\`\`

## Implementation 2
\`\`\`python
x = 20
\`\`\`

## Complexity
- **Time**: O(1)
- **Space**: O(1)
`;

  const parsed = parseMarkdownToSnippet(doc, 'snip-multi-desc');
  assert.equal(parsed.title, 'Multi-Block Snippet');
  assert.equal(parsed.description, 'This is the snippet overview and description.');
  assert.ok(!parsed.description.includes('const x = 10'));
  assert.ok(!parsed.description.includes('x = 20'));
  assert.ok(!parsed.description.includes('## Implementation'));
  assert.ok(!parsed.description.includes('## Complexity'));
  assert.equal(parsed.codeBlocks?.length, 2);
  assert.equal(parsed.complexity?.time, 'O(1)');
});

test('cleanCodeContent thoroughly strips accidental headings and wrappers', () => {
  assert.equal(cleanCodeContent('## Implementation'), '');
  assert.equal(cleanCodeContent('### Solution'), '');
  assert.equal(cleanCodeContent('## Approach'), '');
  assert.equal(cleanCodeContent('## Algorithm'), '');
  assert.equal(
    cleanCodeContent('## Implementation\n```python\nprint("hello")\n```'),
    'print("hello")'
  );
  assert.equal(
    cleanCodeContent('```python\n## Implementation\nprint("hello")\n```'),
    'print("hello")'
  );
  // Preserves legitimate python comments
  assert.equal(cleanCodeContent('# Normal comment\nprint(1)'), '# Normal comment\nprint(1)');
  assert.equal(cleanCodeContent('## Helper function\ndef helper(): pass'), '## Helper function\ndef helper(): pass');
});

test('parseFencedCodeBlocks handles tildes, c++, c#, and code block indices', () => {
  const text = `
~~~c++
int x = 1;
~~~
\`\`\`c#
int y = 2;
\`\`\`
`;
  const blocks = parseFencedCodeBlocks(text);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0]?.language, 'c++');
  assert.equal(blocks[0]?.code, 'int x = 1;');
  assert.equal(blocks[1]?.language, 'c#');
  assert.equal(blocks[1]?.code, 'int y = 2;');
});




