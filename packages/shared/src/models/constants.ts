import type { Snippet } from './models';

export const DEFAULT_TECHNOLOGIES: readonly string[] = [];

export const DEFAULT_DOMAINS: readonly string[] = [];

export const DEFAULT_USAGES: readonly string[] = [];

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

