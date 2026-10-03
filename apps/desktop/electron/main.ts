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

function initApp(): void {
  registerIpcHandlers();

  const preloadPath = getPreloadPath();
  createMainWindow({ preloadPath });
}

app.whenReady().then(initApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
