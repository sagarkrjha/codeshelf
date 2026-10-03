import type { Snippet, SnippetRevision } from '../../models/models';
import { serializeSnippetToMarkdown } from '../markdown/markdown';

/**
 * Returns the full Markdown representation of a revision.
 * Reconstructs it from snapshot or code/description if markdown field wasn't saved on legacy revisions.
 */
export function getRevisionMarkdown(
  revision: SnippetRevision,
  fallbackSnippet?: Snippet
): string {
  if (revision.markdown && revision.markdown.trim().length > 0) {
    return revision.markdown;
  }

  if (revision.snapshot) {
    return serializeSnippetToMarkdown({
      ...(fallbackSnippet || ({} as Snippet)),
      ...revision.snapshot,
      id: fallbackSnippet?.id || 'temp',
      version: revision.version,
      updatedAt: revision.timestamp,
      createdAt: fallbackSnippet?.createdAt || revision.timestamp,
    });
  }

  return serializeSnippetToMarkdown({
    ...(fallbackSnippet || ({} as Snippet)),
    id: fallbackSnippet?.id || 'temp',
    title: fallbackSnippet?.title || 'Snippet',
    language: fallbackSnippet?.language || 'typescript',
    code: revision.code,
    ...(() => {
      const desc = revision.description || fallbackSnippet?.description;
      return desc != null ? { description: desc } : {};
    })(),
    version: revision.version,
    updatedAt: revision.timestamp,
    createdAt: fallbackSnippet?.createdAt || revision.timestamp,
  });
}

/**
 * Compares two snippet states to determine whether the serialized Markdown representation has changed.
 * Ignores transient version numbers and updatedAt timestamps to focus purely on meaningful content differences.
 */
export function hasSnippetMarkdownChanged(
  current: Snippet,
  proposed: Partial<Snippet>
): boolean {
  if (proposed.code !== undefined && proposed.code !== current.code) return true;
  if (proposed.description !== undefined && proposed.description !== current.description) return true;
  if (proposed.title !== undefined && proposed.title !== current.title) return true;
  if (proposed.language !== undefined && proposed.language !== current.language) return true;
  if (proposed.category !== undefined && proposed.category !== current.category) return true;
  if (proposed.subcategory !== undefined && proposed.subcategory !== current.subcategory) return true;

  if (proposed.tags !== undefined && JSON.stringify(proposed.tags) !== JSON.stringify(current.tags)) return true;
  if (proposed.technology !== undefined && JSON.stringify(proposed.technology) !== JSON.stringify(current.technology)) return true;
  if (proposed.usage !== undefined && JSON.stringify(proposed.usage) !== JSON.stringify(current.usage)) return true;
  if (proposed.complexity !== undefined && JSON.stringify(proposed.complexity) !== JSON.stringify(current.complexity)) return true;
  if (proposed.codeBlocks !== undefined && JSON.stringify(proposed.codeBlocks) !== JSON.stringify(current.codeBlocks)) return true;

  if (proposed.markdown !== undefined && proposed.markdown !== current.markdown) {
    const stripTransient = (md: string) =>
      md
        .replace(/^version:\s*\d+\r?\n?/m, '')
        .replace(/^updatedAt:\s*["']?[^"'\r\n]+["']?\r?\n?/m, '')
        .trim();
    if (stripTransient(proposed.markdown) !== stripTransient(current.markdown || '')) {
      return true;
    }
  }

  const baseNormalized: Snippet = {
    ...current,
    version: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const proposedNormalized: Snippet = {
    ...current,
    ...proposed,
    version: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  return serializeSnippetToMarkdown(baseNormalized) !== serializeSnippetToMarkdown(proposedNormalized);
}

import {
  canonicalizeLanguage,
  normalizeTags,
  normalizeTechnologies,
} from '../taxonomy/canonical';

/**
 * Normalizes a snippet's version and revision history to guarantee:
 * 1. If history is empty, version is strictly 1 (the initial creation).
 * 2. If history has N revisions, they are sequentially numbered v1, v2, ..., vN (chronologically oldest to newest, stored newest-first).
 * 3. The current snippet version is strictly N + 1 (the total number of markdown versions that have ever existed).
 * 4. Ensures every revision in history has its full `markdown` string populated.
 * 5. Deduplicates any duplicate revision entries.
 * 6. Normalizes language, technology names (canonical casing), and tags (deduplicated).
 */
export function normalizeSnippetVersion(snippet: Snippet): Snippet {
  const rawHistory = snippet.history || [];

  // Normalize language, technology list, and tags
  const normalizedLang = canonicalizeLanguage(snippet.language || 'typescript');
  const normalizedTags = normalizeTags(snippet.tags || []);
  const normalizedTech = normalizeTechnologies(snippet.technology || [normalizedLang]);

  const baseSnippet: Snippet = {
    ...snippet,
    language: normalizedLang,
    tags: normalizedTags,
    technology: normalizedTech,
  };

  if (rawHistory.length === 0) {
    return {
      ...baseSnippet,
      version: 1,
      history: [],
    };
  }

  // Deduplicate revisions by timestamp and content
  const seen = new Set<string>();
  const uniqueHistory: SnippetRevision[] = [];
  for (const rev of rawHistory) {
    const key = rev.markdown
      ? `${rev.timestamp}-${rev.markdown}`
      : `${rev.timestamp}-${rev.code}-${rev.description || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueHistory.push(rev);
    }
  }

  // Sort chronological (oldest to newest) to assign sequential versions 1, 2, ..., N
  const chronological = [...uniqueHistory].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.version || 0) - (b.version || 0);
  });

  // Assign sequential version 1, 2, ..., N to prior revisions and ensure markdown is populated
  const normalizedChronological: SnippetRevision[] = chronological.map((rev, idx) => {
    const version = idx + 1;
    const revWithVersion = { ...rev, version };
    const markdown = getRevisionMarkdown(revWithVersion, baseSnippet);
    return {
      ...revWithVersion,
      markdown,
    };
  });

  // Store in reverse-chronological order (newest revision at index 0)
  const normalizedNewestFirst = normalizedChronological.reverse();

  // Current active snippet version is always (number of prior revisions) + 1
  const currentVersion = normalizedNewestFirst.length + 1;

  return {
    ...baseSnippet,
    version: currentVersion,
    history: normalizedNewestFirst,
  };
}

/**
 * Returns total versions of a snippet (prior revisions + current version).
 */
export function getSnippetVersionCount(snippet: Snippet): number {
  return (snippet.history?.length || 0) + 1;
}
