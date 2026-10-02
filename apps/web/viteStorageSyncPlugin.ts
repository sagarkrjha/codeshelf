import type { Plugin, Connect } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const STORAGE_DIR = path.join(os.homedir(), '.codeshelf');
const SNIPPETS_FILENAME = 'snippets.json';
const CONFIG_FILENAME = 'config.json';
const STORAGE_FILE = path.join(STORAGE_DIR, SNIPPETS_FILENAME);
const CONFIG_FILE = path.join(STORAGE_DIR, CONFIG_FILENAME);

const DEFAULT_CODESHELF_CONFIG = {
  version: 1,
  theme: 'dark' as const,
  autoSync: true,
  syncIntervalMs: 5000,
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
  },
  defaultLanguage: 'typescript',
  defaultCategory: 'Algorithms',
  customTechnologies: [] as string[],
  customCategories: [] as string[],
  customTags: [] as string[],
};

function ensureStorage(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    try {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    } catch {}
  }
  if (!fs.existsSync(CONFIG_FILE)) {
    try {
      const defaultStr = JSON.stringify(DEFAULT_CODESHELF_CONFIG, null, 2);
      fs.writeFileSync(CONFIG_FILE, defaultStr, 'utf-8');
    } catch {}
  }
}

function createStorageMiddleware(onSnippetsSaved?: (snippets: unknown[]) => void, onConfigSaved?: (config: unknown) => void): Connect.NextHandleFunction {
  let lastKnownSnippetsContent = '';
  let lastKnownConfigContent = '';

  return async (req, res, next) => {
    const url = req.url || '';
    if (!url.startsWith('/api/storage')) {
      return next();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Snippets Endpoint: /api/storage/snippets
    if (url.startsWith('/api/storage/snippets')) {
      if (req.method === 'GET') {
        try {
          if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
            lastKnownSnippetsContent = data;
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
          }
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }

      if (req.method === 'POST') {
        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk;
          }
          const snippets = JSON.parse(body);
          if (Array.isArray(snippets)) {
            ensureStorage();
            const formatted = JSON.stringify(snippets, null, 2);
            lastKnownSnippetsContent = formatted;
            fs.writeFileSync(STORAGE_FILE, formatted, 'utf-8');

            if (onSnippetsSaved) {
              onSnippetsSaved(snippets);
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, count: snippets.length }));
          } else {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Body must be an array of snippets' }));
          }
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }
    }

    // Config Endpoint: /api/storage/config
    if (url.startsWith('/api/storage/config')) {
      if (req.method === 'GET') {
        try {
          ensureStorage();
          if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            lastKnownConfigContent = data;
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(DEFAULT_CODESHELF_CONFIG, null, 2));
          }
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }

      if (req.method === 'POST') {
        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk;
          }
          const incoming = JSON.parse(body);
          ensureStorage();

          let currentConfig: any = DEFAULT_CODESHELF_CONFIG;
          if (fs.existsSync(CONFIG_FILE)) {
            try {
              currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            } catch {}
          }

          const merged = {
            ...currentConfig,
            ...incoming,
            editor: {
              ...currentConfig.editor,
              ...(incoming?.editor || {}),
            },
          };
          const formatted = JSON.stringify(merged, null, 2);
          lastKnownConfigContent = formatted;
          fs.writeFileSync(CONFIG_FILE, formatted, 'utf-8');

          if (onConfigSaved) {
            onConfigSaved(merged);
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, config: merged }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }
    }

    next();
  };
}

export function codeShelfStorageSyncPlugin(): Plugin {
  return {
    name: 'codeshelf-storage-sync',

    // Configure development server (pnpm run web:dev)
    configureServer(server) {
      ensureStorage();

      let lastKnownSnippetsContent = '';
      let lastKnownConfigContent = '';
      let debounceSnippetsTimer: NodeJS.Timeout | null = null;
      let debounceConfigTimer: NodeJS.Timeout | null = null;

      try {
        const watcher = fs.watch(STORAGE_DIR, (_eventType, filename) => {
          if (!filename || filename === SNIPPETS_FILENAME) {
            if (debounceSnippetsTimer) clearTimeout(debounceSnippetsTimer);
            debounceSnippetsTimer = setTimeout(() => {
              if (!fs.existsSync(STORAGE_FILE)) return;
              try {
                const currentData = fs.readFileSync(STORAGE_FILE, 'utf-8');
                if (currentData !== lastKnownSnippetsContent) {
                  lastKnownSnippetsContent = currentData;
                  const snippets = JSON.parse(currentData);
                  if (Array.isArray(snippets)) {
                    server.ws.send({
                      type: 'custom',
                      event: 'codeshelf:snippets-changed',
                      data: snippets,
                    });
                  }
                }
              } catch (err) {
                console.error('[CodeShelf Sync] Error reading snippets on change:', err);
              }
            }, 100);
          }

          if (!filename || filename === CONFIG_FILENAME) {
            if (debounceConfigTimer) clearTimeout(debounceConfigTimer);
            debounceConfigTimer = setTimeout(() => {
              if (!fs.existsSync(CONFIG_FILE)) return;
              try {
                const currentData = fs.readFileSync(CONFIG_FILE, 'utf-8');
                if (currentData !== lastKnownConfigContent) {
                  lastKnownConfigContent = currentData;
                  const config = JSON.parse(currentData);
                  server.ws.send({
                    type: 'custom',
                    event: 'codeshelf:config-changed',
                    data: config,
                  });
                }
              } catch (err) {
                console.error('[CodeShelf Sync] Error reading config on change:', err);
              }
            }, 100);
          }
        });

        server.httpServer?.on('close', () => {
          if (debounceSnippetsTimer) clearTimeout(debounceSnippetsTimer);
          if (debounceConfigTimer) clearTimeout(debounceConfigTimer);
          watcher.close();
        });
      } catch (err) {
        console.warn('[CodeShelf Sync] Failed to setup file watcher:', err);
      }

      // Attach middlewares for /api/storage/*
      server.middlewares.use(
        createStorageMiddleware(
          (snippets) => {
            server.ws.send({
              type: 'custom',
              event: 'codeshelf:snippets-changed',
              data: snippets,
            });
          },
          (config) => {
            server.ws.send({
              type: 'custom',
              event: 'codeshelf:config-changed',
              data: config,
            });
          }
        )
      );
    },

    // Configure preview server (pnpm run web:preview)
    configurePreviewServer(server) {
      ensureStorage();
      server.middlewares.use(createStorageMiddleware());
    },
  };
}
