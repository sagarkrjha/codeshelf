import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {
  isNewerVersion,
  type AppUpdateInfo,
  type DownloadProgress,
  type DownloadResult,
} from '@codeshelf/shared';

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GitHubRelease {
  tag_name?: string;
  name?: string;
  body?: string;
  published_at?: string;
  html_url?: string;
  assets?: GitHubAsset[];
}

function selectAssetForPlatform(assets: GitHubAsset[], platform: NodeJS.Platform): GitHubAsset | undefined {
  if (platform === 'win32') {
    return (
      assets.find((a) => a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe')) ||
      assets.find((a) => a.name.endsWith('.exe'))
    );
  }
  if (platform === 'darwin') {
    return (
      assets.find((a) => a.name.endsWith('.dmg')) ||
      assets.find((a) => a.name.endsWith('.zip'))
    );
  }
  return (
    assets.find((a) => a.name.endsWith('.AppImage')) ||
    assets.find((a) => a.name.endsWith('.deb')) ||
    assets.find((a) => a.name.endsWith('.rpm'))
  );
}

export async function checkForUpdates(currentVersion: string): Promise<AppUpdateInfo> {
  const endpoint = new URL('https://api.github.com/repos/sagarkrjha/codeshelf/releases/latest');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'CodeShelf-Desktop-App',
        Accept: 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 200) {
      const release = (await res.json()) as GitHubRelease;
      const latestTag = release.tag_name || '';
      const latestVersion = latestTag.replace(/^v/i, '');
      const hasUpdate = isNewerVersion(latestVersion, currentVersion);

      const assets: GitHubAsset[] = (release.assets || []).map((a) => ({
        name: a.name,
        browser_download_url: a.browser_download_url,
        size: a.size,
      }));

      const setupAsset = selectAssetForPlatform(assets, process.platform);

      return {
        currentVersion,
        latestVersion,
        latestTag,
        hasUpdate,
        releaseName: release.name || latestTag,
        releaseNotes: release.body || 'No release notes provided for this version.',
        publishedAt: release.published_at || new Date().toISOString(),
        releaseUrl: release.html_url || 'https://github.com/sagarkrjha/codeshelf/releases',
        downloadUrl: setupAsset ? setupAsset.browser_download_url : (release.html_url || ''),
        assets,
      };
    } else {
      return {
        currentVersion,
        latestVersion: currentVersion,
        latestTag: 'v' + currentVersion,
        hasUpdate: false,
        releaseName: 'Up to Date',
        releaseNotes:
          res.status === 404
            ? 'No published releases found on GitHub. You are running the newest local build.'
            : `GitHub check returned status ${res.status}.`,
        publishedAt: new Date().toISOString(),
        releaseUrl: 'https://github.com/sagarkrjha/codeshelf/releases',
        assets: [],
      };
    }
  } catch (err: unknown) {
    clearTimeout(timer);
    const error = err as { name?: string; message?: string };
    const isTimeout = error?.name === 'AbortError';
    return {
      currentVersion,
      latestVersion: currentVersion,
      latestTag: 'v' + currentVersion,
      hasUpdate: false,
      releaseName: isTimeout ? 'Connection Timeout' : 'Connection Offline',
      releaseNotes: isTimeout
        ? 'Update check timed out.'
        : `Could not connect to GitHub release server: ${error?.message || 'Check your network connection.'}`,
      publishedAt: new Date().toISOString(),
      releaseUrl: 'https://github.com/sagarkrjha/codeshelf/releases',
      assets: [],
    };
  }
}

export async function downloadUpdateFile(
  rawUrl: string,
  fileName?: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadResult> {
  const downloadsDir = app.getPath('downloads');
  const safeName = fileName || 'CodeShelf-Update.exe';
  const targetPath = path.join(downloadsDir, safeName);

  const targetUrl = new URL(rawUrl);
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'CodeShelf-Desktop-App',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const total = parseInt(response.headers.get('content-length') || '0', 10);
  let downloaded = 0;

  const outStream = fs.createWriteStream(targetPath);
  const reader = response.body?.getReader();
  if (!reader) {
    outStream.close();
    throw new Error('Response body reader unavailable');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        downloaded += value.length;
        outStream.write(Buffer.from(value));
        if (onProgress && total > 0) {
          onProgress({
            percent: Math.min(100, Math.round((downloaded / total) * 100)),
            downloaded,
            total,
          });
        }
      }
    }
    await new Promise<void>((resolve, reject) => {
      outStream.end(() => resolve());
      outStream.on('error', reject);
    });
    return { success: true, filePath: targetPath, fileName: safeName };
  } catch (err) {
    outStream.close();
    try {
      fs.unlinkSync(targetPath);
    } catch {}
    throw err;
  }
}

export async function quitAndInstallUpdate(filePath: string): Promise<boolean> {
  const resolvedTarget = path.resolve(filePath);
  if (!fs.existsSync(resolvedTarget)) {
    return false;
  }

  const { spawn } = await import('node:child_process');

  if (process.platform === 'win32') {
    // On Windows, NSIS installers accept /S for silent install or standard execution
    // Spawn detached so installer continues running after app exits
    const child = spawn(resolvedTarget, ['/S'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } else if (process.platform === 'darwin') {
    // On macOS, open the installer/dmg
    const child = spawn('open', [resolvedTarget], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } else {
    // Linux AppImage / deb / rpm
    try {
      fs.chmodSync(resolvedTarget, 0o755);
    } catch {}
    const child = spawn(resolvedTarget, [], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  }

  // Gracefully terminate the current application to let the installer update files
  setTimeout(() => {
    app.quit();
  }, 300);

  return true;
}

