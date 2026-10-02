import type { Snippet } from './models';
import type { AppUpdateInfo } from '../features/updates';
import type { CodeShelfConfig } from '../features/config';

export interface DownloadProgress {
  percent: number;
  downloaded: number;
  total: number;
}

export interface DownloadResult {
  success: boolean;
  filePath: string;
  fileName: string;
}

export interface CodeShelfApi {
  getSnippets: () => Snippet[] | null;
  saveSnippets: (snippets: Snippet[]) => boolean;
  onSnippetsChanged: (callback: (snippets: Snippet[]) => void) => () => void;
  getConfig: () => CodeShelfConfig;
  saveConfig: (config: Partial<CodeShelfConfig>) => boolean;
  onConfigChanged: (callback: (config: CodeShelfConfig) => void) => () => void;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<AppUpdateInfo>;
  openExternalUrl: (url: string) => Promise<boolean>;
  downloadUpdateFile: (url: string, fileName?: string) => Promise<DownloadResult>;
  launchInstaller: (filePath: string) => Promise<boolean>;
  onUpdateAvailable: (callback: (info: AppUpdateInfo) => void) => () => void;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
}

