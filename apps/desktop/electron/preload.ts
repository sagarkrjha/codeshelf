import { contextBridge, ipcRenderer } from 'electron';
import type { Snippet, AppUpdateInfo, CodeShelfApi, DownloadProgress, DownloadResult } from '@codeshelf/shared';


const api: CodeShelfApi = {
  getSnippets: (): Snippet[] | null => {
    try {
      return ipcRenderer.sendSync('get-snippets-sync');
    } catch (err) {
      console.error('Preload: error in getSnippets:', err);
      return null;
    }
  },
  saveSnippets: (snippets: Snippet[]): boolean => {
    try {
      return ipcRenderer.sendSync('save-snippets-sync', snippets);
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
    ipcRenderer.on('snippets-changed', listener);
    return () => {
      ipcRenderer.removeListener('snippets-changed', listener);
    };
  },
  getConfig: (): any => {
    try {
      return ipcRenderer.sendSync('get-config-sync');
    } catch (err) {
      console.error('Preload: error in getConfig:', err);
      return null;
    }
  },
  saveConfig: (config: any): boolean => {
    try {
      return ipcRenderer.sendSync('save-config-sync', config);
    } catch (err) {
      console.error('Preload: error in saveConfig:', err);
      return false;
    }
  },
  onConfigChanged: (callback: (config: any) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, config: any) => {
      try {
        callback(config);
      } catch (err) {
        console.error('Preload: error in config-changed listener:', err);
      }
    };
    ipcRenderer.on('config-changed', listener);
    return () => {
      ipcRenderer.removeListener('config-changed', listener);
    };
  },

  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('get-app-version');
  },
  checkForUpdates: (): Promise<AppUpdateInfo> => {
    return ipcRenderer.invoke('check-for-updates');
  },
  openExternalUrl: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke('open-external-url', url);
  },
  downloadUpdateFile: (url: string, fileName?: string): Promise<DownloadResult> => {
    return ipcRenderer.invoke('download-update-file', url, fileName);
  },
  launchInstaller: (filePath: string): Promise<boolean> => {
    return ipcRenderer.invoke('launch-installer', filePath);
  },
  onUpdateAvailable: (callback: (info: AppUpdateInfo) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: AppUpdateInfo) => {
      try {
        callback(info);
      } catch (err) {
        console.error('Preload: error in update-available listener:', err);
      }
    };
    ipcRenderer.on('update-available', listener);
    return () => {
      ipcRenderer.removeListener('update-available', listener);
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
    ipcRenderer.on('download-progress', listener);
    return () => {
      ipcRenderer.removeListener('download-progress', listener);
    };
  },
};

contextBridge.exposeInMainWorld('codeshelfApi', api);
