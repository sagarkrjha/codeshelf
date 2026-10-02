import { useState, useEffect, useCallback } from 'react';
import type { AppUpdateInfo } from '@codeshelf/shared';

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('0.1.0');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  useEffect(() => {
    if (window.codeshelfApi?.getAppVersion) {
      window.codeshelfApi.getAppVersion().then((ver) => {
        if (ver) setAppVersion(ver);
      });
    }

    let unsubscribeUpdates: (() => void) | undefined;
    if (typeof window !== 'undefined' && window.codeshelfApi?.onUpdateAvailable) {
      unsubscribeUpdates = window.codeshelfApi.onUpdateAvailable((info) => {
        setUpdateInfo(info);
        setIsBannerDismissed(false);
      });
    }

    return () => {
      unsubscribeUpdates?.();
    };
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    setIsCheckingUpdate(true);
    try {
      if (window.codeshelfApi?.checkForUpdates) {
        const info = await window.codeshelfApi.checkForUpdates();
        setUpdateInfo(info);
      } else {
        setUpdateInfo({
          currentVersion: appVersion,
          latestVersion: appVersion,
          latestTag: `v${appVersion}`,
          hasUpdate: false,
          releaseName: 'Browser Preview Mode',
          releaseNotes: 'Update checking requires the CodeShelf desktop application.',
          publishedAt: new Date().toISOString(),
          releaseUrl: 'https://github.com/sagarkrjha/codeshelf/releases',
          assets: [],
        });
      }
    } catch (err) {
      console.error('Failed to check for updates', err);
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [appVersion]);

  return {
    updateInfo,
    isCheckingUpdate,
    isBannerDismissed,
    setIsBannerDismissed,
    appVersion,
    isUpdateModalOpen,
    setIsUpdateModalOpen,
    handleCheckForUpdates,
  };
}
