import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc/registerIpcHandlers';
import { createMainWindow } from './window/windowManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPreloadPath(): string {
  const cjsPath = path.join(__dirname, 'preload.cjs');
  const jsPath = path.join(__dirname, 'preload.js');
  return fs.existsSync(cjsPath) ? cjsPath : jsPath;
}

let mainWindow: ReturnType<typeof createMainWindow> | null = null;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(initApp);
}

function initApp(): void {
  registerIpcHandlers();

  const preloadPath = getPreloadPath();
  mainWindow = createMainWindow({ preloadPath });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
