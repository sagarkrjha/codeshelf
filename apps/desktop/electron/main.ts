import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  isNewerVersion,
  type Snippet,
  type AppUpdateInfo,
  type DownloadProgress,
  type DownloadResult,
  type CodeShelfConfig,
  CODESHELF_DIR_NAME,
  CODESHELF_SNIPPETS_FILENAME,
  CODESHELF_CONFIG_FILENAME,
  DEFAULT_CODESHELF_CONFIG,
  validateConfig,
  mergeConfig,
  mergeSnippets,
} from '@codeshelf/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.join(os.homedir(), CODESHELF_DIR_NAME);
const STORAGE_FILE = path.join(STORAGE_DIR, CODESHELF_SNIPPETS_FILENAME);
const CONFIG_FILE = path.join(STORAGE_DIR, CODESHELF_CONFIG_FILENAME);

let lastKnownSnippetsContent = '';
let lastKnownConfigContent = '';

function ensureStorageDir(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function readConfigFile(): CodeShelfConfig {
  ensureStorageDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    try {
      const defaultStr = JSON.stringify(DEFAULT_CODESHELF_CONFIG, null, 2);
      fs.writeFileSync(CONFIG_FILE, defaultStr, 'utf-8');
      lastKnownConfigContent = defaultStr;
    } catch {}
    return { ...DEFAULT_CODESHELF_CONFIG };
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    lastKnownConfigContent = raw;
    const parsed = JSON.parse(raw);
    return validateConfig(parsed);
  } catch (err) {
    console.error('Failed to read config file:', err);
    return { ...DEFAULT_CODESHELF_CONFIG };
  }
}

function writeConfigFile(incomingConfig: Partial<CodeShelfConfig>): boolean {
  ensureStorageDir();
  try {
    const current = readConfigFile();
    const merged = mergeConfig(current, incomingConfig);
    const data = JSON.stringify(merged, null, 2);
    lastKnownConfigContent = data;
    fs.writeFileSync(CONFIG_FILE, data, 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write config file:', err);
    return false;
  }
}

function readSnippetsFromFile(): Snippet[] | null {
  ensureStorageDir();
  if (!fs.existsSync(STORAGE_FILE)) {
    return null;
  }
  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
    lastKnownSnippetsContent = data;
    return JSON.parse(data) as Snippet[];
  } catch (err) {
    console.error('Failed to read snippets file:', err);
    return null;
  }
}

function writeSnippetsToFile(snippets: Snippet[]): boolean {
  ensureStorageDir();
  try {
    let finalSnippets = snippets;
    if (fs.existsSync(STORAGE_FILE)) {
      try {
        const diskData = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const diskSnippets = JSON.parse(diskData);
        if (Array.isArray(diskSnippets)) {
          finalSnippets = mergeSnippets(diskSnippets, snippets).merged;
        }
      } catch {}
    }
    const data = JSON.stringify(finalSnippets, null, 2);
    lastKnownSnippetsContent = data;
    fs.writeFileSync(STORAGE_FILE, data, 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write snippets file:', err);
    return false;
  }
}


// GitHub Releases update checker using WHATWG URL and fetch APIs
async function checkForUpdates(currentVersion: string): Promise<AppUpdateInfo> {
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
      const release = (await res.json()) as any;
      const latestTag = release.tag_name || '';
      const latestVersion = latestTag.replace(/^v/i, '');
      const hasUpdate = isNewerVersion(latestVersion, currentVersion);

      const assets = (release.assets || []).map((a: any) => ({
        name: a.name,
        browser_download_url: a.browser_download_url,
        size: a.size,
      }));

      const setupAsset =
        assets.find((a: any) => a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe')) ||
        assets.find((a: any) => a.name.endsWith('.exe'));

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
  } catch (err: any) {
    clearTimeout(timer);
    const isTimeout = err?.name === 'AbortError';
    return {
      currentVersion,
      latestVersion: currentVersion,
      latestTag: 'v' + currentVersion,
      hasUpdate: false,
      releaseName: isTimeout ? 'Connection Timeout' : 'Connection Offline',
      releaseNotes: isTimeout
        ? 'Update check timed out.'
        : `Could not connect to GitHub release server: ${err?.message || 'Check your network connection.'}`,
      publishedAt: new Date().toISOString(),
      releaseUrl: 'https://github.com/sagarkrjha/codeshelf/releases',
      assets: [],
    };
  }
}

// In-app update file downloader using WHATWG URL and fetch APIs
async function downloadUpdateFile(
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
    try { fs.unlinkSync(targetPath); } catch {}
    throw err;
  }
}

// Register IPC handlers
ipcMain.on('get-snippets-sync', (event) => {
  event.returnValue = readSnippetsFromFile();
});

ipcMain.on('save-snippets-sync', (event, snippets: Snippet[]) => {
  event.returnValue = writeSnippetsToFile(snippets);
});

ipcMain.handle('get-snippets', async () => {
  return readSnippetsFromFile();
});

ipcMain.handle('save-snippets', async (_event, snippets: Snippet[]) => {
  return writeSnippetsToFile(snippets);
});

ipcMain.on('get-config-sync', (event) => {
  event.returnValue = readConfigFile();
});

ipcMain.on('save-config-sync', (event, config: Partial<CodeShelfConfig>) => {
  event.returnValue = writeConfigFile(config);
});

ipcMain.handle('get-config', async () => {
  return readConfigFile();
});

ipcMain.handle('save-config', async (_event, config: Partial<CodeShelfConfig>) => {
  return writeConfigFile(config);
});


ipcMain.handle('get-app-version', () => {
  return app.getVersion() || '0.1.0';
});

ipcMain.handle('check-for-updates', async () => {
  const version = app.getVersion() || '0.1.0';
  return checkForUpdates(version);
});

ipcMain.handle('open-external-url', async (_e, rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      await shell.openExternal(parsed.href);
      return true;
    }
  } catch {}
  return false;
});

ipcMain.handle('download-update-file', async (event, url: string, fileName?: string) => {
  return downloadUpdateFile(url, fileName, (progress) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('download-progress', progress);
    }
  });
});

ipcMain.handle('launch-installer', async (_e, filePath: string) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.openPath(filePath);
    return true;
  }
  return false;
});

function createWindow(): void {
  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'CodeShelf — Snippet Knowledge System',
    backgroundColor: '#121417',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: preloadPath,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || (process.argv.includes('--dev') ? 'http://localhost:5173' : null);
  const localDistPath = fs.existsSync(path.join(__dirname, 'index.html'))
    ? path.join(__dirname, 'index.html')
    : path.join(__dirname, '../dist/index.html');
  const webDistPath = path.join(__dirname, '../../web/dist/index.html');
  const indexPath = fs.existsSync(localDistPath) ? localDistPath : webDistPath;

  if (devUrl) {
    win.loadURL(devUrl).catch(() => {
      if (fs.existsSync(indexPath)) {
        win.loadFile(indexPath);
      }
    });
  } else if (fs.existsSync(indexPath)) {
    win.loadFile(indexPath);
  } else {
    win.loadURL('http://localhost:5173').catch(() => {
      console.error('Could not load dist/index.html or dev server on http://localhost:5173');
    });
  }

  win.once('ready-to-show', () => {
    win.show();

    // Auto-check for updates 3.5 seconds after app starts
    setTimeout(async () => {
      try {
        const version = app.getVersion() || '0.1.0';
        const info = await checkForUpdates(version);
        if (info && info.hasUpdate && !win.isDestroyed()) {
          win.webContents.send('update-available', info);
        }
      } catch (err: any) {
        console.warn('Auto-update check notice:', err.message);
      }
    }, 3500);
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('did-fail-load:', errorCode, errorDescription, validatedURL);
  });

  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(parsed.href);
      }
    } catch {}
    return { action: 'deny' };
  });

  // Watch for external modifications to ~/.codeshelf/ (snippets.json and config.json)
  ensureStorageDir();
  readConfigFile(); // Ensures config.json is created on initial launch if not present
  let debounceSnippetsTimer: ReturnType<typeof setTimeout> | null = null;
  let debounceConfigTimer: ReturnType<typeof setTimeout> | null = null;
  try {
    const watcher = fs.watch(STORAGE_DIR, (_eventType, filename) => {
      if (!filename || filename === CODESHELF_SNIPPETS_FILENAME) {
        if (debounceSnippetsTimer) clearTimeout(debounceSnippetsTimer);
        debounceSnippetsTimer = setTimeout(() => {
          if (!fs.existsSync(STORAGE_FILE)) return;
          try {
            const currentData = fs.readFileSync(STORAGE_FILE, 'utf-8');
            if (currentData !== lastKnownSnippetsContent) {
              lastKnownSnippetsContent = currentData;
              const snippets = JSON.parse(currentData);
              if (Array.isArray(snippets) && !win.isDestroyed()) {
                win.webContents.send('snippets-changed', snippets);
              }
            }
          } catch (err) {
            console.error('Error handling external snippets file change:', err);
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
              const config = validateConfig(JSON.parse(currentData));
              if (!win.isDestroyed()) {
                win.webContents.send('config-changed', config);
              }
            }
          } catch (err) {
            console.error('Error handling external config file change:', err);
          }
        }, 100);
      }
    });

    win.on('closed', () => {
      if (debounceSnippetsTimer) clearTimeout(debounceSnippetsTimer);
      if (debounceConfigTimer) clearTimeout(debounceConfigTimer);
      watcher.close();
    });
  } catch (err) {
    console.error('Failed to setup storage file watcher:', err);
  }

}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
