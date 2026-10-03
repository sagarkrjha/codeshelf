import type {
  Snippet,
  CreateSnippetInput,
  UpdateSnippetInput,
  SnippetRevision,
  CodeShelfConfig,
} from '@codeshelf/shared';
import {
  SEED_SNIPPETS,
  CODESHELF_SYNC_CHANNEL,
  CODESHELF_STORAGE_KEY,
  CODESHELF_CONFIG_KEY,
  DEFAULT_CODESHELF_CONFIG,
  normalizeSnippetVersion,
  hasSnippetMarkdownChanged,
  serializeSnippetToMarkdown,
  parseMarkdownToSnippet,
  computeSnippetHash,
  validateConfig,
  mergeConfig,
  mergeSnippets,
} from '@codeshelf/shared';
import {
  isFileSystemAccessSupported,
  readSnippetsFromFS,
  writeSnippetsToFS,
  readConfigFromFS,
  writeConfigToFS,
} from './fileSystemStorage';

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Fast synchronous access layer, kept in sync with .codeshelf/config.json
// and snippets.json.

let _snippetsCache: Snippet[] | null = null;
let _configCache: CodeShelfConfig | null = null;

// ─── BroadcastChannel (multi-tab sync) ───────────────────────────────────────

let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel(CODESHELF_SYNC_CHANNEL);
  } catch (err) {
    console.warn('[CodeShelf Storage] BroadcastChannel not supported:', err);
  }
}

// ─── Safe LocalStorage helpers (STRICT PRIVACY GUARANTEE) ────────────────────
// NOTE: User's Gemini API key is NEVER stored in localStorage.
// It is stored exclusively in .codeshelf/config.json (on filesystem) and runtime memory.

function sanitizeAndSaveConfigToLocalStorage(config: CodeShelfConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const safeConfig = { ...config };
    delete safeConfig.geminiApiKey; // STRICT: never store API key in localStorage
    localStorage.setItem(CODESHELF_CONFIG_KEY, JSON.stringify(safeConfig));
  } catch {}
}

// Background eagerly hydrate _configCache if in browser environment
if (typeof window !== 'undefined' && !window.codeshelfApi && typeof fetch !== 'undefined') {
  fetch('/api/storage/config')
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && typeof data === 'object') {
        const validated = validateConfig(data);
        _configCache = validated;
        sanitizeAndSaveConfigToLocalStorage(validated);
      }
    })
    .catch(() => {});
}

function purgeApiKeyFromLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = localStorage.getItem(CODESHELF_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.geminiApiKey) {
        delete parsed.geminiApiKey;
        localStorage.setItem(CODESHELF_CONFIG_KEY, JSON.stringify(parsed));
      }
    }
  } catch {}
}

purgeApiKeyFromLocalStorage();

// ─── Snippets ─────────────────────────────────────────────────────────────────

/**
 * Returns the current in-memory snippet cache synchronously.
 * Survives reloads and offline state via localStorage cache,
 * then background synchronizes with snippets.json.
 */
export function getLocalSnippets(): Snippet[] {
  // 1. Electron Desktop (synchronous IPC)
  if (typeof window !== 'undefined' && window.codeshelfApi) {
    try {
      const fileSnippets = window.codeshelfApi.getSnippets();
      if (fileSnippets && Array.isArray(fileSnippets)) {
        const normalized = (fileSnippets as Snippet[]).map(normalizeSnippetVersion);
        _snippetsCache = normalized;
        return normalized;
      }
    } catch (err) {
      console.error('[CodeShelf Storage] Failed to load snippets via codeshelfApi:', err);
    }
  }

  // 2. Return in-memory cache if already hydrated
  if (_snippetsCache !== null) {
    return _snippetsCache;
  }

  // 3. Check localStorage cache to avoid flashing seeds on page refresh
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(CODESHELF_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = (parsed as Snippet[]).map(normalizeSnippetVersion);
          _snippetsCache = normalized;
          return normalized;
        }
      }
    } catch {}
  }

  // 4. Default seeds as baseline before async storage loads real file data
  const seeds = SEED_SNIPPETS.map(normalizeSnippetVersion);
  _snippetsCache = seeds;
  return seeds;
}

/**
 * Reads snippets from snippets.json via FS Access API
 * and safely merges with local cache without losing data.
 */
export async function refreshSnippetsFromFS(
  onRefreshed?: (snippets: Snippet[]) => void
): Promise<Snippet[] | null> {
  if (typeof window !== 'undefined' && window.codeshelfApi) return null;
  if (!isFileSystemAccessSupported()) return null;

  try {
    const fsSnippets = await readSnippetsFromFS();
    if (!fsSnippets) return null;

    const current = _snippetsCache || [];
    const { merged } = mergeSnippets(current, fsSnippets);
    const normalized = merged.map(normalizeSnippetVersion);

    _snippetsCache = normalized;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(CODESHELF_STORAGE_KEY, JSON.stringify(normalized));
      } catch {}
    }

    onRefreshed?.(normalized);
    return normalized;
  } catch (err) {
    console.error('[CodeShelf Storage] Failed to refresh snippets from FS:', err);
    return null;
  }
}

/**
 * Persists snippets to the file system and updates the in-memory cache.
 *
 * Conflict safety:
 * 1. Electron Desktop  → IPC merges with ~/.codeshelf/snippets.json
 * 2. Web (FS API)      → writeSnippetsToFS merges with disk before writing
 * 3. Web (API server)  → POST /api/storage/snippets merges with disk before writing
 */
export function saveLocalSnippets(snippets: Snippet[]): void {
  const normalized = snippets.map(normalizeSnippetVersion);

  // Update in-memory cache
  _snippetsCache = normalized;

  // Persist to localStorage cache for offline/instant refresh
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(CODESHELF_STORAGE_KEY, JSON.stringify(normalized));
    } catch {}
  }

  // Multi-tab broadcast
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'sync', snippets: normalized });
    } catch (err) {
      console.warn('[CodeShelf Storage] Failed to broadcast snippets update:', err);
    }
  }

  // 1. Electron Desktop (synchronous IPC)
  if (typeof window !== 'undefined' && window.codeshelfApi) {
    try {
      window.codeshelfApi.saveSnippets(normalized);
      return;
    } catch (err) {
      console.error('[CodeShelf Storage] Failed to save snippets via codeshelfApi:', err);
    }
  }

  // 2. File System Access API → snippets.json (async, conflict-free merge)
  if (isFileSystemAccessSupported()) {
    writeSnippetsToFS(normalized).catch((err) => {
      console.error('[CodeShelf Storage] Failed to write snippets.json via FS API:', err);
    });
  }

  // 3. Server storage endpoint — keeps ~/.codeshelf/snippets.json in sync bidirectionally
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    fetch('/api/storage/snippets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.snippets && Array.isArray(data.snippets)) {
          const serverMerged = data.snippets.map(normalizeSnippetVersion);
          _snippetsCache = serverMerged;
        }
      })
      .catch(() => {
        // Static / offline environment — handled gracefully
      });
  }
}

/**
 * Subscribes to snippet updates from all environments and triggers initial
 * bidirectional sync from snippets.json on startup.
 */
export function subscribeToSnippetChanges(callback: (snippets: Snippet[]) => void): () => void {
  const disposers: Array<() => void> = [];

  // Helper to safely update in-memory cache and notify subscriber
  const updateAndNotify = (incoming: Snippet[]) => {
    const normalized = incoming.map(normalizeSnippetVersion);
    _snippetsCache = normalized;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(CODESHELF_STORAGE_KEY, JSON.stringify(normalized));
      } catch {}
    }
    callback(normalized);
  };

  // 1. Electron IPC file watcher
  if (typeof window !== 'undefined' && window.codeshelfApi?.onSnippetsChanged) {
    const unsub = window.codeshelfApi.onSnippetsChanged((updated) => {
      updateAndNotify(updated);
    });
    disposers.push(unsub);
  }

  // 2. Vite Dev Server HMR (Disk change → Web browser bridge)
  if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
    const hot = (import.meta as any).hot;
    const hmrHandler = (data: Snippet[]) => {
      if (Array.isArray(data)) {
        updateAndNotify(data);
      }
    };
    hot.on('codeshelf:snippets-changed', hmrHandler);
    disposers.push(() => hot.off('codeshelf:snippets-changed', hmrHandler));
  }

  // 3. Multi-tab BroadcastChannel
  if (syncChannel) {
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'sync' && Array.isArray(event.data.snippets)) {
        updateAndNotify(event.data.snippets as Snippet[]);
      }
    };
    syncChannel.addEventListener('message', messageHandler);
    disposers.push(() => syncChannel?.removeEventListener('message', messageHandler));
  }

  if (typeof window !== 'undefined') {
    // 4. Server API fetch on startup (loads ~/.codeshelf/snippets.json immediately)
    if (typeof fetch !== 'undefined' && !window.codeshelfApi) {
      fetch('/api/storage/snippets')
        .then((res) => (res.ok ? res.json() : null))
        .then((serverSnippets) => {
          if (Array.isArray(serverSnippets) && serverSnippets.length > 0) {
            updateAndNotify(serverSnippets);
          }
        })
        .catch(() => {});
    }

    // 5. File System Access API initial async load
    if (!window.codeshelfApi && isFileSystemAccessSupported()) {
      refreshSnippetsFromFS((fsSnippets) => {
        updateAndNotify(fsSnippets);
      }).catch(() => {});
    }

    // 6. Tab focus auto-sync (picks up external edits made in VS Code or Terminal)
    const onFocus = () => {
      if (typeof fetch !== 'undefined' && !window.codeshelfApi) {
        fetch('/api/storage/snippets')
          .then((res) => (res.ok ? res.json() : null))
          .then((serverSnippets) => {
            if (Array.isArray(serverSnippets) && serverSnippets.length > 0) {
              updateAndNotify(serverSnippets);
            }
          })
          .catch(() => {});
      }
      if (!window.codeshelfApi && isFileSystemAccessSupported()) {
        refreshSnippetsFromFS((fsSnippets) => {
          updateAndNotify(fsSnippets);
        }).catch(() => {});
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus();
    });
    disposers.push(() => {
      window.removeEventListener('focus', onFocus);
    });
  }

  return () => {
    disposers.forEach((dispose) => {
      try { dispose(); } catch {}
    });
  };
}

// ─── Snippet CRUD ─────────────────────────────────────────────────────────────

export function addSnippet(input: CreateSnippetInput): Snippet {
  const snippets = getLocalSnippets();
  const now = new Date().toISOString();
  const newSnippet: Snippet = normalizeSnippetVersion({
    ...input,
    id: `snip-${Date.now()}`,
    tags: input.tags || [],
    technology: input.technology || [],
    usage: input.usage || [],
    version: 1,
    createdAt: now,
    updatedAt: now,
    history: [],
    hash: computeSnippetHash(input),
  });

  const updated = [newSnippet, ...snippets];
  saveLocalSnippets(updated);
  return newSnippet;
}

export function updateSnippet(id: string, input: UpdateSnippetInput): Snippet | null {
  const snippets = getLocalSnippets();
  const index = snippets.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const current = normalizeSnippetVersion(snippets[index]!);
  const currentVersion = current.version || 1;

  // Snapshot current state into history if any Markdown-visible field changed
  const history = [...(current.history || [])];
  const hasMarkdownChanged = hasSnippetMarkdownChanged(current, input);

  if (hasMarkdownChanged) {
    const revision: SnippetRevision = {
      version: currentVersion,
      code: current.code,
      description: current.description,
      markdown: serializeSnippetToMarkdown(current),
      changeSummary: input.changeSummary || `Version ${currentVersion} snapshot`,
      timestamp: current.updatedAt,
      hash: current.hash || computeSnippetHash(current),
      snapshot: {
        title: current.title,
        description: current.description,
        code: current.code,
        language: current.language,
        category: current.category,
        subcategory: current.subcategory,
        tags: [...current.tags],
        technology: current.technology ? [...current.technology] : undefined,
        usage: current.usage ? [...current.usage] : undefined,
        complexity: current.complexity ? { ...current.complexity } : undefined,
      },
    };
    history.unshift(revision);
  }

  const updatedSnippet: Snippet = normalizeSnippetVersion({
    ...current,
    ...input,
    id: current.id,
    version: hasMarkdownChanged ? history.length + 1 : currentVersion,
    history,
    hash: computeSnippetHash({ ...current, ...input }),
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });

  snippets[index] = updatedSnippet;
  saveLocalSnippets(snippets);
  return updatedSnippet;
}

export function revertToRevision(id: string, targetVersion: number): Snippet | null {
  const snippets = getLocalSnippets();
  const target = snippets.find((s) => s.id === id);
  if (!target || !target.history) return null;

  const normalized = normalizeSnippetVersion(target);
  const revision = normalized.history?.find((h: SnippetRevision) => h.version === targetVersion);
  if (!revision) return null;

  let restoredProps: Partial<Snippet> = {};
  if (revision.snapshot) {
    restoredProps = { ...revision.snapshot };
  } else if (revision.markdown) {
    restoredProps = { ...parseMarkdownToSnippet(revision.markdown) };
  } else {
    restoredProps = { code: revision.code, description: revision.description };
  }

  return updateSnippet(id, {
    ...restoredProps,
    changeSummary: `Reverted to v${targetVersion}`,
  });
}

export function deleteSnippet(id: string): boolean {
  const snippets = getLocalSnippets();
  const filtered = snippets.filter((s) => s.id !== id);
  if (filtered.length === snippets.length) return false;
  saveLocalSnippets(filtered);
  return true;
}

export function getSnippetById(id: string): Snippet | undefined {
  return getLocalSnippets().find((s) => s.id === id);
}

// ─── Config & Permissions ─────────────────────────────────────────────────────

/**
 * Returns the current configuration synchronously.
 * .codeshelf/config.json is the single source of truth for app configuration and permissions.
 */
export function getLocalConfig(): CodeShelfConfig {
  // 1. Electron Desktop (synchronous IPC)
  if (typeof window !== 'undefined' && window.codeshelfApi) {
    try {
      const config = window.codeshelfApi.getConfig();
      if (config) {
        const validated = validateConfig(config);
        _configCache = validated;
        return validated;
      }
    } catch (err) {
      console.error('[CodeShelf Storage] Failed to load config via codeshelfApi:', err);
    }
  }

  // 2. Return in-memory cache if already hydrated
  if (_configCache !== null) {
    return _configCache;
  }

  // 3. Fallback to localStorage for non-sensitive settings (theme, fontSize, etc.)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(CODESHELF_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const validated = validateConfig(parsed);
        _configCache = validated;
        return validated;
      }
    } catch {}
  }

  return { ...DEFAULT_CODESHELF_CONFIG };
}

/**
 * Loads and ensures the latest configuration is hydrated into _configCache
 * by checking Electron API, the server endpoint /api/storage/config, or the File System Access API.
 * Guarantees that if ~/.codeshelf/config.json contains a geminiApiKey, it is loaded into memory.
 */
export async function ensureConfigLoaded(): Promise<CodeShelfConfig> {
  // 1. Electron Desktop
  if (typeof window !== 'undefined' && window.codeshelfApi) {
    try {
      const config = window.codeshelfApi.getConfig();
      if (config) {
        const validated = validateConfig(config);
        _configCache = validated;
        return validated;
      }
    } catch (err) {
      console.error('[CodeShelf Storage] Failed to load config via codeshelfApi in ensureConfigLoaded:', err);
    }
  }

  // If already in cache with geminiApiKey, return immediately
  if (_configCache && _configCache.geminiApiKey?.trim()) {
    return _configCache;
  }

  // 2. Try fetching from server endpoint (/api/storage/config)
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/storage/config');
      if (res.ok) {
        const serverConfig = await res.json();
        if (serverConfig && typeof serverConfig === 'object') {
          const validated = validateConfig(serverConfig);
          _configCache = validated;
          sanitizeAndSaveConfigToLocalStorage(validated);
          return validated;
        }
      }
    } catch {}
  }

  // 3. Try reading from File System Access API
  if (isFileSystemAccessSupported()) {
    try {
      const fsConfig = await readConfigFromFS();
      if (fsConfig) {
        const validated = validateConfig(fsConfig);
        _configCache = validated;
        sanitizeAndSaveConfigToLocalStorage(validated);
        return validated;
      }
    } catch {}
  }

  return getLocalConfig();
}

/**
 * Returns the Gemini API key from memory cache or refreshes from storage/server if not yet loaded.
 * Ensures the user is NEVER prompted if their ~/.codeshelf/config.json contains the key.
 */
export async function getOrFetchGeminiApiKey(): Promise<string | undefined> {
  const current = getLocalConfig();
  if (current.geminiApiKey?.trim()) {
    return current.geminiApiKey.trim();
  }
  const refreshed = await ensureConfigLoaded();
  return refreshed.geminiApiKey?.trim();
}

/**
 * Reads config from .codeshelf/config.json via FS API and updates in-memory cache.
 */
export async function refreshConfigFromFS(
  onRefreshed?: (config: CodeShelfConfig) => void
): Promise<CodeShelfConfig | null> {
  if (typeof window !== 'undefined' && window.codeshelfApi) return null;
  if (!isFileSystemAccessSupported()) return null;

  try {
    const fsConfig = await readConfigFromFS();
    if (!fsConfig) return null;
    const validated = validateConfig(fsConfig);
    _configCache = validated;
    sanitizeAndSaveConfigToLocalStorage(validated);
    onRefreshed?.(validated);
    return validated;
  } catch (err) {
    console.error('[CodeShelf Storage] Failed to refresh config from FS:', err);
    return null;
  }
}

/**
 * Persists config to .codeshelf/config.json and updates in-memory cache.
 * .codeshelf/config.json is the single source of truth for configuration & permissions.
 *
 * NOTE: User's Gemini API key is NEVER written to localStorage.
 */
export function saveLocalConfig(incoming: Partial<CodeShelfConfig>): CodeShelfConfig {
  const current = getLocalConfig();
  const merged = mergeConfig(current, incoming);

  // Update in-memory cache
  _configCache = merged;

  // Save non-sensitive settings to localStorage (strips geminiApiKey)
  sanitizeAndSaveConfigToLocalStorage(merged);

  // Multi-tab broadcast
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'sync-config', config: merged });
    } catch {}
  }

  // 1. Electron Desktop (synchronous IPC write to ~/.codeshelf/config.json)
  if (typeof window !== 'undefined' && window.codeshelfApi) {
    try {
      window.codeshelfApi.saveConfig(merged);
      return merged;
    } catch (err) {
      console.error('[CodeShelf Storage] Failed to save config via codeshelfApi:', err);
    }
  }

  // 2. File System Access API → .codeshelf/config.json (async)
  if (isFileSystemAccessSupported()) {
    writeConfigToFS(merged).catch((err) => {
      console.error('[CodeShelf Storage] Failed to write config.json via FS API:', err);
    });
  }

  // 3. Server storage endpoint → .codeshelf/config.json
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    fetch('/api/storage/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    }).catch(() => {});
  }

  return merged;
}

/**
 * Subscribes to live config updates across Vite HMR, Electron IPC, and BroadcastChannel.
 */
export function subscribeToConfigChanges(callback: (config: CodeShelfConfig) => void): () => void {
  const disposers: Array<() => void> = [];

  const updateConfig = (newConfig: CodeShelfConfig) => {
    const validated = validateConfig(newConfig);
    _configCache = validated;
    sanitizeAndSaveConfigToLocalStorage(validated);
    callback(validated);
  };

  // 1. Electron IPC config watcher
  if (typeof window !== 'undefined' && window.codeshelfApi?.onConfigChanged) {
    const unsub = window.codeshelfApi.onConfigChanged((cfg) => {
      updateConfig(cfg);
    });
    disposers.push(unsub);
  }

  // 2. Vite Dev Server HMR config watcher
  if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
    const hot = (import.meta as any).hot;
    const hmrHandler = (data: CodeShelfConfig) => {
      if (data && typeof data === 'object') {
        updateConfig(data);
      }
    };
    hot.on('codeshelf:config-changed', hmrHandler);
    disposers.push(() => hot.off('codeshelf:config-changed', hmrHandler));
  }

  // 3. BroadcastChannel config broadcast
  if (syncChannel) {
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'sync-config' && event.data.config) {
        updateConfig(event.data.config);
      }
    };
    syncChannel.addEventListener('message', messageHandler);
    disposers.push(() => syncChannel?.removeEventListener('message', messageHandler));
  }

  // 4. Initial server fetch
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined' && !window.codeshelfApi) {
    fetch('/api/storage/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverConfig) => {
        if (serverConfig) {
          updateConfig(serverConfig);
        }
      })
      .catch(() => {});
  }

  // 5. Initial FS API refresh
  if (typeof window !== 'undefined' && !window.codeshelfApi && isFileSystemAccessSupported()) {
    refreshConfigFromFS((fsConfig) => {
      updateConfig(fsConfig);
    }).catch(() => {});
  }

  return () => {
    disposers.forEach((dispose) => {
      try { dispose(); } catch {}
    });
  };
}
