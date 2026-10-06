import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { isNewerVersion } from '@codeshelf/shared';

export async function checkExtensionUpdates(
  currentVersion: string,
  silentIfNoUpdate = false,
  context?: vscode.ExtensionContext
): Promise<void> {
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

        if (vsixAsset) {
          const action = await vscode.window.showInformationMessage(
            `CodeShelf: A new version v${latestVersion} is available! (Current: v${currentVersion})`,
            'Update Now',
            'Release Notes'
          );

          if (action === 'Update Now') {
            await installExtensionUpdate(vsixAsset.browser_download_url, latestVersion, context);
          } else if (action === 'Release Notes') {
            vscode.env.openExternal(
              vscode.Uri.parse(release.html_url || 'https://github.com/sagarkrjha/codeshelf/releases')
            );
          }
        } else {
          const action = await vscode.window.showInformationMessage(
            `CodeShelf: A new version v${latestVersion} is available! (Current: v${currentVersion})`,
            'View Release'
          );
          if (action === 'View Release') {
            vscode.env.openExternal(
              vscode.Uri.parse(release.html_url || 'https://github.com/sagarkrjha/codeshelf/releases')
            );
          }
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

async function installExtensionUpdate(
  downloadUrl: string,
  version: string,
  context?: vscode.ExtensionContext
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Updating CodeShelf to v${version}...`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: 'Downloading extension package...' });

      const tempDir = context?.globalStorageUri?.fsPath || os.tmpdir();
      if (!fs.existsSync(tempDir)) {
        try {
          fs.mkdirSync(tempDir, { recursive: true });
        } catch {}
      }

      const tempVsixPath = path.join(tempDir, `codeshelf-${version}.vsix`);

      try {
        const response = await fetch(downloadUrl, {
          headers: {
            'User-Agent': 'CodeShelf-VSCode-Extension',
          },
        });

        if (!response.ok) {
          throw new Error(`Download failed with status ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.promises.writeFile(tempVsixPath, buffer);

        progress.report({ message: 'Installing into VS Code...' });

        // Install internally via VS Code extension management command
        await vscode.commands.executeCommand(
          'workbench.extensions.installExtension',
          vscode.Uri.file(tempVsixPath)
        );

        // Cleanup temporary vsix
        try {
          await fs.promises.unlink(tempVsixPath);
        } catch {}

        const reloadChoice = await vscode.window.showInformationMessage(
          `CodeShelf has been successfully updated to v${version}! Please reload VS Code to apply.`,
          'Reload Window'
        );

        if (reloadChoice === 'Reload Window') {
          await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `CodeShelf update failed: ${err?.message || 'Unknown error'}. You can install manually from GitHub releases.`
        );
        try {
          if (fs.existsSync(tempVsixPath)) {
            await fs.promises.unlink(tempVsixPath);
          }
        } catch {}
      }
    }
  );
}

