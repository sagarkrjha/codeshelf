import * as vscode from 'vscode';
import { isNewerVersion } from '@codeshelf/shared';

export async function checkExtensionUpdates(currentVersion: string, silentIfNoUpdate = false): Promise<void> {
  const endpoint = new URL('https://api.github.com/repos/sagarkrjha/codeshelf/releases/latest');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'CodeShelf-VSCode-Extension',
        Accept: 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const release = (await response.json()) as any;
      const latestTag = release.tag_name || '';
      const latestVersion = latestTag.replace(/^v/i, '');
      if (isNewerVersion(latestVersion, currentVersion)) {
        const vsixAsset = (release.assets || []).find((a: any) =>
          typeof a.name === 'string' && a.name.endsWith('.vsix')
        );
        const action = await vscode.window.showInformationMessage(
          `CodeShelf: A new version v${latestVersion} is available! (Current: v${currentVersion})`,
          vsixAsset ? 'Download VSIX' : 'View Release',
          'Release Notes'
        );
        if (action === 'Download VSIX' && vsixAsset) {
          vscode.env.openExternal(vscode.Uri.parse(vsixAsset.browser_download_url));
        } else if (action === 'View Release' || action === 'Release Notes') {
          vscode.env.openExternal(
            vscode.Uri.parse(release.html_url || 'https://github.com/sagarkrjha/codeshelf/releases')
          );
        }
      } else if (!silentIfNoUpdate) {
        vscode.window.showInformationMessage(
          `CodeShelf is up to date (v${currentVersion}).`
        );
      }
    } else if (!silentIfNoUpdate) {
      vscode.window.showInformationMessage(
        `CodeShelf: You are running the newest build (v${currentVersion}).`
      );
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (!silentIfNoUpdate) {
      if (err?.name === 'AbortError') {
        vscode.window.showWarningMessage('CodeShelf: Update check timed out.');
      } else {
        vscode.window.showWarningMessage(
          'CodeShelf: Could not check for updates. Please check your network connection.'
        );
      }
    }
  }
}
