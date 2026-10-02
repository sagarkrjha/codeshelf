import { useState, useEffect } from 'react';
import type { AppUpdateInfo } from '@codeshelf/shared';
import { marked } from 'marked';
import {
  Sparkles,
  Download,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  X,
  AlertCircle,
  Play,
  Folder,
} from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  updateInfo: AppUpdateInfo | null;
  isChecking: boolean;
  onClose: () => void;
  onCheckAgain: () => void;
}

export function UpdateModal({
  isOpen,
  updateInfo,
  isChecking,
  onClose,
  onCheckAgain,
}: UpdateModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    downloaded: number;
    total: number;
  } | null>(null);
  const [downloadedResult, setDownloadedResult] = useState<{
    filePath: string;
    fileName: string;
  } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [autoCheckStartup, setAutoCheckStartup] = useState<boolean>(() => {
    return localStorage.getItem('codeshelf_autocheck_updates') !== 'false';
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    if (window.codeshelfApi?.onDownloadProgress) {
      const unsubscribe = window.codeshelfApi.onDownloadProgress((progress) => {
        setDownloadProgress(progress);
      });
      return () => {
        unsubscribe();
      };
    }
    return undefined;
  }, [isOpen]);

  const handleToggleAutoCheck = (enabled: boolean) => {
    setAutoCheckStartup(enabled);
    localStorage.setItem('codeshelf_autocheck_updates', enabled ? 'true' : 'false');
  };

  const handleOpenUrl = async (url: string) => {
    if (window.codeshelfApi?.openExternalUrl) {
      await window.codeshelfApi.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleDownloadInApp = async (downloadUrl: string, fileName?: string) => {
    if (!window.codeshelfApi?.downloadUpdateFile) {
      handleOpenUrl(downloadUrl);
      return;
    }

    setDownloading(true);
    setDownloadError(null);
    setDownloadProgress(null);
    setDownloadedResult(null);

    try {
      const result = await window.codeshelfApi.downloadUpdateFile(downloadUrl, fileName);
      if (result && result.success) {
        setDownloadedResult(result);
      } else {
        setDownloadError('Download failed. You can download manually from GitHub.');
      }
    } catch (err: any) {
      setDownloadError(err?.message || 'Failed to download update file.');
    } finally {
      setDownloading(false);
    }
  };

  const handleLaunchInstaller = async (filePath: string) => {
    if (window.codeshelfApi?.launchInstaller) {
      await window.codeshelfApi.launchInstaller(filePath);
    }
  };

  if (!isOpen) return null;

  const currentVersion = updateInfo?.currentVersion || '0.1.0';
  const latestVersion = updateInfo?.latestVersion || currentVersion;
  const hasUpdate = updateInfo?.hasUpdate ?? false;

  const setupAsset = updateInfo?.assets?.find((a) =>
    a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe')
  );
  const portableAsset = updateInfo?.assets?.find(
    (a) => a.name.endsWith('.exe') && !a.name.toLowerCase().includes('setup')
  );
  const vsixAsset = updateInfo?.assets?.find((a) => a.name.endsWith('.vsix'));

  const renderedNotes = updateInfo?.releaseNotes
    ? marked.parse(updateInfo.releaseNotes)
    : '';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-1100 backdrop-blur-sm">
      <div className="bg-bg-secondary border border-border-color rounded-xl w-180 max-w-[95vw] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-color flex items-center justify-between bg-bg-tertiary">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                hasUpdate ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-[1.1rem] font-semibold text-text-main">CodeShelf Updates</h2>
              <span className="text-xs text-text-muted">
                Desktop Application & IDE Extension
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-text-muted hover:text-text-main cursor-pointer p-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* Status Box */}
          <div
            className={`p-4 rounded-lg flex items-center justify-between border ${
              hasUpdate
                ? 'bg-gradient-to-br from-blue-500/15 to-slate-800/50 border-blue-500/40'
                : 'bg-gradient-to-br from-emerald-500/15 to-slate-800/50 border-emerald-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {hasUpdate ? (
                <Sparkles size={24} className="text-blue-400" />
              ) : (
                <CheckCircle2 size={24} className="text-emerald-400" />
              )}
              <div>
                <div className="font-semibold text-base text-text-main">
                  {isChecking
                    ? 'Checking for updates...'
                    : hasUpdate
                    ? `Update Available: v${latestVersion}`
                    : "You're up to date!"}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  Installed version: <strong className="text-text-main">v{currentVersion}</strong>
                  {hasUpdate && (
                    <>
                      {' '}
                      • Latest version: <strong className="text-blue-400">v{latestVersion}</strong>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              className="btn text-xs py-1.5 px-3"
              onClick={onCheckAgain}
              disabled={isChecking}
            >
              <RefreshCw size={13} className={isChecking ? 'animate-spin' : ''} />
              {isChecking ? 'Checking...' : 'Check Again'}
            </button>
          </div>

          {/* If Update Available: Download Options & Release Notes */}
          {hasUpdate && (
            <>
              {/* Download Section */}
              <div className="bg-bg-primary border border-border-color rounded-lg p-4">
                <div className="text-xs font-semibold mb-3 text-text-main">
                  Download & Install CodeShelf v{latestVersion}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {setupAsset ? (
                    <button
                      className="btn btn-primary py-2 px-4 text-xs"
                      onClick={() => handleDownloadInApp(setupAsset.browser_download_url, setupAsset.name)}
                      disabled={downloading}
                    >
                      <Download size={15} />
                      {downloading ? 'Downloading Setup...' : `Download Setup (${(setupAsset.size / (1024 * 1024)).toFixed(1)} MB)`}
                    </button>
                  ) : updateInfo?.downloadUrl ? (
                    <button
                      className="btn btn-primary py-2 px-4 text-xs"
                      onClick={() => handleDownloadInApp(updateInfo.downloadUrl!, `CodeShelf-Setup-${latestVersion}.exe`)}
                      disabled={downloading}
                    >
                      <Download size={15} /> Download Setup Installer
                    </button>
                  ) : null}

                  {portableAsset && (
                    <button
                      className="btn py-2 px-3.5 text-xs"
                      onClick={() => handleDownloadInApp(portableAsset.browser_download_url, portableAsset.name)}
                      disabled={downloading}
                    >
                      <Download size={14} /> Portable .exe
                    </button>
                  )}

                  {vsixAsset && (
                    <button
                      className="btn py-2 px-3.5 text-xs"
                      onClick={() => handleDownloadInApp(vsixAsset.browser_download_url, vsixAsset.name)}
                      disabled={downloading}
                    >
                      <Download size={14} /> VS Code Extension (.vsix)
                    </button>
                  )}

                  <button
                    className="btn py-2 px-3.5 text-xs"
                    onClick={() => handleOpenUrl(updateInfo?.releaseUrl || 'https://github.com/sagarkrjha/codeshelf/releases')}
                  >
                    <ExternalLink size={14} /> View on GitHub
                  </button>
                </div>

                {/* In-app Download Progress */}
                {downloading && downloadProgress && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5 text-text-muted">
                      <span>Downloading update...</span>
                      <span>
                        {downloadProgress.percent}% (
                        {(downloadProgress.downloaded / (1024 * 1024)).toFixed(1)} MB /{' '}
                        {(downloadProgress.total / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border-color overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-200"
                        style={{ width: `${downloadProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Download Completed Notification */}
                {downloadedResult && (
                  <div className="mt-4 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>
                        Downloaded <strong className="text-text-main">{downloadedResult.fileName}</strong> to Downloads folder!
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-primary text-xs py-1 px-2.5"
                        onClick={() => handleLaunchInstaller(downloadedResult.filePath)}
                      >
                        <Play size={12} /> Launch Installer
                      </button>
                      <button
                        className="btn text-xs py-1 px-2.5"
                        onClick={() => handleLaunchInstaller(downloadedResult.filePath)}
                      >
                        <Folder size={12} /> Open File
                      </button>
                    </div>
                  </div>
                )}

                {downloadError && (
                  <div className="mt-3 p-2.5 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{downloadError}</span>
                  </div>
                )}
              </div>

              {/* Release Notes */}
              <div>
                <div className="text-xs font-semibold mb-2 text-text-muted">
                  Release Notes — {updateInfo?.releaseName || `v${latestVersion}`}
                </div>
                <div
                  className="bg-bg-primary border border-border-color rounded-lg p-4 max-h-[220px] overflow-y-auto text-xs leading-relaxed prose prose-invert max-w-none text-gray-300"
                  dangerouslySetInnerHTML={{
                    __html:
                      typeof renderedNotes === 'string'
                        ? renderedNotes
                        : 'No changelog provided.',
                  }}
                />
              </div>
            </>
          )}

          {/* If No Update: Information */}
          {!hasUpdate && !isChecking && (
            <div className="bg-bg-primary border border-border-color rounded-lg p-5 text-center text-text-muted text-xs">
              <p className="mb-2">
                You have the latest version of CodeShelf installed (<strong className="text-text-main">v{currentVersion}</strong>).
              </p>
              <p className="text-[0.8rem] opacity-80">
                CodeShelf checks the official GitHub repository for new releases, bug fixes, and feature updates.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-color bg-bg-tertiary flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-main transition-colors">
            <input
              type="checkbox"
              checked={autoCheckStartup}
              onChange={(e) => handleToggleAutoCheck(e.target.checked)}
              className="accent-accent cursor-pointer rounded"
            />
            Check for updates automatically on startup
          </label>

          <button
            className="btn py-1.5 px-4 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
