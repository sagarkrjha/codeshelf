import type {
  Snippet,
  CreateSnippetInput,
  UpdateSnippetInput,
  SnippetRevision,
  CodeShelfConfig,
} from '@codeshelf/shared';
import {
  SEED_SNIPPETS,
  CODESHELF_STORAGE_KEY,
  CODESHELF_CONFIG_KEY,
  CODESHELF_SYNC_CHANNEL,
  DEFAULT_CODESHELF_CONFIG,
  mergeSnippets,
  normalizeSnippetVersion,
  hasSnippetMarkdownChanged,
  serializeSnippetToMarkdown,
  parseMarkdownToSnippet,
  computeSnippetHash,
  validateConfig,
  mergeConfig,
} from '@codeshelf/shared';


// Singleton BroadcastChannel for multi-tab browser synchronization
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel(CODESHELF_SYNC_CHANNEL);
  } catch (err) {
    console.warn('[CodeShelf Storage] BroadcastChannel not supported or failed to initialize:', err);
  }
}

function saveToLocalStorage(snippets: Snippet[]): void {
  try {
    localStorage.setItem(CODESHELF_STORAGE_KEY, JSON.stringify(snippets));
  } catch (err) {
    console.error('[CodeShelf Storage] Failed to save snippets to localStorage', err);
  }
}

function loadFromLocalStorage(): Snippet[] {
  try {
    const raw = localStorage.getItem(CODESHELF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[CodeShelf Storage] Failed to read from localStorage:', err);
    return [];
  }
}

/**
 * Retrieves the current snippet collection from the active environment:
 * 1. Desktop (Electron IPC bridge to ~/.codeshelf/snippetson)
 * 2. Web / LocalStorage with automated background API sync
 */
export function getLocalSnippets(): Snippet[] {
  // 1. Electron Desktop
  if (typeof window !== 'undefined' && window.codeshelfApi) {
    try {
      const fileSnippets = window.codeshelfApi.getSnippets();
      if (fileSnippets && Array.isArray(fileSnippets)) {
        const normalized: Snippet[] = (fileSnippets as Snippet[]).map((s: Snippet) => normalizeSnippetVersion(s));
        saveToLocalStorage(normalized);
        return normalized;
      }
    } catch (err) {
      console.error('[CodeShelf Storage] Failed to load snippets via codeshelfApi:', err);
    }
  }

  // 2. Web / Browser localStorage
  const local = loadFromLocalStorage();
  if (local.length > 0) {
    return local.map(normalizeSnippetVersion);
  }

  // Seed data default if clean installation
  const normalizedSeeds = SEED_SNIPPETS.map(normalizeSnippetVersion);
  saveToLocalStorage(normalizedSeeds);
  return normalizedSeeds;
}

/**
 * Persists snippets across all environments:
 * - Saves to localStorage
 * - Broadcasts to open browser tabs/windows
 * - Saves to ~/.codeshelf/snippetson in Electron Desktop
 * - Sends to /api/storage/snippets in Web mode
 */
export function saveLocalSnippets(snippets: Snippet[]): void {
  const normalized = snippets.map(normalizeSnippetVersion);

  // 1. LocalStorage
  saveToLocalStorage(normalized);

  // 2. Multi-tab broadcast
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'sync', snippets: normalized });
    } catch (err) {
      console.warn('[CodeShelf Storage] Failed to broadcast snippets update:', err);
    }
  }

  // 3. Electron Desktop
  if (typeof window !== 'undefined' && window.codeshelfApi) {
    try {
      window.codeshelfApi.saveSnippets(normalized);
      return;
    } catch (err) {
      console.error('[CodeShelf Storage] Failed to save snippets via codeshelfApi:', err);
    }
  }

  // 4. Web HTTP sync endpoint (Vite dev server / sync server)
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    fetch('/api/storage/snippets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    }).catch(() => {
      // Offline or static environment; localStorage persists safely
    });
  }
}

/**
 * Subscribes to snippet updates from any environment (Electron file watcher,
 * Vite dev server HMR event, Web BroadcastChannel, or storage event).
 */
export function subscribeToSnippetChanges(callback: (snippets: Snippet[]) => void): () => void {
  const disposers: Array<() => void> = [];

  // 1. Electron IPC file watcher
  if (typeof window !== 'undefined' && window.codeshelfApi?.onSnippetsChanged) {
    const unsub = window.codeshelfApi.onSnippetsChanged((updated) => {
      saveToLocalStorage(updated);
      callback(updated);
    });
    disposers.push(unsub);
  }

  // 2. Web Vite Dev Server HMR event (bridges changes made by VS Code to the Web browser)
  if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
    const hot = (import.meta as any).hot;
    const hmrHandler = (data: Snippet[]) => {
      if (Array.isArray(data)) {
        saveToLocalStorage(data);
        callback(data);
      }
    };
    hot.on('codeshelf:snippets-changed', hmrHandler);
    disposers.push(() => {
      hot.off('codeshelf:snippets-changed', hmrHandler);
    });
  }

  // 3. Multi-tab Web BroadcastChannel
  if (syncChannel) {
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'sync' && Array.isArray(event.data.snippets)) {
        callback(event.data.snippets);
      }
    };
    syncChannel.addEventListener('message', messageHandler);
    disposers.push(() => {
      syncChannel?.removeEventListener('message', messageHandler);
    });
  }

  // 4. Cross-window storage event fallback
  if (typeof window !== 'undefined') {
    const storageHandler = (e: StorageEvent) => {
      if (e.key === CODESHELF_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            callback(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', storageHandler);
    disposers.push(() => {
      window.removeEventListener('storage', storageHandler);
    });

    // 5. Initial background fetch for Web mode if running under Vite / server
    if (!window.codeshelfApi && typeof fetch !== 'undefined') {
      fetch('/api/storage/snippets')
        .then((res) => (res.ok ? res.json() : null))
        .then((serverSnippets) => {
          if (Array.isArray(serverSnippets) && serverSnippets.length > 0) {
            const current = loadFromLocalStorage();
            const { merged, added, updated } = mergeSnippets(current, serverSnippets);
            if (added > 0 || updated > 0) {
              saveToLocalStorage(merged);
              callback(merged);
            }
          }
        })
        .catch(() => {
          // Static web mode; offline or no dev server
        });
    }
  }

  return () => {
    disposers.forEach((dispose) => {
      try {
        dispose();
      } catch {}
    });
  };
}

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

  // Snapshot current state into history if any part of the Markdown changed
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

  // Restore complete snippet properties from snapshot or markdown
  let restoredProps: Partial<Snippet> = {};
  if (revision.snapshot) {
    restoredProps = { ...revision.snapshot };
  } else if (revision.markdown) {
    restoredProps = { ...parseMarkdownToSnippet(revision.markdown) };
  } else {
    restoredProps = {
      code: revision.code,
      description: revision.description,
    };
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
  const snippets = getLocalSnippets();
  return snippets.find((s) => s.id === id);
}

/**
 * Retrieves the centralized configuration from active environment:
 * 1. Electron Desktop IPC bridge (~/.codeshelf/config.json)
 * 2. Browser localStorage fallback with automatic sync
 */
export function getLocalConfig(): CodeShelfConfig {
  if (typeof window !== 'undefined' && window.codeshelfApi) {
    try {
      const config = window.codeshelfApi.getConfig();
      if (config) {
        localStorage.setItem(CODESHELF_CONFIG_KEY, JSON.stringify(config));
        return validateConfig(config);
      }
    } catch (err) {
      console.error('[CodeShelf Storage] Failed to load config via codeshelfApi:', err);
    }
  }

  try {
    const raw = localStorage.getItem(CODESHELF_CONFIG_KEY);
    if (raw) {
      return validateConfig(JSON.parse(raw));
    }
  } catch (err) {
    console.error('[CodeShelf Storage] Failed to load config from localStorage:', err);
  }

  return { ...DEFAULT_CODESHELF_CONFIG };
}

/**
 * Persists centralized configuration across all active environments:
 * 1. Electron Desktop (~/.codeshelf/config.json)
 * 2. Web / Browser localStorage & Vite backend endpoint (/api/storage/config)
 * 3. Multi-tab BroadcastChannel
 */
export function saveLocalConfig(incoming: Partial<CodeShelfConfig>): CodeShelfConfig {
  const current = getLocalConfig();
  const merged = mergeConfig(current, incoming);

  try {
    localStorage.setItem(CODESHELF_CONFIG_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error('[CodeShelf Storage] Failed to save config to localStorage:', err);
  }

  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'sync-config', config: merged });
    } catch {}
  }

  if (typeof window !== 'undefined' && window.codeshelfApi) {
    try {
      window.codeshelfApi.saveConfig(merged);
      return merged;
    } catch (err) {
      console.error('[CodeShelf Storage] Failed to save config via codeshelfApi:', err);
    }
  }

  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    fetch('/api/storage/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    }).catch(() => {});
  }

  return merged;
}

