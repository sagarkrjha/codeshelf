import type { Snippet } from './models';

export const DEFAULT_TECHNOLOGIES = [
  'TypeScript',
  'JavaScript',
  'React',
  'Node',
  'Python',
  'C++',
  'Rust',
  'Go',
  'Java',
  'SQL',
  'HTML/CSS',
  'Shell/Bash',
] as const;

export const DEFAULT_DOMAINS = [
  'Algorithms',
  'Data Structures',
  'Frontend',
  'Backend',
  'Database',
  'DevOps',
  'System Design',
  'Networking',
  'Security',
  'Utilities',
] as const;

export const DEFAULT_USAGES = [
  'LeetCode',
  'Competitive Programming',
  'Interview',
  'Personal Project',
  'Production',
  'Learning/Reference',
] as const;

export const COMMON_LANGUAGE_EXTENSIONS: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  cpp: 'cpp',
  cc: 'cpp',
  c: 'c',
  rs: 'rust',
  go: 'go',
  java: 'java',
  sql: 'sql',
  sh: 'bash',
  json: 'json',
  md: 'markdown',
  html: 'html',
  css: 'css',
};

export const SEED_SNIPPETS: Snippet[] = [
  {
    id: 'snip-seed-1',
    title: 'Binary Search',
    description: 'Finds the index of a target value within a sorted array in logarithmic time.',
    code: `function binarySearch(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = Math.floor(left + (right - left) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}`,
    language: 'typescript',
    category: 'Algorithms',
    subcategory: 'Searching',
    tags: ['binary-search', 'array', 'logarithmic'],
    technology: ['TypeScript'],
    usage: ['LeetCode', 'Interview'],
    complexity: {
      time: 'O(log n)',
      space: 'O(1)',
    },
    version: 1,
    createdAt: '2026-09-24T12:00:00.000Z',
    updatedAt: '2026-09-24T12:00:00.000Z',
  },
  {
    id: 'snip-seed-2',
    title: 'useDebounce Hook',
    description: 'Debounces a rapidly changing value over a given delay period.',
    code: `import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}`,
    language: 'typescript',
    category: 'Frontend',
    subcategory: 'Hooks',
    tags: ['react', 'hook', 'debounce'],
    technology: ['React', 'TypeScript'],
    usage: ['Personal Project', 'Production'],
    complexity: {
      time: 'O(1)',
      space: 'O(1)',
    },
    version: 1,
    createdAt: '2026-09-24T12:00:00.000Z',
    updatedAt: '2026-09-24T12:00:00.000Z',
  },
];

