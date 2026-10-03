import fs from 'node:fs';
import {
  type Snippet,
  type CodeShelfConfig,
  DEFAULT_CODESHELF_CONFIG,
  validateConfig,
  mergeConfig,
} from '@codeshelf/shared';
import { STORAGE_DIR, PRIMARY_STORAGE_FILE, CONFIG_FILE } from '../constants';

let lastKnownSnippetsContent = '';
let lastKnownConfigContent = '';

export function getLastKnownSnippetsContent(): string {
  return lastKnownSnippetsContent;
}

export function setLastKnownSnippetsContent(content: string): void {
  lastKnownSnippetsContent = content;
}

export function getLastKnownConfigContent(): string {
  return lastKnownConfigContent;
}

export function setLastKnownConfigContent(content: string): void {
  lastKnownConfigContent = content;
}

export function ensureStorageDir(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export function readConfigFile(): CodeShelfConfig {
  ensureStorageDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    try {
      const defaultStr = JSON.stringify(DEFAULT_CODESHELF_CONFIG, null, 2);
      fs.writeFileSync(CONFIG_FILE, defaultStr, 'utf-8');
      lastKnownConfigContent = defaultStr;
    } catch (err) {
      console.error('Failed to create default config file:', err);
    }
    return { ...DEFAULT_CODESHELF_CONFIG };
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    lastKnownConfigContent = raw;
    const parsed = JSON.parse(raw);
    return validateConfig(parsed);
  } catch (err) {
    console.error('Failed to read config file:', err);
    return { ...DEFAULT_CODESHELF_CONFIG };
  }
}

export function writeConfigFile(incomingConfig: Partial<CodeShelfConfig>): boolean {
  ensureStorageDir();
  try {
    const current = readConfigFile();
    const merged = mergeConfig(current, incomingConfig);
    const data = JSON.stringify(merged, null, 2);
    lastKnownConfigContent = data;
    fs.writeFileSync(CONFIG_FILE, data, 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write config file:', err);
    return false;
  }
}

export function readSnippetsFromFile(): Snippet[] | null {
  ensureStorageDir();

  if (fs.existsSync(PRIMARY_STORAGE_FILE)) {
    try {
      const data = fs.readFileSync(PRIMARY_STORAGE_FILE, 'utf-8');
      lastKnownSnippetsContent = data;
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {
      console.error('Failed to read snippets.json:', err);
    }
  }

  return null;
}

/**
 * Writes snippets directly to snippets.json.
 * Does NOT perform union merge so snippet deletions and edits persist cleanly.
 */
export function writeSnippetsToFile(snippets: Snippet[]): boolean {
  ensureStorageDir();
  try {
    const data = JSON.stringify(snippets, null, 2);
    lastKnownSnippetsContent = data;
    fs.writeFileSync(PRIMARY_STORAGE_FILE, data, 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write snippets file:', err);
    return false;
  }
}
