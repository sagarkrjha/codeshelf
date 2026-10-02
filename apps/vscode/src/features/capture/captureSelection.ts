import * as vscode from 'vscode';
import type { CreateSnippetInput, Snippet } from '@codeshelf/shared';
import {
  validateCreateSnippetInput,
  autofillSnippetDetails,
  extractAllCategories,
  extractAllTechnologies,
} from '@codeshelf/shared';
import type { SnippetsStorage } from '../../shared/storage';
import type { SnippetsTreeProvider } from '../explorer/snippetsTree';

export function registerCaptureCommand(
  storage: SnippetsStorage,
  treeProvider: SnippetsTreeProvider
) {
  return vscode.commands.registerCommand('codeshelf.saveSelection', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found.');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText || selectedText.trim().length === 0) {
      vscode.window.showWarningMessage('Please select some code to save as a snippet.');
      return;
    }

    const languageId = editor.document.languageId;

    // Run smart autofill heuristics on the selected code
    const autofill = autofillSnippetDetails(selectedText, {
      language: languageId,
    });

    // Step 1: Title (prefilled from function/class/comment extraction)
    const title = await vscode.window.showInputBox({
      prompt: 'Step 1/4: Enter snippet title (Auto-filled from code analysis)',
      placeHolder: 'e.g., QuickSort Partitioning',
      value: autofill.title || '',
      valueSelection: [0, (autofill.title || '').length],
      validateInput: (val) => (val.trim().length === 0 ? 'Title is required' : null),
    });
    if (!title) return;

    // Step 2: Domain / Category (prioritizing auto-detected domain + existing custom categories)
    const existingSnippets = storage.getSnippets();
    const domainList: string[] = extractAllCategories(existingSnippets);
    if (autofill.category && domainList.includes(autofill.category)) {
      domainList.splice(domainList.indexOf(autofill.category), 1);
      domainList.unshift(autofill.category);
    }
    const domainItems = [
      ...domainList.map((d) => ({
        label: d,
        description: d === autofill.category ? '(Auto-detected)' : undefined,
      })),
      { label: '$(add) Custom Domain...', description: 'Enter a custom category' },
    ];
    const selectedDomainPick = await vscode.window.showQuickPick(domainItems, {
      placeHolder: `Step 2/4: Select domain / category (Detected: ${autofill.category || 'Algorithms'})`,
    });
    if (!selectedDomainPick) return;

    let category = selectedDomainPick.label;
    if (selectedDomainPick.label.includes('Custom Domain')) {
      const custom = await vscode.window.showInputBox({
        prompt: 'Enter custom domain / category name',
      });
      if (!custom) return;
      category = custom.trim();
    }

    // Step 3: Technology (prioritizing auto-detected technology + custom technologies)
    const techList: string[] = extractAllTechnologies(existingSnippets);
    const detectedTech = autofill.technology[0];
    if (detectedTech && techList.includes(detectedTech)) {
      techList.splice(techList.indexOf(detectedTech), 1);
      techList.unshift(detectedTech);
    }
    const techItems = [
      ...techList.map((t) => ({
        label: t,
        description: t === detectedTech ? '(Auto-detected)' : undefined,
      })),
      { label: '$(add) Custom Technology...', description: 'Enter a custom technology / framework' },
    ];
    const selectedTech = await vscode.window.showQuickPick(techItems, {
      placeHolder: `Step 3/4: Select primary technology (Detected: ${detectedTech || 'TypeScript'})`,
    });
    let technology = selectedTech ? [selectedTech.label] : undefined;
    if (selectedTech?.label.includes('Custom Technology')) {
      const customTech = await vscode.window.showInputBox({
        prompt: 'Enter custom technology name (e.g. Svelte, PyTorch)',
      });
      technology = customTech ? [customTech.trim()] : undefined;
    }

    // Step 4: Tags (prefilled with auto-detected keywords)
    const suggestedTags = autofill.tags.join(', ');
    const tagsInput = await vscode.window.showInputBox({
      prompt: 'Step 4/4: Enter tags (comma-separated, auto-detected from code)',
      placeHolder: 'sorting, recursion, pivot',
      value: suggestedTags,
    });
    const tags = tagsInput
      ? tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : autofill.tags;

    // Create & Validate
    const snippetInput: CreateSnippetInput = {
      title: title.trim(),
      code: selectedText,
      language: languageId,
      description: autofill.description,
      category,
      subcategory: autofill.subcategory,
      technology,
      tags,
      complexity: autofill.complexity,
    };

    const validation = validateCreateSnippetInput(snippetInput);
    if (!validation.valid) {
      vscode.window.showErrorMessage(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    const now = new Date().toISOString();
    const newSnippet: Snippet = {
      id: `snip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: snippetInput.title,
      description: snippetInput.description,
      code: snippetInput.code,
      language: snippetInput.language,
      category: snippetInput.category,
      subcategory: snippetInput.subcategory,
      technology: snippetInput.technology,
      tags: snippetInput.tags || [],
      complexity: snippetInput.complexity,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const current = storage.getSnippets();
    await storage.saveSnippets([newSnippet, ...current]);
    treeProvider.refresh();

    const action = await vscode.window.showInformationMessage(
      `CodeShelf: Snippet "${newSnippet.title}" saved successfully!`,
      'Copy Code',
      'Copy as Markdown'
    );
    if (action === 'Copy Code') {
      await vscode.env.clipboard.writeText(newSnippet.code);
    } else if (action === 'Copy as Markdown') {
      const mdCode = `\`\`\`${newSnippet.language}\n${newSnippet.code}\n\`\`\``;
      await vscode.env.clipboard.writeText(mdCode);
      vscode.window.showInformationMessage(`Copied "${newSnippet.title}" as Markdown code block.`);
    }
  });
}
