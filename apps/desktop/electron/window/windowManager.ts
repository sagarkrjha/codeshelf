import { app, BrowserWindow, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IPC_CHANNELS } from '../constants';
import { checkForUpdates } from '../services/updateService';
import { setupStorageWatcher } from '../services/watcherService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface WindowOptions {
  preloadPath: string;
}

export function createMainWindow(options: WindowOptions): BrowserWindow {
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
      preload: options.preloadPath,
    },
  });

  const devUrl =
    process.env.VITE_DEV_SERVER_URL ||
    (process.argv.includes('--dev') ? 'http://localhost:5173?app=1' : null);

  // In production bundle: __dirname is apps/desktop/dist
  // In dev / unbundled: __dirname is apps/desktop/electron/window or apps/desktop/electron
  const candidatePaths = [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, '../dist/index.html'),
    path.join(app.getAppPath(), 'dist/index.html'),
    path.join(app.getAppPath(), 'index.html'),
    path.join(__dirname, '../../web/dist/index.html'),
  ];
  const indexPath = candidatePaths.find((p) => fs.existsSync(p));

  const loadLocalFile = () => {
    if (indexPath && fs.existsSync(indexPath)) {
      win.loadFile(indexPath, { query: { app: '1' } });
    } else {
      console.error('Could not find index.html in candidates:', candidatePaths);
    }
  };

  if (devUrl) {
    const formattedDevUrl = devUrl.includes('?') ? devUrl : `${devUrl}?app=1`;
    win.loadURL(formattedDevUrl).catch(() => {
      loadLocalFile();
    });
  } else if (indexPath) {
    loadLocalFile();
  } else {
    win.loadURL('http://localhost:5173?app=1').catch(() => {
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
          win.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, info);
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.warn('Auto-update check notice:', error?.message);
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

  // Watch for external modifications to ~/.codeshelf/
  setupStorageWatcher(win);

  return win;
}
