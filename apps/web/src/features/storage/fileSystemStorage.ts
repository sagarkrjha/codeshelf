/**
 * File System Access API storage adapter for CodeShelf web app.
 *
 * Persists `snippets.json` (primary source of truth) and `config.json`
 * (single source of truth for app config & permissions) directly inside
 * a user-selected directory (ideally `~/.codeshelf`) using the browser's
 * File System Access API.
 *
 * The directory handle is persisted in IndexedDB and permission state
 * is recorded in `.codeshelf/config.json`.
 */

import type { Snippet, CodeShelfConfig } from '@codeshelf/shared';
import {
  CODESHELF_PRIMARY_SNIPPET_FILENAME,
  CODESHELF_CONFIG_FILENAME,
  CODESHELF_DIR_NAME,
  mergeSnippets,
  validateConfig,
  mergeConfig,
} from '@codeshelf/shared';

const PRIMARY_SNIPPETS_FILENAME = CODESHELF_PRIMARY_SNIPPET_FILENAME;
const CONFIG_FILENAME = CODESHELF_CONFIG_FILENAME;

// IndexedDB database/store for persisting the directory handle
const IDB_DB_NAME = 'codeshelf-fs';
const IDB_STORE_NAME = 'handles';
const IDB_DIR_KEY = 'snippets-dir';

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const req = tx.objectStore(IDB_STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const req = tx.objectStore(IDB_STORE_NAME).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // IDB unavailable (private browsing, etc.) — silently ignore
  }
}

async function idbDel(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const req = tx.objectStore(IDB_STORE_NAME).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

// ─── Feature detection ────────────────────────────────────────────────────────

/** Returns true when the File System Access API's directory picker is supported. */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in window
  );
}

// ─── Directory handle management ─────────────────────────────────────────────

let _cachedDirHandle: FileSystemDirectoryHandle | null = null;

/**
 * Persists a directory handle to IndexedDB and updates the in-memory cache.
 */
async function saveDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  _cachedDirHandle = handle;
  await idbSet(IDB_DIR_KEY, handle);
}

/**
 * Retrieves the persisted directory handle from IndexedDB.
 * Returns null if none is stored or if permissions were revoked.
 */
export async function getStoredDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (_cachedDirHandle) return _cachedDirHandle;

  const handle = await idbGet<FileSystemDirectoryHandle>(IDB_DIR_KEY);
  if (!handle) return null;

  try {
    const permState = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (permState === 'granted' || permState === 'prompt') {
      _cachedDirHandle = handle;
      return handle;
    }
    // Denied — clear stale handle
    await idbDel(IDB_DIR_KEY);
    _cachedDirHandle = null;
    return null;
  } catch {
    // queryPermission not supported (older Safari) — return handle optimistically
    _cachedDirHandle = handle;
    return handle;
  }
}

/**
 * Prompts the user to pick the `.codeshelf` directory using the browser's native folder picker.
 * Updates `.codeshelf/config.json` with granted permissions and saves handle to IndexedDB.
 */
export async function promptDirectoryPicker(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;

  try {
    const handle = await (window as any).showDirectoryPicker({
      id: 'codeshelf-snippets',
      mode: 'readwrite',
      startIn: 'documents',
    });
    await saveDirHandle(handle);

    // Record persistent permission grant inside .codeshelf/config.json
    try {
      await writeConfigToFS({
        permissions: {
          fileSystemAccess: 'granted',
          directoryName: handle.name,
          autoSyncFileSystem: true,
          lastGrantedAt: new Date().toISOString(),
        },
      });
    } catch {}

    return handle;
  } catch (err: any) {
    if (err?.name === 'AbortError') return null; // user cancelled
    console.error('[CodeShelf FS] Directory picker error:', err);
    return null;
  }
}

/**
 * Ensures we have readwrite permission for the given handle.
 * Returns true if permission is granted.
 */
export async function ensurePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    const state = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (state === 'granted') return true;
    const requested = await (handle as any).requestPermission({ mode: 'readwrite' });
    if (requested === 'granted') {
      try {
        await writeConfigToFS({
          permissions: {
            fileSystemAccess: 'granted',
            directoryName: handle.name,
            autoSyncFileSystem: true,
            lastGrantedAt: new Date().toISOString(),
          },
        });
      } catch {}
      return true;
    }
    return false;
  } catch {
    return true; // optimistic — older browsers
  }
}

/**
 * Clears the stored directory handle (i.e., "disconnect" the folder).
 */
export async function clearStoredDirHandle(): Promise<void> {
  _cachedDirHandle = null;
  await idbDel(IDB_DIR_KEY);
  try {
    await writeConfigToFS({
      permissions: {
        fileSystemAccess: 'denied',
        autoSyncFileSystem: false,
      },
    });
  } catch {}
}

// ─── File read / write helpers ────────────────────────────────────────────────

async function readFileFromDir(
  dir: FileSystemDirectoryHandle,
  filename: string
): Promise<string | null> {
  try {
    const fileHandle = await dir.getFileHandle(filename, { create: false });
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (err: any) {
    if (err?.name === 'NotFoundError') return null;
    throw err;
  }
}

async function writeFileToDir(
  dir: FileSystemDirectoryHandle,
  filename: string,
  content: string
): Promise<void> {
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(content);
  await writable.close();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reads snippets from the connected directory.
 * Reads directly from `snippets.json`.
 */
export async function readSnippetsFromFS(): Promise<Snippet[] | null> {
  const dir = await getStoredDirHandle();
  if (!dir) return null;

  const ok = await ensurePermission(dir);
  if (!ok) return null;

  try {
    const rawPrimary = await readFileFromDir(dir, PRIMARY_SNIPPETS_FILENAME);
    if (rawPrimary) {
      try {
        const parsed = JSON.parse(rawPrimary);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }

    return null;
  } catch (err) {
    console.error('[CodeShelf FS] Failed to read snippets from FS:', err);
    return null;
  }
}

/**
 * Writes the snippet array to the connected directory's `snippets.json`.
 * Safe conflict handling: reads existing snippets from disk first and merges
 * using `mergeSnippets` to ensure NO user data is ever overwritten or lost.
 */
export async function writeSnippetsToFS(snippets: Snippet[]): Promise<boolean> {
  const dir = await getStoredDirHandle();
  if (!dir) return false;

  const ok = await ensurePermission(dir);
  if (!ok) return false;

  try {
    const existing = await readSnippetsFromFS();
    const finalSnippets = existing ? mergeSnippets(existing, snippets).merged : snippets;
    const formatted = JSON.stringify(finalSnippets, null, 2);

    // Persistent source of truth: snippets.json
    await writeFileToDir(dir, PRIMARY_SNIPPETS_FILENAME, formatted);

    return true;
  } catch (err) {
    console.error('[CodeShelf FS] Failed to write snippets.json:', err);
    return false;
  }
}

/**
 * Reads the config from the connected directory's `config.json`.
 * Single source of truth for app configuration and permissions.
 */
export async function readConfigFromFS(): Promise<CodeShelfConfig | null> {
  const dir = await getStoredDirHandle();
  if (!dir) return null;

  const ok = await ensurePermission(dir);
  if (!ok) return null;

  try {
    const raw = await readFileFromDir(dir, CONFIG_FILENAME);
    if (!raw) return null;
    return validateConfig(JSON.parse(raw));
  } catch (err) {
    console.error('[CodeShelf FS] Failed to read config.json:', err);
    return null;
  }
}

/**
 * Writes the config to the connected directory's `config.json`.
 * Merges with existing configuration on disk so settings and permissions are preserved safely.
 */
export async function writeConfigToFS(config: Partial<CodeShelfConfig>): Promise<boolean> {
  const dir = await getStoredDirHandle();
  if (!dir) return false;

  const ok = await ensurePermission(dir);
  if (!ok) return false;

  try {
    let current: CodeShelfConfig | null = null;
    const raw = await readFileFromDir(dir, CONFIG_FILENAME);
    if (raw) {
      try {
        current = validateConfig(JSON.parse(raw));
      } catch {}
    }

    const merged = current ? mergeConfig(current, config) : validateConfig(config);
    await writeFileToDir(dir, CONFIG_FILENAME, JSON.stringify(merged, null, 2));
    return true;
  } catch (err) {
    console.error('[CodeShelf FS] Failed to write config.json:', err);
    return false;
  }
}

/**
 * Returns whether the user has already connected a directory in IndexedDB.
 */
export async function isDirectoryConnected(): Promise<boolean> {
  const handle = await idbGet<FileSystemDirectoryHandle>(IDB_DIR_KEY);
  return handle != null;
}

/**
 * Returns the display name of the connected directory (e.g. ".codeshelf"),
 * or null if no directory is connected.
 */
export async function getConnectedDirName(): Promise<string | null> {
  const handle = await getStoredDirHandle();
  return handle ? handle.name : null;
}

/** Expected name of the CodeShelf data directory. */
export const EXPECTED_DIR_NAME = CODESHELF_DIR_NAME;
