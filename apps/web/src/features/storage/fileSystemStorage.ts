/**
 * File System Access API storage adapter for CodeShelf web app.
 *
 * Persists `snippets.json` and `config.json` directly inside a user-selected
 * directory (ideally `~/.codeshelf`) using the browser's File System Access API.
 *
 * The chosen directory handle is persisted across sessions via IndexedDB so
 * the user only has to pick the folder once.
 *
 * Browser support: Chrome/Edge 86+, Safari 15.2+ (read-only picker on mobile).
 * Firefox does not support `showDirectoryPicker` as of 2024 (graceful fallback
 * to localStorage).
 */

import type { Snippet, CodeShelfConfig } from '@codeshelf/shared';
import {
  CODESHELF_SNIPPETS_FILENAME,
  CODESHELF_CONFIG_FILENAME,
  CODESHELF_DIR_NAME,
} from '@codeshelf/shared';

const SNIPPETS_FILENAME = CODESHELF_SNIPPETS_FILENAME;
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

  // Verify the handle is still accessible (user may have revoked permission)
  try {
    const permState = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (permState === 'granted') {
      _cachedDirHandle = handle;
      return handle;
    }
    // Permission not yet granted but could be re-requested
    if (permState === 'prompt') {
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
 * Prompts the user to pick the `.codeshelf` directory (or any directory they
 * choose) using the browser's native folder picker.  The handle is persisted
 * to IndexedDB so subsequent page loads don't require re-picking.
 *
 * Returns the chosen handle, or null if the user cancelled.
 */
export async function promptDirectoryPicker(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;

  try {
    // Suggest starting in the home directory — browsers may ignore the hint
    const handle = await (window as any).showDirectoryPicker({
      id: 'codeshelf-snippets',
      mode: 'readwrite',
      startIn: 'documents',
    });
    await saveDirHandle(handle);
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
    return requested === 'granted';
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
 * Reads snippets from the connected directory's `snippets.json`.
 * Returns null if no directory is connected or the file doesn't exist yet.
 */
export async function readSnippetsFromFS(): Promise<Snippet[] | null> {
  const dir = await getStoredDirHandle();
  if (!dir) return null;

  const ok = await ensurePermission(dir);
  if (!ok) return null;

  try {
    const raw = await readFileFromDir(dir, SNIPPETS_FILENAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Snippet[]) : null;
  } catch (err) {
    console.error('[CodeShelf FS] Failed to read snippets.json:', err);
    return null;
  }
}

/**
 * Writes the snippet array to the connected directory's `snippets.json`.
 * Returns true on success, false if no directory is connected or write failed.
 */
export async function writeSnippetsToFS(snippets: Snippet[]): Promise<boolean> {
  const dir = await getStoredDirHandle();
  if (!dir) return false;

  const ok = await ensurePermission(dir);
  if (!ok) return false;

  try {
    await writeFileToDir(dir, SNIPPETS_FILENAME, JSON.stringify(snippets, null, 2));
    return true;
  } catch (err) {
    console.error('[CodeShelf FS] Failed to write snippets.json:', err);
    return false;
  }
}

/**
 * Reads the config from the connected directory's `config.json`.
 * Returns null if no directory is connected or the file doesn't exist.
 */
export async function readConfigFromFS(): Promise<CodeShelfConfig | null> {
  const dir = await getStoredDirHandle();
  if (!dir) return null;

  const ok = await ensurePermission(dir);
  if (!ok) return null;

  try {
    const raw = await readFileFromDir(dir, CONFIG_FILENAME);
    if (!raw) return null;
    return JSON.parse(raw) as CodeShelfConfig;
  } catch (err) {
    console.error('[CodeShelf FS] Failed to read config.json:', err);
    return null;
  }
}

/**
 * Writes the config to the connected directory's `config.json`.
 * Returns true on success, false if no directory is connected or write failed.
 */
export async function writeConfigToFS(config: CodeShelfConfig): Promise<boolean> {
  const dir = await getStoredDirHandle();
  if (!dir) return false;

  const ok = await ensurePermission(dir);
  if (!ok) return false;

  try {
    await writeFileToDir(dir, CONFIG_FILENAME, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('[CodeShelf FS] Failed to write config.json:', err);
    return false;
  }
}

/**
 * Returns whether the user has already connected a directory.
 * (Does NOT verify current permission — use `getStoredDirHandle` + `ensurePermission` for that.)
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
