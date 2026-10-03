import type { Snippet } from '../../models/models';
import { normalizeSnippetVersion } from '../versioning/versioning';

export const CODESHELF_DIR_NAME = '.codeshelf';
export const CODESHELF_PRIMARY_SNIPPET_FILENAME = 'snippets.json';
export const CODESHELF_SNIPPETS_FILENAME = 'snippets.json';
export const CODESHELF_SNIPPET_FILENAMES = ['snippets.json'] as const;
export const CODESHELF_STORAGE_KEY = 'codeshelf_snippets_v1';
export const CODESHELF_CONFIG_KEY = 'codeshelf_config_v1';
export const CODESHELF_SYNC_CHANNEL = 'codeshelf_sync_channel';



export interface SnippetMergeResult {
  merged: Snippet[];
  added: number;
  updated: number;
  unchanged: number;
}

/**
 * Synchronizes two snippet collections (e.g. from local storage, file disk, or another device).
 * Resolves conflicts by comparing updatedAt timestamps and combines revision history without duplicates.
 */
export function mergeSnippets(
  baseSnippets: Snippet[],
  incomingSnippets: Snippet[]
): SnippetMergeResult {
  const map = new Map<string, Snippet>();
  baseSnippets.forEach((s) => {
    if (s.id) map.set(s.id, s);
  });

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const incoming of incomingSnippets) {
    if (!incoming.id || !incoming.title) continue;

    if (!map.has(incoming.id)) {
      map.set(incoming.id, incoming);
      added++;
    } else {
      const existing = map.get(incoming.id)!;
      const existingUpdated = new Date(existing.updatedAt).getTime();
      const incomingUpdated = new Date(incoming.updatedAt).getTime();

      if (incomingUpdated > existingUpdated) {
        // Incoming is newer
        const combinedHistory = [
          ...(incoming.history || []),
          ...(existing.history || []),
        ].filter(
          (rev, idx, arr) => arr.findIndex((r) => r.version === rev.version) === idx
        );

        map.set(incoming.id, normalizeSnippetVersion({
          ...incoming,
          history: combinedHistory,
        }));
        updated++;
      } else if (existingUpdated > incomingUpdated) {
        // Existing is newer, merge any missing history from incoming
        const combinedHistory = [
          ...(existing.history || []),
          ...(incoming.history || []),
        ].filter(
          (rev, idx, arr) => arr.findIndex((r) => r.version === rev.version) === idx
        );

        map.set(incoming.id, normalizeSnippetVersion({
          ...existing,
          history: combinedHistory,
        }));
        unchanged++;
      } else {
        // Timestamps equal, preserve existing
        unchanged++;
      }
    }
  }

  // Preserve descending order by updatedAt and normalize versions
  const merged = Array.from(map.values())
    .map(normalizeSnippetVersion)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return {
    merged,
    added,
    updated,
    unchanged,
  };
}
