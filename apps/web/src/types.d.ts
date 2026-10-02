import type { CodeShelfApi, DownloadProgress, DownloadResult } from '@codeshelf/shared';

declare module '*.css';

export type { CodeShelfApi, DownloadProgress, DownloadResult };

declare global {
  interface Window {
    codeshelfApi?: CodeShelfApi;
  }
}
