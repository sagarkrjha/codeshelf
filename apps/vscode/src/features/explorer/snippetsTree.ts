import * as vscode from 'vscode';
import type { Snippet } from '@codeshelf/shared';

export class SnippetTreeItem extends vscode.TreeItem {
  constructor(
    public override readonly label: string,
    public override readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly snippet?: Snippet,
    public readonly isCategory = false
  ) {
    super(label, collapsibleState);

    if (isCategory) {
      this.iconPath = new vscode.ThemeIcon('folder');
      this.contextValue = 'categoryItem';
    } else if (snippet) {
      this.iconPath = new vscode.ThemeIcon('symbol-snippet');
      this.description = `[${snippet.language}]`;
      this.tooltip = `${snippet.title}\nLanguage: ${snippet.language}\nTags: ${snippet.tags?.join(', ') || 'none'}`;
      this.contextValue = 'snippetItem';
      this.command = {
        command: 'codeshelf.insertSnippet',
        title: 'Insert Snippet',
        arguments: [snippet],
      };
    }
  }
}

export class SnippetsTreeProvider implements vscode.TreeDataProvider<SnippetTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SnippetTreeItem | undefined | null | void> =
    new vscode.EventEmitter<SnippetTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SnippetTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(private readonly getSnippets: () => Snippet[]) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SnippetTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SnippetTreeItem): Thenable<SnippetTreeItem[]> {
    const snippets = this.getSnippets();
    if (snippets.length === 0) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Top level: Folders & Categories
      const categories = new Set<string>();
      snippets.forEach((s) => categories.add(s.folder || s.category || 'Uncategorized'));

      const categoryItems = Array.from(categories)
        .sort((a, b) => a.localeCompare(b))
        .map(
          (cat) =>
            new SnippetTreeItem(
              cat,
              vscode.TreeItemCollapsibleState.Expanded,
              undefined,
              true
            )
        );
      return Promise.resolve(categoryItems);
    }

    if (element.isCategory) {
      // Children of folder/category
      const filtered = snippets.filter(
        (s) => (s.folder || s.category || 'Uncategorized') === element.label
      );
      const items = filtered.map(
        (s) => new SnippetTreeItem(s.title, vscode.TreeItemCollapsibleState.None, s, false)
      );
      return Promise.resolve(items);
    }

    return Promise.resolve([]);
  }
}
