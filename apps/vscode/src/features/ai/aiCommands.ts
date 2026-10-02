import * as vscode from 'vscode';
import {
  isValidGeminiApiKeyFormat,
  maskApiKey,
  aiAutofillFromCode,
  aiGenerateCommitMessage,
  autofillSnippetDetails,
  validateCreateSnippetInput,
  AVAILABLE_GEMINI_MODELS,
  type CreateSnippetInput,
  type Snippet,
} from '@codeshelf/shared';
import type { SnippetsStorage } from '../../shared/storage';
import type { SnippetsTreeProvider } from '../explorer/snippetsTree';

export function registerAiCommands(
  storage: SnippetsStorage,
  treeProvider: SnippetsTreeProvider
): vscode.Disposable[] {
  // Command 1: Configure Gemini API Key
  const setApiKeyCommand = vscode.commands.registerCommand(
    'codeshelf.setGeminiApiKey',
    async () => {
      const config = storage.getConfig();
      const currentMasked = config.geminiApiKey ? maskApiKey(config.geminiApiKey) : 'None';

      const keyInput = await vscode.window.showInputBox({
        prompt: `Enter your Google Gemini API Key (Current: ${currentMasked})`,
        placeHolder: 'AIzaSy...',
        password: true,
        ignoreFocusOut: true,
        validateInput: (val) => {
          if (!val || val.trim().length === 0) return null; // Allow clearing or keeping empty
          if (!isValidGeminiApiKeyFormat(val.trim())) {
            return 'Invalid key format. Please enter a valid Gemini API key without whitespace.';
          }
          return null;
        },
      });

      if (keyInput === undefined) return; // user cancelled

      const trimmed = keyInput.trim();
      if (!trimmed) {
        // Option to clear key
        const confirmClear = await vscode.window.showWarningMessage(
          'Do you want to remove your Gemini API key from CodeShelf?',
          'Remove Key',
          'Cancel'
        );
        if (confirmClear === 'Remove Key') {
          await storage.saveConfig({ geminiApiKey: undefined });
          vscode.window.showInformationMessage('CodeShelf: Gemini API key removed.');
        }
        return;
      }

      // Ask user to pick their preferred model
      const modelItems: vscode.QuickPickItem[] = AVAILABLE_GEMINI_MODELS.map((m: { id: string; name: string }) => ({
        label: m.id,
        description: m.name,
      }));
      const pickedModel = await vscode.window.showQuickPick(modelItems, {
        placeHolder: `Select Gemini Model (Current: ${config.geminiModel || 'gemini-2.5-flash'})`,
      });

      const selectedModel = pickedModel ? pickedModel.label : config.geminiModel || 'gemini-2.5-flash';

      await storage.saveConfig({
        geminiApiKey: trimmed,
        geminiModel: selectedModel,
      });

      vscode.window.showInformationMessage(
        `CodeShelf: Gemini API key saved securely (${maskApiKey(trimmed)}) using model ${selectedModel}.`
      );
    }
  );

  // Command 2: Save Selection with AI
  const saveWithAiCommand = vscode.commands.registerCommand(
    'codeshelf.saveSelectionWithAi',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found.');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);
      if (!selectedText || selectedText.trim().length === 0) {
        vscode.window.showWarningMessage('Please select some code to analyze with AI.');
        return;
      }

      const languageId = editor.document.languageId;
      const config = storage.getConfig();

      let apiKey = config.geminiApiKey;
      if (!apiKey) {
        const promptAdd = await vscode.window.showInformationMessage(
          'Gemini API key is required for AI autofill. Would you like to configure it now?',
          'Configure API Key',
          'Use Offline Autofill'
        );
        if (promptAdd === 'Configure API Key') {
          await vscode.commands.executeCommand('codeshelf.setGeminiApiKey');
          apiKey = storage.getConfig().geminiApiKey;
          if (!apiKey) return;
        } else if (promptAdd === 'Use Offline Autofill') {
          await vscode.commands.executeCommand('codeshelf.saveSelection');
          return;
        } else {
          return;
        }
      }

      // Progress notification
      let aiResult;
      try {
        aiResult = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'CodeShelf AI: Analyzing code metadata with Gemini...',
            cancellable: false,
          },
          async () => {
            return await aiAutofillFromCode({
              apiKey: apiKey!,
              code: selectedText,
              language: languageId,
              model: config.geminiModel,
            });
          }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`CodeShelf AI Error: ${msg}`);
        return;
      }

      // Fallback merge with heuristics if AI returned sparse data
      const heuristics = autofillSnippetDetails(selectedText, { language: languageId });
      const initialTitle = aiResult.title || heuristics.title || 'Untitled Snippet';
      const initialCategory = aiResult.category || heuristics.category || 'General';
      const initialSubcategory = aiResult.subcategory || heuristics.subcategory || '';
      const initialTech = aiResult.technology.length > 0 ? aiResult.technology : heuristics.technology;
      const initialTags = aiResult.tags.length > 0 ? aiResult.tags : heuristics.tags;
      const initialComplexity = aiResult.complexity || heuristics.complexity || 'Intermediate';
      const initialDesc = aiResult.description || heuristics.description || '';

      // Confirm Title
      const confirmedTitle = await vscode.window.showInputBox({
        prompt: `CodeShelf AI: Review Snippet Title (${initialComplexity})`,
        value: initialTitle,
        valueSelection: [0, initialTitle.length],
        validateInput: (val) => (val.trim().length === 0 ? 'Title is required' : null),
      });
      if (!confirmedTitle) return;

      // Build comprehensive description including What, Why, When, How if available
      let comprehensiveDescription = aiResult.description || initialDesc || '';
      if (aiResult.explanation) {
        const { what, why, when, how } = aiResult.explanation;
        const explanationParts: string[] = [];
        if (comprehensiveDescription) explanationParts.push(comprehensiveDescription);
        if (what) explanationParts.push(`### What\n${what}`);
        if (why) explanationParts.push(`### Why\n${why}`);
        if (when) explanationParts.push(`### When to Use\n${when}`);
        if (how) explanationParts.push(`### How It Works\n${how}`);
        comprehensiveDescription = explanationParts.join('\n\n');
      }

      const snippetInput: CreateSnippetInput = {
        title: confirmedTitle.trim(),
        code: selectedText,
        language: languageId,
        description: comprehensiveDescription,
        category: initialCategory,
        subcategory: initialSubcategory,
        technology: initialTech,
        tags: initialTags,
        usage: aiResult.usage.length > 0 ? aiResult.usage : heuristics.usage,
        complexity: initialComplexity as any,
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
        `CodeShelf AI: Saved "${newSnippet.title}" [${newSnippet.category}]!`,
        'Copy Code',
        'Copy as Markdown'
      );
      if (action === 'Copy Code') {
        await vscode.env.clipboard.writeText(newSnippet.code);
      } else if (action === 'Copy as Markdown') {
        const mdCode = `\`\`\`${newSnippet.language}\n${newSnippet.code}\n\`\`\``;
        await vscode.env.clipboard.writeText(mdCode);
        vscode.window.showInformationMessage(`Copied "${newSnippet.title}" as Markdown.`);
      }
    }
  );

  // Command 3: Generate Commit Message from Selected Code / Diff
  const generateCommitCommand = vscode.commands.registerCommand(
    'codeshelf.generateCommitMessage',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found.');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);
      if (!selectedText || selectedText.trim().length === 0) {
        vscode.window.showWarningMessage('Please select code or git diff to generate commit message.');
        return;
      }

      const config = storage.getConfig();
      let apiKey = config.geminiApiKey;
      if (!apiKey) {
        const promptAdd = await vscode.window.showInformationMessage(
          'Gemini API key is required to generate AI commit messages.',
          'Configure API Key',
          'Cancel'
        );
        if (promptAdd === 'Configure API Key') {
          await vscode.commands.executeCommand('codeshelf.setGeminiApiKey');
          apiKey = storage.getConfig().geminiApiKey;
          if (!apiKey) return;
        } else {
          return;
        }
      }

      let commitMsg = '';
      try {
        commitMsg = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'CodeShelf AI: Generating conventional commit message...',
            cancellable: false,
          },
          async () => {
            return await aiGenerateCommitMessage({
              apiKey: apiKey!,
              currentCode: selectedText,
              language: editor.document.languageId,
              model: config.geminiModel,
            });
          }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`CodeShelf AI Error: ${msg}`);
        return;
      }

      const confirmedCommit = await vscode.window.showInputBox({
        prompt: 'Generated Commit Message (Press Enter to Copy)',
        value: commitMsg,
        valueSelection: [0, commitMsg.length],
      });

      if (confirmedCommit) {
        await vscode.env.clipboard.writeText(confirmedCommit.trim());
        vscode.window.showInformationMessage('Commit message copied to clipboard!');
      }
    }
  );

  return [setApiKeyCommand, saveWithAiCommand, generateCommitCommand];
}
