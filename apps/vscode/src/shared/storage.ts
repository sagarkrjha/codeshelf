import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Snippet, CodeShelfConfig } from '@codeshelf/shared';
import {
  SEED_SNIPPETS,
  CODESHELF_DIR_NAME,
  CODESHELF_PRIMARY_SNIPPET_FILENAME,
  CODESHELF_CONFIG_FILENAME,
  DEFAULT_CODESHELF_CONFIG,
  validateConfig,
  mergeConfig,
  mergeSnippets,
} from '@codeshelf/shared';

export const CODESHELF_DIR = path.join(os.homedir(), CODESHELF_DIR_NAME);
export const PRIMARY_SNIPPETS_FILE = path.join(CODESHELF_DIR, CODESHELF_PRIMARY_SNIPPET_FILENAME);
export const SNIPPETS_FILE = PRIMARY_SNIPPETS_FILE;
export const CONFIG_FILE = path.join(CODESHELF_DIR, CODESHELF_CONFIG_FILENAME);

export function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export class SnippetsStorage {
  private lastKnownFileContent = '';
  private lastKnownConfigContent = '';

  constructor(_context?: vscode.ExtensionContext) {}

  public getSnippets = (): Snippet[] => {
    try {
      if (fs.existsSync(PRIMARY_SNIPPETS_FILE)) {
        const raw = fs.readFileSync(PRIMARY_SNIPPETS_FILE, 'utf-8');
        this.lastKnownFileContent = raw;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('CodeShelf: Error reading snippets.json:', err);
    }

    // Default seed snippets if brand new and file does not exist
    try {
      ensureDirExists(CODESHELF_DIR);
      const data = JSON.stringify(SEED_SNIPPETS, null, 2);
      this.lastKnownFileContent = data;
      fs.writeFileSync(PRIMARY_SNIPPETS_FILE, data, 'utf-8');
      return SEED_SNIPPETS;
    } catch (err) {
      console.error('CodeShelf: Error creating seed snippets:', err);
    }

    return [];
  };

  public saveSnippets = async (snippets: Snippet[]): Promise<void> => {
    try {
      ensureDirExists(CODESHELF_DIR);
      // Conflict-free merge with disk to avoid race conditions across Web, Desktop, and VS Code
      const diskSnippets = this.getSnippets();
      const finalSnippets = diskSnippets.length > 0 ? mergeSnippets(diskSnippets, snippets).merged : snippets;

      const data = JSON.stringify(finalSnippets, null, 2);
      this.lastKnownFileContent = data;

      // Primary source of truth: snippets.json
      fs.writeFileSync(PRIMARY_SNIPPETS_FILE, data, 'utf-8');
    } catch (err) {
      console.error('CodeShelf: Error writing snippets.json file:', err);
    }
  };

  public getConfig = (): CodeShelfConfig => {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.lastKnownConfigContent = raw;
        return validateConfig(JSON.parse(raw));
      }
    } catch (err) {
      console.error('CodeShelf: Error reading config file:', err);
    }

    // If config doesn't exist, create default config file
    try {
      ensureDirExists(CODESHELF_DIR);
      const defaultStr = JSON.stringify(DEFAULT_CODESHELF_CONFIG, null, 2);
      this.lastKnownConfigContent = defaultStr;
      fs.writeFileSync(CONFIG_FILE, defaultStr, 'utf-8');
    } catch (err) {
      console.error('CodeShelf: Error initializing config file:', err);
    }

    return { ...DEFAULT_CODESHELF_CONFIG };
  };

  public saveConfig = async (incoming: Partial<CodeShelfConfig>): Promise<CodeShelfConfig> => {
    try {
      ensureDirExists(CODESHELF_DIR);
      const current = this.getConfig();
      const merged = mergeConfig(current, incoming);
      const data = JSON.stringify(merged, null, 2);
      this.lastKnownConfigContent = data;
      fs.writeFileSync(CONFIG_FILE, data, 'utf-8');
      return merged;
    } catch (err) {
      console.error('CodeShelf: Error saving config file:', err);
      const current = this.getConfig();
      return mergeConfig(current, incoming);
    }
  };

  public getLastKnownContent(): string {
    return this.lastKnownFileContent;
  }

  public setLastKnownContent(content: string) {
    this.lastKnownFileContent = content;
  }

  public getLastKnownConfigContent(): string {
    return this.lastKnownConfigContent;
  }

  public setLastKnownConfigContent(content: string) {
    this.lastKnownConfigContent = content;
  }
}
