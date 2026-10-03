import type { Plugin, Connect } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Snippet, CodeShelfConfig } from '@codeshelf/shared';

const CODESHELF_DIR_NAME = '.codeshelf';
const CODESHELF_PRIMARY_SNIPPET_FILENAME = 'snippets.json';
const CODESHELF_CONFIG_FILENAME = 'config.json';

const STORAGE_DIR = path.join(os.homedir(), CODESHELF_DIR_NAME);
const PRIMARY_SNIPPET_FILE = path.join(STORAGE_DIR, CODESHELF_PRIMARY_SNIPPET_FILENAME);
const CONFIG_FILE = path.join(STORAGE_DIR, CODESHELF_CONFIG_FILENAME);

const DEFAULT_CODESHELF_CONFIG: CodeShelfConfig = {
  version: 1,
  theme: 'dark',
  autoSync: true,
  syncIntervalMs: 5000,
  geminiModel: 'gemini-3.8-flash',
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
  },
  defaultLanguage: 'typescript',
  defaultCategory: 'Algorithms',
  customTechnologies: [],
  customCategories: [],
  customTags: [],
  permissions: {
    fileSystemAccess: 'granted',
    directoryName: '.codeshelf',
    autoSyncFileSystem: true,
  },
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

function mergeSnippetsInternal(baseSnippets: Snippet[], incomingSnippets: Snippet[]): Snippet[] {
  const map = new Map<string, Snippet>();
  baseSnippets.forEach((s) => {
    if (s.id) map.set(s.id, s);
  });

  for (const incoming of incomingSnippets) {
    if (!incoming.id || !incoming.title) continue;

    if (!map.has(incoming.id)) {
      map.set(incoming.id, incoming);
    } else {
      const existing = map.get(incoming.id)!;
      const existingUpdated = new Date(existing.updatedAt).getTime();
      const incomingUpdated = new Date(incoming.updatedAt).getTime();

      if (incomingUpdated >= existingUpdated) {
        const combinedHistory = [
          ...(incoming.history || []),
          ...(existing.history || []),
        ].filter(
          (rev, idx, arr) => arr.findIndex((r) => r.version === rev.version) === idx
        );

        map.set(incoming.id, {
          ...incoming,
          history: combinedHistory,
        });
      } else {
        const combinedHistory = [
          ...(existing.history || []),
          ...(incoming.history || []),
        ].filter(
          (rev, idx, arr) => arr.findIndex((r) => r.version === rev.version) === idx
        );

        map.set(incoming.id, {
          ...existing,
          history: combinedHistory,
        });
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function validateConfigInternal(input: unknown): CodeShelfConfig {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_CODESHELF_CONFIG };
  }
  const raw = input as Record<string, unknown>;
  const theme =
    raw.theme === 'light' || raw.theme === 'system' || raw.theme === 'dark'
      ? raw.theme
      : DEFAULT_CODESHELF_CONFIG.theme;

  const editorRaw = (raw.editor && typeof raw.editor === 'object' ? raw.editor : {}) as Record<string, unknown>;
  const editor = {
    fontSize: typeof editorRaw.fontSize === 'number' && editorRaw.fontSize > 0
      ? editorRaw.fontSize
      : DEFAULT_CODESHELF_CONFIG.editor?.fontSize,
    tabSize: typeof editorRaw.tabSize === 'number' && editorRaw.tabSize > 0
      ? editorRaw.tabSize
      : DEFAULT_CODESHELF_CONFIG.editor?.tabSize,
    wordWrap: typeof editorRaw.wordWrap === 'boolean'
      ? editorRaw.wordWrap
      : DEFAULT_CODESHELF_CONFIG.editor?.wordWrap,
  };

  const toStringArray = (arr: unknown): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  };

  const permissionsRaw = (raw.permissions && typeof raw.permissions === 'object' ? raw.permissions : {}) as Record<string, unknown>;
  const permissions = {
    fileSystemAccess:
      permissionsRaw.fileSystemAccess === 'granted' ||
      permissionsRaw.fileSystemAccess === 'prompt' ||
      permissionsRaw.fileSystemAccess === 'denied'
        ? permissionsRaw.fileSystemAccess
        : DEFAULT_CODESHELF_CONFIG.permissions?.fileSystemAccess,
    directoryName:
      typeof permissionsRaw.directoryName === 'string' && permissionsRaw.directoryName.trim().length > 0
        ? permissionsRaw.directoryName.trim()
        : DEFAULT_CODESHELF_CONFIG.permissions?.directoryName,
    autoSyncFileSystem:
      typeof permissionsRaw.autoSyncFileSystem === 'boolean'
        ? permissionsRaw.autoSyncFileSystem
        : true,
    lastGrantedAt:
      typeof permissionsRaw.lastGrantedAt === 'string' && permissionsRaw.lastGrantedAt.trim().length > 0
        ? permissionsRaw.lastGrantedAt.trim()
        : undefined,
  };

  return {
    version: typeof raw.version === 'number' ? raw.version : 1,
    theme,
    autoSync: typeof raw.autoSync === 'boolean' ? raw.autoSync : true,
    syncIntervalMs: typeof raw.syncIntervalMs === 'number' && raw.syncIntervalMs >= 1000 ? raw.syncIntervalMs : 5000,
    geminiApiKey: typeof raw.geminiApiKey === 'string' && raw.geminiApiKey.trim().length > 0 ? raw.geminiApiKey.trim() : undefined,
    geminiModel: typeof raw.geminiModel === 'string' && raw.geminiModel.trim().length > 0 ? raw.geminiModel.trim() : 'gemini-3.8-flash',
    editor,
    defaultLanguage: typeof raw.defaultLanguage === 'string' ? raw.defaultLanguage : 'typescript',
    defaultCategory: typeof raw.defaultCategory === 'string' ? raw.defaultCategory : 'Algorithms',
    customTechnologies: toStringArray(raw.customTechnologies),
    customCategories: toStringArray(raw.customCategories),
    customTags: toStringArray(raw.customTags),
    permissions,
  };
}

function mergeConfigInternal(base: CodeShelfConfig, incoming: Partial<CodeShelfConfig>): CodeShelfConfig {
  const merged: CodeShelfConfig = {
    ...base,
    ...incoming,
    geminiApiKey:
      incoming.geminiApiKey !== undefined
        ? (incoming.geminiApiKey ? incoming.geminiApiKey.trim() : undefined)
        : base.geminiApiKey,
    geminiModel:
      incoming.geminiModel !== undefined
        ? (incoming.geminiModel ? incoming.geminiModel.trim() : undefined)
        : base.geminiModel,
    editor: {
      ...base.editor,
      ...(incoming.editor || {}),
    },
    customTechnologies: Array.from(
      new Set([...(base.customTechnologies || []), ...(incoming.customTechnologies || [])])
    ),
    customCategories: Array.from(
      new Set([...(base.customCategories || []), ...(incoming.customCategories || [])])
    ),
    customTags: Array.from(
      new Set([...(base.customTags || []), ...(incoming.customTags || [])])
    ),
    permissions: {
      ...base.permissions,
      ...(incoming.permissions || {}),
    },
  };

  return validateConfigInternal(merged);
}

/**
 * Reads snippets from disk directly from snippets.json.
 */
function readSnippetsFromDisk(): Snippet[] {
  ensureStorage();

  if (fs.existsSync(PRIMARY_SNIPPET_FILE)) {
    try {
      const data = fs.readFileSync(PRIMARY_SNIPPET_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {
      console.error('[CodeShelf Sync] Failed to parse snippets.json:', err);
    }
  }

  return [];
}

/**
 * Safely writes snippets to disk by merging with any existing disk state first,
 * preventing race conditions or accidental overwrites.
 * Writes directly to snippets.json.
 */
function writeSnippetsToDisk(incoming: Snippet[]): Snippet[] {
  ensureStorage();
  const diskSnippets = readSnippetsFromDisk();
  const merged = mergeSnippetsInternal(diskSnippets, incoming);
  const formatted = JSON.stringify(merged, null, 2);

  // Write to snippets.json (single source of truth for snippets)
  fs.writeFileSync(PRIMARY_SNIPPET_FILE, formatted, 'utf-8');

  return merged;
}

/**
 * Reads config.json from disk, falling back to validated defaults.
 */
function readConfigFromDisk(): CodeShelfConfig {
  ensureStorage();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return validateConfigInternal(JSON.parse(data));
    } catch (err) {
      console.error('[CodeShelf Sync] Failed to read config.json:', err);
    }
  }
  return { ...DEFAULT_CODESHELF_CONFIG };
}

/**
 * Writes config.json to disk after merging with current state.
 */
function writeConfigToDisk(incoming: Partial<CodeShelfConfig>): CodeShelfConfig {
  ensureStorage();
  const current = readConfigFromDisk();
  const merged = mergeConfigInternal(current, incoming);
  const formatted = JSON.stringify(merged, null, 2);
  fs.writeFileSync(CONFIG_FILE, formatted, 'utf-8');
  return merged;
}

function createStorageMiddleware(
  onSnippetsSaved?: (snippets: Snippet[]) => void,
  onConfigSaved?: (config: CodeShelfConfig) => void
): Connect.NextHandleFunction {
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
          const snippets = readSnippetsFromDisk();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(snippets));
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
          if (Array.isArray(incoming)) {
            const merged = writeSnippetsToDisk(incoming);
            if (onSnippetsSaved) {
              onSnippetsSaved(merged);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, count: merged.length, snippets: merged }));
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
          const config = readConfigFromDisk();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(config, null, 2));
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
          const merged = writeConfigToDisk(incoming);
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
          if (!filename || filename === CODESHELF_PRIMARY_SNIPPET_FILENAME) {
            if (debounceSnippetsTimer) clearTimeout(debounceSnippetsTimer);
            debounceSnippetsTimer = setTimeout(() => {
              try {
                const snippets = readSnippetsFromDisk();
                const serialized = JSON.stringify(snippets);
                if (serialized !== lastKnownSnippetsContent) {
                  lastKnownSnippetsContent = serialized;
                  server.ws.send({
                    type: 'custom',
                    event: 'codeshelf:snippets-changed',
                    data: snippets,
                  });
                }
              } catch (err) {
                console.error('[CodeShelf Sync] Error reading snippets on change:', err);
              }
            }, 100);
          }

          if (!filename || filename === CODESHELF_CONFIG_FILENAME) {
            if (debounceConfigTimer) clearTimeout(debounceConfigTimer);
            debounceConfigTimer = setTimeout(() => {
              if (!fs.existsSync(CONFIG_FILE)) return;
              try {
                const currentData = fs.readFileSync(CONFIG_FILE, 'utf-8');
                if (currentData !== lastKnownConfigContent) {
                  lastKnownConfigContent = currentData;
                  const config = validateConfigInternal(JSON.parse(currentData));
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
