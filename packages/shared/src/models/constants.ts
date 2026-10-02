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

export const SEED_SNIPPETS: Snippet[] = [];

