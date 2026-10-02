import * as vscode from 'vscode';
import type { Snippet } from '@codeshelf/shared';
import type { SnippetsStorage } from '../../shared/storage';
import type { SnippetTreeItem } from '../explorer/snippetsTree';

export function registerSearchCommands(
  storage: SnippetsStorage
) {
  // Helper to extract snippet from command args
  const resolveSnippet = (snippetArg?: Snippet | SnippetTreeItem): Snippet | undefined => {
    if (snippetArg && 'code' in snippetArg) {
      return snippetArg;
    }
    if (snippetArg && 'snippet' in snippetArg && snippetArg.snippet) {
      return snippetArg.snippet;
    }
    return undefined;
  };

  // Command: Copy Code
  const copySnippetCommand = vscode.commands.registerCommand(
    'codeshelf.copySnippet',
    async (itemArg?: Snippet | SnippetTreeItem) => {
      const target = resolveSnippet(itemArg);
      if (target) {
        await vscode.env.clipboard.writeText(target.code);
        vscode.window.showInformationMessage(`CodeShelf: Copied "${target.title}" code to clipboard.`);
      }
    }
  );

  // Command: Copy Code as Markdown
  const copySnippetAsMarkdownCommand = vscode.commands.registerCommand(
    'codeshelf.copySnippetAsMarkdown',
    async (itemArg?: Snippet | SnippetTreeItem) => {
      const target = resolveSnippet(itemArg);
      if (target) {
        const md = `\`\`\`${target.language}\n${target.code}\n\`\`\``;
        await vscode.env.clipboard.writeText(md);
        vscode.window.showInformationMessage(
          `CodeShelf: Copied "${target.title}" as Markdown code block.`
        );
      }
    }
  );

  // Command: Search Snippets
  const searchSnippetsCommand = vscode.commands.registerCommand(
    'codeshelf.searchSnippets',
    async () => {
      const snippets = storage.getSnippets();
      if (snippets.length === 0) {
        vscode.window.showInformationMessage('No snippets saved yet in CodeShelf.');
        return;
      }

      const items = snippets.map((s) => ({
        label: s.title,
        description: `(${s.language}) ${s.category ? `• ${s.category}` : ''}`,
        detail: s.code.split(/\r?\n/)[0] || '',
        snippet: s,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Search snippets by title, domain, or language...',
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (!selected) return;

      const action = await vscode.window.showQuickPick(
        [
          { label: '$(symbol-snippet) Insert at cursor', action: 'insert' },
          { label: '$(copy) Copy code to clipboard', action: 'copy' },
          { label: '$(markdown) Copy code as Markdown', action: 'markdown' },
          { label: '$(trash) Delete snippet', action: 'delete' },
        ],
        { placeHolder: `Action for "${selected.snippet.title}":` }
      );

      if (action?.action === 'insert') {
        vscode.commands.executeCommand('codeshelf.insertSnippet', selected.snippet);
      } else if (action?.action === 'copy') {
        vscode.commands.executeCommand('codeshelf.copySnippet', selected.snippet);
      } else if (action?.action === 'markdown') {
        vscode.commands.executeCommand('codeshelf.copySnippetAsMarkdown', selected.snippet);
      } else if (action?.action === 'delete') {
        vscode.commands.executeCommand('codeshelf.deleteSnippet', selected.snippet);
      }
    }
  );

  // Command: Insert Snippet
  const insertSnippetCommand = vscode.commands.registerCommand(
    'codeshelf.insertSnippet',
    async (snippetArg?: Snippet | SnippetTreeItem) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor to insert snippet into.');
        return;
      }

      let snippet = resolveSnippet(snippetArg);
      if (!snippet) {
        const snippets = storage.getSnippets();
        if (snippets.length === 0) {
          vscode.window.showInformationMessage('No snippets available to insert.');
          return;
        }

        const items = snippets.map((s) => ({
          label: s.title,
          description: `(${s.language})`,
          detail: s.code.split(/\r?\n/)[0],
          snippet: s,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a snippet to insert at cursor position...',
        });

        if (selected) {
          snippet = selected.snippet;
        }
      }

      if (snippet) {
        await editor.edit((editBuilder) => {
          editBuilder.insert(editor.selection.active, snippet!.code);
        });
      }
    }
  );

  // Command: Delete Snippet
  const deleteSnippetCommand = vscode.commands.registerCommand(
    'codeshelf.deleteSnippet',
    async (itemArg?: Snippet | SnippetTreeItem) => {
      const target = resolveSnippet(itemArg);
      if (!target) return;

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete snippet "${target.title}"?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        const remaining = storage.getSnippets().filter((s) => s.id !== target.id);
        await storage.saveSnippets(remaining);
        vscode.window.showInformationMessage(`Deleted snippet "${target.title}".`);
      }
    }
  );

  return [
    searchSnippetsCommand,
    insertSnippetCommand,
    copySnippetCommand,
    copySnippetAsMarkdownCommand,
    deleteSnippetCommand,
  ];
}
