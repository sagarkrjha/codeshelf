import { useState, useEffect, useCallback } from 'react';
import {
  isFileSystemAccessSupported,
  getStoredDirHandle,
  promptDirectoryPicker,
  clearStoredDirHandle,
  ensurePermission,
  EXPECTED_DIR_NAME,
} from '../fileSystemStorage';

export type FsStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'permission-needed';

export interface UseFileSystemStorageResult {
  /** Whether the File System Access API is available in this browser. */
  isSupported: boolean;
  /** Current connection status. */
  status: FsStatus;
  /** Name of the connected directory (e.g. ".codeshelf"), or null. */
  dirName: string | null;
  /** True while the initial check is running. */
  isLoading: boolean;
  /**
   * Opens the native folder picker so the user can select their `.codeshelf`
   * directory.  Resolves when the user closes the picker.
   */
  connect: () => Promise<void>;
  /**
   * Re-requests permission for the previously chosen directory (e.g. after a
   * page reload on browsers that require re-grant).
   */
  requestPermission: () => Promise<void>;
  /** Disconnects (forgets) the currently linked directory. */
  disconnect: () => Promise<void>;
  /** True when the linked directory name matches `.codeshelf`. */
  isExpectedDir: boolean;
}

export function useFileSystemStorage(): UseFileSystemStorageResult {
  const supported = isFileSystemAccessSupported();

  const [status, setStatus] = useState<FsStatus>(supported ? 'disconnected' : 'unsupported');
  const [dirName, setDirName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(supported);

  // On mount, check if a directory handle is already stored and whether we
  // still have permission for it.
  useEffect(() => {
    if (!supported) return;

    let cancelled = false;

    async function checkStoredHandle() {
      try {
        const handle = await getStoredDirHandle();
        if (cancelled) return;

        if (!handle) {
          setStatus('disconnected');
          setDirName(null);
          return;
        }

        // queryPermission to see current state
        try {
          const state = await (handle as any).queryPermission({ mode: 'readwrite' });
          if (cancelled) return;
          if (state === 'granted') {
            setStatus('connected');
            setDirName(handle.name);
          } else {
            // We have a handle but need to re-prompt for permission
            setStatus('permission-needed');
            setDirName(handle.name);
          }
        } catch {
          // Older Safari: queryPermission not supported, assume connected
          if (!cancelled) {
            setStatus('connected');
            setDirName(handle.name);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkStoredHandle();
    return () => { cancelled = true; };
  }, [supported]);

  const connect = useCallback(async () => {
    setStatus('connecting');
    const handle = await promptDirectoryPicker();
    if (!handle) {
      // User cancelled — revert to previous state
      setStatus((prev) => (prev === 'connecting' ? 'disconnected' : prev));
      return;
    }
    setDirName(handle.name);
    setStatus('connected');
  }, []);

  const requestPermission = useCallback(async () => {
    const handle = await getStoredDirHandle();
    if (!handle) {
      setStatus('disconnected');
      return;
    }
    const ok = await ensurePermission(handle);
    if (ok) {
      setStatus('connected');
      setDirName(handle.name);
    } else {
      setStatus('permission-needed');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await clearStoredDirHandle();
    setStatus('disconnected');
    setDirName(null);
  }, []);

  return {
    isSupported: supported,
    status,
    dirName,
    isLoading,
    connect,
    requestPermission,
    disconnect,
    isExpectedDir: dirName === EXPECTED_DIR_NAME,
  };
}
