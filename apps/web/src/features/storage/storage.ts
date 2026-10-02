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
  DEFAULT_CODESHELF_CONFIG,
  normalizeSnippetVersion,
  hasSnippetMarkdownChanged,
  serializeSnippetToMarkdown,
  parseMarkdownToSnippet,
  computeSnippetHash,
  validateConfig,
  mergeConfig,
} from '@codeshelf/shared';
import {
  isFileSystemAccessSupported,
  readSnippetsFromFS,
  writeSnippetsToFS,
  readConfigFromFS,
  writeConfigToFS,
} from './fileSystemStorage';

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Replaces localStorage as the fast synchronous layer.
// Populated on first read and kept in sync with the file on every write.

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

// ─── Snippets ─────────────────────────────────────────────────────────────────

/**
 * Returns the current in-memory snippet cache synchronously.
 *
 * Priority on first call:
 * 1. Electron Desktop  → synchronous IPC read from ~/.codeshelf/snippets.json
 * 2. Web               → returns in-memory cache (or seed data until the async
 *                        FS refresh triggered by `subscribeToSnippetChanges`
 *                        completes and calls back with real file data).
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

  // 3. Nothing cached yet — return seed data and wait for async FS refresh
  const seeds = SEED_SNIPPETS.map(normalizeSnippetVersion);
  _snippetsCache = seeds;
  return seeds;
}

/**
 * Reads snippets from ~/.codeshelf/snippets.json via the File System Access API
 * and updates the in-memory cache. Notifies `onRefreshed` with the result.
 *
 * Called automatically by `subscribeToSnippetChanges` on startup.
 */
export async function refreshSnippetsFromFS(
  onRefreshed?: (snippets: Snippet[]) => void
): Promise<Snippet[] | null> {
  if (typeof window !== 'undefined' && window.codeshelfApi) return null;
  if (!isFileSystemAccessSupported()) return null;

  try {
    const fsSnippets = await readSnippetsFromFS();
    if (!fsSnippets) return null;

    const normalized = fsSnippets.map(normalizeSnippetVersion);
    _snippetsCache = normalized;
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
 * Write priority:
 * 1. Electron Desktop  → synchronous IPC write to ~/.codeshelf/snippets.json
 * 2. Web (FS API)      → async write to the user-selected directory
 * 3. Web (Vite dev)    → POST /api/storage/snippets so VS Code picks up changes
 *
 * Multi-tab broadcast is sent in all cases so open tabs stay in sync.
 */
export function saveLocalSnippets(snippets: Snippet[]): void {
  const normalized = snippets.map(normalizeSnippetVersion);

  // Always keep in-memory cache current
  _snippetsCache = normalized;

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

  // 2. File System Access API → ~/.codeshelf/snippets.json (async, best-effort)
  if (isFileSystemAccessSupported()) {
    writeSnippetsToFS(normalized).catch((err) => {
      console.error('[CodeShelf Storage] Failed to write snippets.json via FS API:', err);
    });
  }

  // 3. Vite dev server endpoint — keeps VS Code extension in sync during development
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    fetch('/api/storage/snippets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    }).catch(() => {
      // Expected to fail in production / offline — silently ignored
    });
  }
}

/**
 * Subscribes to snippet updates from all environments and triggers an initial
 * async load from the file system on startup.
 */
export function subscribeToSnippetChanges(callback: (snippets: Snippet[]) => void): () => void {
  const disposers: Array<() => void> = [];

  // 1. Electron IPC file watcher
  if (typeof window !== 'undefined' && window.codeshelfApi?.onSnippetsChanged) {
    const unsub = window.codeshelfApi.onSnippetsChanged((updated) => {
      _snippetsCache = updated.map(normalizeSnippetVersion);
      callback(_snippetsCache);
    });
    disposers.push(unsub);
  }

  // 2. Vite Dev Server HMR (VS Code → Web browser bridge)
  if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
    const hot = (import.meta as any).hot;
    const hmrHandler = (data: Snippet[]) => {
      if (Array.isArray(data)) {
        _snippetsCache = data.map(normalizeSnippetVersion);
        callback(_snippetsCache);
      }
    };
    hot.on('codeshelf:snippets-changed', hmrHandler);
    disposers.push(() => hot.off('codeshelf:snippets-changed', hmrHandler));
  }

  // 3. Multi-tab BroadcastChannel
  if (syncChannel) {
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'sync' && Array.isArray(event.data.snippets)) {
        const normalized = (event.data.snippets as Snippet[]).map(normalizeSnippetVersion);
        _snippetsCache = normalized;
        callback(normalized);
      }
    };
    syncChannel.addEventListener('message', messageHandler);
    disposers.push(() => syncChannel?.removeEventListener('message', messageHandler));
  }

  if (typeof window !== 'undefined') {
    // 4. File System Access API — initial async load from ~/.codeshelf/snippets.json
    if (!window.codeshelfApi && isFileSystemAccessSupported()) {
      refreshSnippetsFromFS((fsSnippets) => {
        callback(fsSnippets);
      }).catch(() => {
        // No directory connected yet — user will be prompted by FolderConnectBanner
      });
    }

    // 5. Vite dev server fetch — fallback for browsers without FS Access API
    if (!window.codeshelfApi && !isFileSystemAccessSupported() && typeof fetch !== 'undefined') {
      fetch('/api/storage/snippets')
        .then((res) => (res.ok ? res.json() : null))
        .then((serverSnippets) => {
          if (Array.isArray(serverSnippets) && serverSnippets.length > 0) {
            const normalized = serverSnippets.map(normalizeSnippetVersion);
            _snippetsCache = normalized;
            callback(normalized);
          }
        })
        .catch(() => {
          // Static / offline environment — in-memory cache is already set
        });
    }
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

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Returns the current in-memory config cache synchronously.
 *
 * Priority on first call:
 * 1. Electron Desktop  → synchronous IPC read from ~/.codeshelf/config.json
 * 2. Web               → in-memory cache (populated by `refreshConfigFromFS`)
 * 3. Fallback          → DEFAULT_CODESHELF_CONFIG
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

  // 3. Nothing yet — async refresh will populate cache; return defaults for now
  return { ...DEFAULT_CODESHELF_CONFIG };
}

/**
 * Reads config from ~/.codeshelf/config.json via the File System Access API
 * and updates the in-memory cache. Notifies `onRefreshed` with the result.
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
    onRefreshed?.(validated);
    return validated;
  } catch (err) {
    console.error('[CodeShelf Storage] Failed to refresh config from FS:', err);
    return null;
  }
}

/**
 * Persists config to the file system and updates the in-memory cache.
 *
 * Write priority:
 * 1. Electron Desktop  → synchronous IPC write to ~/.codeshelf/config.json
 * 2. Web (FS API)      → async write to ~/.codeshelf/config.json
 * 3. Web (Vite dev)    → POST /api/storage/config (dev mode only)
 *
 * Multi-tab broadcast is sent in all cases.
 */
export function saveLocalConfig(incoming: Partial<CodeShelfConfig>): CodeShelfConfig {
  const current = getLocalConfig();
  const merged = mergeConfig(current, incoming);

  // Always keep in-memory cache current
  _configCache = merged;

  // Multi-tab broadcast
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'sync-config', config: merged });
    } catch {}
  }

  // 1. Electron Desktop (synchronous IPC)
  if (typeof window !== 'undefined' && window.codeshelfApi) {
    try {
      window.codeshelfApi.saveConfig(merged);
      return merged;
    } catch (err) {
      console.error('[CodeShelf Storage] Failed to save config via codeshelfApi:', err);
    }
  }

  // 2. File System Access API → ~/.codeshelf/config.json (async, best-effort)
  if (isFileSystemAccessSupported()) {
    writeConfigToFS(merged).catch((err) => {
      console.error('[CodeShelf Storage] Failed to write config.json via FS API:', err);
    });
  }

  // 3. Vite dev server endpoint (dev mode only)
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    fetch('/api/storage/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    }).catch(() => {});
  }

  return merged;
}
