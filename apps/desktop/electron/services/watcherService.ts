import fs from 'node:fs';
import type { BrowserWindow } from 'electron';
import {
  validateConfig,
  CODESHELF_PRIMARY_SNIPPET_FILENAME,
  CODESHELF_CONFIG_FILENAME,
} from '@codeshelf/shared';
import { STORAGE_DIR, CONFIG_FILE, IPC_CHANNELS } from '../constants';
import {
  ensureStorageDir,
  readConfigFile,
  readSnippetsFromFile,
  getLastKnownSnippetsContent,
  setLastKnownSnippetsContent,
  getLastKnownConfigContent,
  setLastKnownConfigContent,
} from './storageService';

export function setupStorageWatcher(win: BrowserWindow): () => void {
  ensureStorageDir();
  readConfigFile(); // Ensures config.json is created on initial launch if not present

  let debounceSnippetsTimer: ReturnType<typeof setTimeout> | null = null;
  let debounceConfigTimer: ReturnType<typeof setTimeout> | null = null;
  let watcher: fs.FSWatcher | null = null;

  try {
    watcher = fs.watch(STORAGE_DIR, (_eventType, filename) => {
      if (!filename || filename === CODESHELF_PRIMARY_SNIPPET_FILENAME) {
        if (debounceSnippetsTimer) clearTimeout(debounceSnippetsTimer);
        debounceSnippetsTimer = setTimeout(() => {
          try {
            const snippets = readSnippetsFromFile();
            if (snippets && Array.isArray(snippets) && !win.isDestroyed()) {
              const serialized = JSON.stringify(snippets);
              if (serialized !== getLastKnownSnippetsContent()) {
                setLastKnownSnippetsContent(serialized);
                win.webContents.send(IPC_CHANNELS.SNIPPETS_CHANGED, snippets);
              }
            }
          } catch (err) {
            console.error('Error handling external snippets file change:', err);
          }
        }, 100);
      }

      if (!filename || filename === CODESHELF_CONFIG_FILENAME) {
        if (debounceConfigTimer) clearTimeout(debounceConfigTimer);
        debounceConfigTimer = setTimeout(() => {
          if (!fs.existsSync(CONFIG_FILE)) return;
          try {
            const currentData = fs.readFileSync(CONFIG_FILE, 'utf-8');
            if (currentData !== getLastKnownConfigContent()) {
              setLastKnownConfigContent(currentData);
              const config = validateConfig(JSON.parse(currentData));
              if (!win.isDestroyed()) {
                win.webContents.send(IPC_CHANNELS.CONFIG_CHANGED, config);
              }
            }
          } catch (err) {
            console.error('Error handling external config file change:', err);
          }
        }, 100);
      }
    });
  } catch (err) {
    console.error('Failed to setup storage file watcher:', err);
  }

  const cleanup = () => {
    if (debounceSnippetsTimer) clearTimeout(debounceSnippetsTimer);
    if (debounceConfigTimer) clearTimeout(debounceConfigTimer);
    if (watcher) {
      watcher.close();
      watcher = null;
    }
  };

  win.on('closed', cleanup);
  return cleanup;
}
