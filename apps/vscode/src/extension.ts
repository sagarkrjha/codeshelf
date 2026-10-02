import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { SnippetsStorage, CODESHELF_DIR, SNIPPETS_FILE, ensureDirExists } from './shared/storage';
import { SnippetsTreeProvider } from './features/explorer';
import { registerCaptureCommand } from './features/capture';
import { registerAiCommands } from './features/ai';
import { registerSearchCommands } from './features/search';
import { registerExportCommand } from './features/export';
import { checkExtensionUpdates } from './features/updates';

export function activate(context: vscode.ExtensionContext) {
  const storage = new SnippetsStorage(context);
  const treeProvider = new SnippetsTreeProvider(storage.getSnippets);
  vscode.window.registerTreeDataProvider('codeshelf.snippetsView', treeProvider);

  // File watcher for ~/.codeshelf/snippets.json
  try {
    ensureDirExists(CODESHELF_DIR);
    let debounceTimer: NodeJS.Timeout | null = null;
    const watcher = fs.watch(CODESHELF_DIR, (_eventType, filename) => {
      if (!filename || filename === 'snippets.json') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!fs.existsSync(SNIPPETS_FILE)) return;
          try {
            const currentData = fs.readFileSync(SNIPPETS_FILE, 'utf-8');
            if (currentData !== storage.getLastKnownContent()) {
              storage.setLastKnownContent(currentData);
              treeProvider.refresh();
            }
          } catch (err) {
            console.error('CodeShelf: Error checking external file change:', err);
          }
        }, 100);
      }
    });

    context.subscriptions.push({
      dispose: () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        watcher.close();
      },
    });
  } catch (err) {
    console.error('CodeShelf: Error setting up file watcher:', err);
  }

  // Command: Refresh Snippets
  const refreshCommand = vscode.commands.registerCommand('codeshelf.refreshSnippets', () => {
    treeProvider.refresh();
    vscode.window.showInformationMessage('CodeShelf: Snippets refreshed.');
  });

  // Feature: Capture
  const saveSelectionCommand = registerCaptureCommand(storage, treeProvider);

  // Feature: AI (Autofill, Commit, API key management)
  const aiCommands = registerAiCommands(storage, treeProvider);

  // Feature: Search, Insert & Delete
  const searchCommands = registerSearchCommands(storage);

  // Feature: Export
  const exportSnippetsCommand = registerExportCommand(storage);

  // Feature: Updates
  const extVersion = (context.extension?.packageJSON?.version as string) || '0.1.0';
  const checkForUpdatesCommand = vscode.commands.registerCommand(
    'codeshelf.checkForUpdates',
    () => {
      checkExtensionUpdates(extVersion, false);
    }
  );

  // Background auto-check on startup
  setTimeout(() => {
    checkExtensionUpdates(extVersion, true);
  }, 4000);

  context.subscriptions.push(
    refreshCommand,
    saveSelectionCommand,
    ...aiCommands,
    ...searchCommands,
    exportSnippetsCommand,
    checkForUpdatesCommand
  );
}

export function deactivate() {}
