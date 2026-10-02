import type { FsStatus } from '../../storage/hooks/useFileSystemStorage';
import { EXPECTED_DIR_NAME } from '../../storage/fileSystemStorage';

interface FolderConnectBannerProps {
  status: FsStatus;
  dirName: string | null;
  isExpectedDir: boolean;
  isLoading: boolean;
  onConnect: () => Promise<void>;
  onRequestPermission: () => Promise<void>;
  onDismiss: () => void;
}

/**
 * Sticky banner shown when the File System Access API is supported but no
 * `.codeshelf` directory is connected (or permission needs re-granting).
 *
 * Not shown in Electron (which uses IPC-based file access) or in browsers
 * that don't support the File System Access API.
 */
export function FolderConnectBanner({
  status,
  dirName,
  isExpectedDir,
  isLoading,
  onConnect,
  onRequestPermission,
  onDismiss,
}: FolderConnectBannerProps) {
  if (isLoading || status === 'unsupported' || status === 'connected') return null;

  if (status === 'permission-needed') {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-yellow-900/80 border-b border-yellow-700 text-yellow-100 text-sm">
        <span className="flex-1">
          <span className="font-semibold">Permission needed:</span>{' '}
          Re-grant access to <code className="font-mono bg-yellow-800/60 px-1 rounded">{dirName}</code> to
          keep snippets synced to your device.
          {!isExpectedDir && (
            <span className="ml-2 text-yellow-300">
              (Tip: connect your <code className="font-mono">{EXPECTED_DIR_NAME}</code> folder for the best experience.)
            </span>
          )}
        </span>
        <button
          onClick={onRequestPermission}
          className="shrink-0 px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs font-medium transition-colors"
        >
          Re-grant Access
        </button>
        <button
          onClick={onDismiss}
          className="shrink-0 text-yellow-400 hover:text-yellow-200 transition-colors text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-blue-900/80 border-b border-blue-700 text-blue-100 text-sm">
        <span className="flex-1">Opening folder picker…</span>
      </div>
    );
  }

  // status === 'disconnected'
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-900/80 border-b border-indigo-700 text-indigo-100 text-sm">
      <svg className="shrink-0 w-4 h-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
      <span className="flex-1">
        <span className="font-semibold">Connect your folder</span> to save snippets to{' '}
        <code className="font-mono bg-indigo-800/60 px-1 rounded">~/{EXPECTED_DIR_NAME}/snippets.json</code>{' '}
        on your device.
      </span>
      <button
        onClick={onConnect}
        className="shrink-0 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors"
      >
        Choose Folder
      </button>
      <button
        onClick={onDismiss}
        className="shrink-0 text-indigo-400 hover:text-indigo-200 transition-colors text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
