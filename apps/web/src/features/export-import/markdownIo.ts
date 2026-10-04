import type { Snippet } from '@codeshelf/shared';
import {
  serializeSnippetToMarkdown,
  parseMarkdownToSnippet,
  normalizeSnippetVersion,
  compressString,
  decompressString,
  isGzipCompressed,
  detectLanguageFromFilename,
  canonicalizeLanguage,
  normalizeTags,
  normalizeTechnologies,
} from '@codeshelf/shared';
import { addSnippet } from '../storage/storage';

export function downloadSnippetAsMarkdown(snippet: Snippet): void {
  const markdown = serializeSnippetToMarkdown(snippet);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeFilename = snippet.title
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  link.href = url;
  link.download = `${safeFilename}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportAllSnippetsAsJson(snippets: Snippet[]): void {
  const json = JSON.stringify(snippets, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `codeshelf-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportAllSnippetsAsCompressedJson(snippets: Snippet[]): Promise<void> {
  const json = JSON.stringify(snippets, null, 2);
  const compressed = await compressString(json, 'gzip');
  const blob = new Blob([compressed as unknown as BlobPart], { type: 'application/gzip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `codeshelf-backup-${new Date().toISOString().slice(0, 10)}.json.gz`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importSnippetFromMarkdownFile(file: File): Promise<Snippet> {
  const text = await file.text();
  const parsed = parseMarkdownToSnippet(text);

  // If the file itself has a code extension (e.g. .ts, .cpp), auto-detect
  const detected = detectLanguageFromFilename(file.name);
  const detectedLang = detected ? detected.language : parsed.language;
  const canonicalLang = canonicalizeLanguage(detectedLang || 'typescript');

  const resolvedTags = normalizeTags(parsed.tags);
  const rawTech = parsed.technology || (detected ? [detected.technology] : [canonicalLang]);
  const resolvedTech = normalizeTechnologies(rawTech);

  return addSnippet({
    title: parsed.title || file.name.replace(/\.[^/.]+$/, ''),
    language: canonicalLang,
    code: parsed.code,
    description: parsed.description,
    category: parsed.category,
    subcategory: parsed.subcategory,
    tags: resolvedTags,
    technology: resolvedTech,
    usage: parsed.usage,
    complexity: parsed.complexity,
  });
}

export async function restoreSnippetsFromJsonFile(
  file: File,
  existingSnippets: Snippet[]
): Promise<{ merged: number; added: number; updatedSnippets: Snippet[] }> {
  let text: string;
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (isGzipCompressed(bytes) || file.name.endsWith('.gz')) {
    text = await decompressString(bytes, 'gzip');
  } else {
    text = new TextDecoder().decode(bytes);
  }

  const imported = JSON.parse(text) as Snippet[];

  const existingMap = new Map<string, Snippet>();
  existingSnippets.forEach((s) => existingMap.set(s.id, s));

  let merged = 0;
  let added = 0;

  for (const item of imported) {
    if (!item.id || !item.title) continue;

    if (existingMap.has(item.id)) {
      // Conflict resolution: compare updatedAt timestamps
      const current = existingMap.get(item.id)!;
      const currentUpdated = new Date(current.updatedAt).getTime();
      const importedUpdated = new Date(item.updatedAt).getTime();

      if (importedUpdated > currentUpdated) {
        // Merge history and take latest version
        const combinedHistory = [
          ...(item.history || []),
          ...(current.history || []),
        ].filter(
          (v, idx, arr) => arr.findIndex((t) => t.version === v.version) === idx
        );

        existingMap.set(item.id, normalizeSnippetVersion({
          ...item,
          history: combinedHistory,
        }));
        merged++;
      }
    } else {
      existingMap.set(item.id, normalizeSnippetVersion(item));
      added++;
    }
  }

  return {
    merged,
    added,
    updatedSnippets: Array.from(existingMap.values()).map(normalizeSnippetVersion),
  };
}

export function exportGitSyncManifest(snippets: Snippet[]): void {
  const manifest = {
    schemaVersion: '1.0',
    repository: 'codeshelf-git-sync',
    exportedAt: new Date().toISOString(),
    totalSnippets: snippets.length,
    structure: snippets.map((s) => {
      const domainFolder = (s.category || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const filename = `${s.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.md`;
      return {
        id: s.id,
        title: s.title,
        version: s.version || 1,
        path: `snippets/${domainFolder}/${filename}`,
        markdown: serializeSnippetToMarkdown(s),
      };
    }),
  };

  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `codeshelf-gitsync-manifest-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
