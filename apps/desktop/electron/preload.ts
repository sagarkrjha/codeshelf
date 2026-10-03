import { contextBridge, ipcRenderer } from 'electron';
import type {
  Snippet,
  AppUpdateInfo,
  CodeShelfApi,
  CodeShelfConfig,
  DownloadProgress,
  DownloadResult,
} from '@codeshelf/shared';
import { IPC_CHANNELS } from './constants';

const api: CodeShelfApi = {
  getSnippets: (): Snippet[] | null => {
    try {
      return ipcRenderer.sendSync(IPC_CHANNELS.GET_SNIPPETS_SYNC);
    } catch (err) {
      console.error('Preload: error in getSnippets:', err);
      return null;
    }
  },

  saveSnippets: (snippets: Snippet[]): boolean => {
    try {
      return ipcRenderer.sendSync(IPC_CHANNELS.SAVE_SNIPPETS_SYNC, snippets);
    } catch (err) {
      console.error('Preload: error in saveSnippets:', err);
      return false;
    }
  },

  onSnippetsChanged: (callback: (snippets: Snippet[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snippets: Snippet[]) => {
      try {
        callback(snippets);
      } catch (err) {
        console.error('Preload: error in snippets-changed listener:', err);
      }
    };
    ipcRenderer.on(IPC_CHANNELS.SNIPPETS_CHANGED, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SNIPPETS_CHANGED, listener);
    };
  },

  getConfig: (): CodeShelfConfig => {
    try {
      return ipcRenderer.sendSync(IPC_CHANNELS.GET_CONFIG_SYNC);
    } catch (err) {
      console.error('Preload: error in getConfig:', err);
      return null as unknown as CodeShelfConfig;
    }
  },

  saveConfig: (config: Partial<CodeShelfConfig>): boolean => {
    try {
      return ipcRenderer.sendSync(IPC_CHANNELS.SAVE_CONFIG_SYNC, config);
    } catch (err) {
      console.error('Preload: error in saveConfig:', err);
      return false;
    }
  },

  onConfigChanged: (callback: (config: CodeShelfConfig) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, config: CodeShelfConfig) => {
      try {
        callback(config);
      } catch (err) {
        console.error('Preload: error in config-changed listener:', err);
      }
    };
    ipcRenderer.on(IPC_CHANNELS.CONFIG_CHANGED, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CONFIG_CHANGED, listener);
    };
  },

  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION);
  },

  checkForUpdates: (): Promise<AppUpdateInfo> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECK_FOR_UPDATES);
  },

  openExternalUrl: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_URL, url);
  },

  downloadUpdateFile: (url: string, fileName?: string): Promise<DownloadResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_UPDATE_FILE, url, fileName);
  },

  launchInstaller: (filePath: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_INSTALLER, filePath);
  },

  onUpdateAvailable: (callback: (info: AppUpdateInfo) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: AppUpdateInfo) => {
      try {
        callback(info);
      } catch (err) {
        console.error('Preload: error in update-available listener:', err);
      }
    };
    ipcRenderer.on(IPC_CHANNELS.UPDATE_AVAILABLE, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_AVAILABLE, listener);
    };
  },

  onDownloadProgress: (callback: (progress: DownloadProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: DownloadProgress) => {
      try {
        callback(progress);
      } catch (err) {
        console.error('Preload: error in download-progress listener:', err);
      }
    };
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_PROGRESS, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_PROGRESS, listener);
    };
  },
};

contextBridge.exposeInMainWorld('codeshelfApi', api);
