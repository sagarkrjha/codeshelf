import { app, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import type { Snippet, CodeShelfConfig } from '@codeshelf/shared';
import { IPC_CHANNELS } from '../constants';
import {
  readSnippetsFromFile,
  writeSnippetsToFile,
  readConfigFile,
  writeConfigFile,
} from '../services/storageService';
import {
  checkForUpdates,
  downloadUpdateFile,
} from '../services/updateService';

export function registerIpcHandlers(): void {
  // Synchronous Snippets Handlers
  ipcMain.on(IPC_CHANNELS.GET_SNIPPETS_SYNC, (event) => {
    event.returnValue = readSnippetsFromFile();
  });

  ipcMain.on(IPC_CHANNELS.SAVE_SNIPPETS_SYNC, (event, snippets: Snippet[]) => {
    if (!Array.isArray(snippets)) {
      event.returnValue = false;
      return;
    }
    event.returnValue = writeSnippetsToFile(snippets);
  });

  // Asynchronous Snippets Handlers
  ipcMain.handle(IPC_CHANNELS.GET_SNIPPETS, async () => {
    return readSnippetsFromFile();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_SNIPPETS, async (_event, snippets: Snippet[]) => {
    if (!Array.isArray(snippets)) {
      return false;
    }
    return writeSnippetsToFile(snippets);
  });

  // Synchronous Config Handlers
  ipcMain.on(IPC_CHANNELS.GET_CONFIG_SYNC, (event) => {
    event.returnValue = readConfigFile();
  });

  ipcMain.on(IPC_CHANNELS.SAVE_CONFIG_SYNC, (event, config: Partial<CodeShelfConfig>) => {
    if (!config || typeof config !== 'object') {
      event.returnValue = false;
      return;
    }
    event.returnValue = writeConfigFile(config);
  });

  // Asynchronous Config Handlers
  ipcMain.handle(IPC_CHANNELS.GET_CONFIG, async () => {
    return readConfigFile();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_CONFIG, async (_event, config: Partial<CodeShelfConfig>) => {
    if (!config || typeof config !== 'object') {
      return false;
    }
    return writeConfigFile(config);
  });

  // App & Updates Handlers
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
    return app.getVersion() || '0.1.0';
  });

  ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, async () => {
    const version = app.getVersion() || '0.1.0';
    return checkForUpdates(version);
  });

  // External URLs
  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL_URL, async (_e, rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        await shell.openExternal(parsed.href);
        return true;
      }
    } catch {}
    return false;
  });

  // Update Download & Install
  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_UPDATE_FILE, async (event, url: string, fileName?: string) => {
    return downloadUpdateFile(url, fileName, (progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_CHANNELS.DOWNLOAD_PROGRESS, progress);
      }
    });
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCH_INSTALLER, async (_e, filePath: string) => {
    if (filePath && typeof filePath === 'string' && fs.existsSync(filePath)) {
      shell.openPath(filePath);
      return true;
    }
    return false;
  });
}
