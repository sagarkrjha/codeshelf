import { useState, useEffect, useCallback } from 'react';
import type { Snippet, CreateSnippetInput } from '@codeshelf/shared';
import {
  autofillSnippetDetails,
  normalizeTags,
  normalizeTechnologies,
} from '@codeshelf/shared';
import {
  getLocalSnippets,
  addSnippet,
  updateSnippet,
  deleteSnippet,
  revertToRevision,
  saveLocalSnippets,
  subscribeToSnippetChanges,
} from '../../storage/index';
import {
  importSnippetFromMarkdownFile,
  restoreSnippetsFromJsonFile,
} from '../../export-import/index';

export function useSnippetManager() {
  const [snippets, setSnippets] = useState<Snippet[]>(() => getLocalSnippets());
  const [selectedId, setSelectedId] = useState<string>(() => snippets[0]?.id || '');
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Auto-sync with external snippet changes across Web, Desktop, and VS Code
  useEffect(() => {
    const unsubscribe = subscribeToSnippetChanges((updatedSnippets) => {
      if (Array.isArray(updatedSnippets)) {
        setSnippets(updatedSnippets);
        setSelectedId((current) => {
          if (updatedSnippets.some((s) => s.id === current)) {
            return current;
          }
          return updatedSnippets[0]?.id || '';
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingSnippet(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((snippet: Snippet) => {
    setEditingSnippet(snippet);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete snippet "${title}"?`)) {
      deleteSnippet(id);
      const remaining = getLocalSnippets();
      setSnippets(remaining);
      setSelectedId((current) => (current === id ? remaining[0]?.id || '' : current));
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingSnippet(null);
  }, []);

  const handleSaveSnippet = useCallback((input: CreateSnippetInput & { changeSummary?: string }) => {
    if (editingSnippet) {
      const updated = updateSnippet(editingSnippet.id, input);
      if (updated) {
        setSelectedId(updated.id);
      }
      setEditingSnippet(null);
    } else {
      const created = addSnippet(input);
      setSelectedId(created.id);
    }
    setIsModalOpen(false);
    setSnippets(getLocalSnippets());
  }, [editingSnippet]);

  const handleRevertRevision = useCallback((activeSnippet: Snippet | null, version: number) => {
    if (!activeSnippet) return;
    const reverted = revertToRevision(activeSnippet.id, version);
    if (reverted) {
      setSnippets(getLocalSnippets());
      alert(`Snippet "${reverted.title}" rolled back to revision v${version} (now at v${reverted.version}).`);
    }
  }, []);

  const handleAutofillActiveSnippet = useCallback((activeSnippet: Snippet | null) => {
    if (!activeSnippet) return;
    const filled = autofillSnippetDetails(activeSnippet.code, {
      title: activeSnippet.title,
      language: activeSnippet.language,
      category: activeSnippet.category,
      subcategory: activeSnippet.subcategory,
    });

    const mergedTags = normalizeTags([...activeSnippet.tags, ...filled.tags]);
    const rawTech =
      activeSnippet.technology && activeSnippet.technology.length > 0
        ? [...activeSnippet.technology, ...filled.technology]
        : filled.technology;
    const mergedTech = normalizeTechnologies(rawTech);

    updateSnippet(activeSnippet.id, {
      tags: mergedTags,
      technology: mergedTech,
      complexity: activeSnippet.complexity || filled.complexity,
      description: activeSnippet.description || filled.description,
      changeSummary: 'Auto-filled snippet details from code analysis',
    });
    setSnippets(getLocalSnippets());
    alert(`Auto-filled details for "${activeSnippet.title}"!`);
  }, []);

  const handleCopyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }, []);

  const handleCopyCodeAsMarkdown = useCallback(async (snippet: Snippet) => {
    try {
      const markdownBlock = `\`\`\`${snippet.language}\n${snippet.code}\n\`\`\``;
      await navigator.clipboard.writeText(markdownBlock);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (err) {
      console.error('Failed to copy code as markdown', err);
    }
  }, []);

  const handleImportMarkdown = useCallback(async (file: File) => {
    try {
      const imported = await importSnippetFromMarkdownFile(file);
      setSnippets(getLocalSnippets());
      setSelectedId(imported.id);
      alert(`Imported snippet "${imported.title}" successfully!`);
    } catch (err) {
      alert(`Failed to import snippet: ${String(err)}`);
    }
  }, []);

  const handleRestoreBackup = useCallback(async (file: File) => {
    try {
      const current = getLocalSnippets();
      const result = await restoreSnippetsFromJsonFile(file, current);
      saveLocalSnippets(result.updatedSnippets);
      setSnippets(result.updatedSnippets);
      alert(`Backup restored successfully! Added ${result.added} new snippet(s), merged ${result.merged} updated snippet(s).`);
    } catch (err) {
      alert(`Failed to restore backup: ${String(err)}`);
    }
  }, []);

  return {
    snippets,
    setSnippets,
    selectedId,
    setSelectedId,
    editingSnippet,
    setEditingSnippet,
    isModalOpen,
    setIsModalOpen,
    isHistoryOpen,
    setIsHistoryOpen,
    copied,
    copiedMarkdown,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleDelete,
    handleSaveSnippet,
    handleRevertRevision,
    handleAutofillActiveSnippet,
    handleCopyCode,
    handleCopyCodeAsMarkdown,
    handleImportMarkdown,
    handleRestoreBackup,
  };
}
