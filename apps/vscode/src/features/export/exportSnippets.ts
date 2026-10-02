import * as vscode from 'vscode';
import { serializeSnippetToMarkdown } from '@codeshelf/shared';
import type { SnippetsStorage } from '../../shared/storage';

export function registerExportCommand(
  storage: SnippetsStorage
) {
  return vscode.commands.registerCommand('codeshelf.exportSnippets', async () => {
    const snippets = storage.getSnippets();
    if (snippets.length === 0) {
      vscode.window.showInformationMessage('No snippets to export.');
      return;
    }

    const folderUri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: 'Select Export Destination Folder',
    });

    if (!folderUri || folderUri.length === 0) return;

    const targetDir = folderUri[0]!;
    for (const snippet of snippets) {
      const safeName = snippet.title
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_');
      const fileUri = vscode.Uri.joinPath(targetDir, `${safeName}.md`);
      const content = serializeSnippetToMarkdown(snippet);
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
    }

    vscode.window.showInformationMessage(
      `CodeShelf: Exported ${snippets.length} snippet(s) to Markdown successfully!`
    );
  });
}
