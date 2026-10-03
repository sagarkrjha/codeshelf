import path from 'node:path';
import os from 'node:os';
import {
  CODESHELF_DIR_NAME,
  CODESHELF_PRIMARY_SNIPPET_FILENAME,
  CODESHELF_CONFIG_FILENAME,
} from '@codeshelf/shared';

export const STORAGE_DIR = path.join(os.homedir(), CODESHELF_DIR_NAME);
export const PRIMARY_STORAGE_FILE = path.join(STORAGE_DIR, CODESHELF_PRIMARY_SNIPPET_FILENAME);
export const CONFIG_FILE = path.join(STORAGE_DIR, CODESHELF_CONFIG_FILENAME);

export const IPC_CHANNELS = {
  // Sync
  GET_SNIPPETS_SYNC: 'get-snippets-sync',
  SAVE_SNIPPETS_SYNC: 'save-snippets-sync',
  GET_CONFIG_SYNC: 'get-config-sync',
  SAVE_CONFIG_SYNC: 'save-config-sync',

  // Async
  GET_SNIPPETS: 'get-snippets',
  SAVE_SNIPPETS: 'save-snippets',
  GET_CONFIG: 'get-config',
  SAVE_CONFIG: 'save-config',
  GET_APP_VERSION: 'get-app-version',
  CHECK_FOR_UPDATES: 'check-for-updates',
  OPEN_EXTERNAL_URL: 'open-external-url',
  DOWNLOAD_UPDATE_FILE: 'download-update-file',
  LAUNCH_INSTALLER: 'launch-installer',

  // Main to Renderer Events
  SNIPPETS_CHANGED: 'snippets-changed',
  CONFIG_CHANGED: 'config-changed',
  UPDATE_AVAILABLE: 'update-available',
  DOWNLOAD_PROGRESS: 'download-progress',
} as const;
