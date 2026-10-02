import type { Snippet } from '../../models/models';

/**
 * Extracts normalized keyword tokens from a string.
 */
export function extractTokens(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return new Set(words);
}

/**
 * Computes Jaccard similarity coefficient between two token sets.
 */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Computes a weighted similarity score between two snippets based on
 * domain (30%), language & technology (25%), tags (30%), and code tokens (15%).
 */
export function computeSnippetSimilarity(a: Snippet, b: Snippet): number {
  if (a.id === b.id) return 1.0;

  // Domain score
  let domainScore = 0;
  if (a.category && b.category && a.category === b.category) {
    domainScore = 1.0;
    if (a.subcategory && b.subcategory && a.subcategory === b.subcategory) {
      domainScore = 1.2;
    }
  }

  // Technology / Language score
  const techA = new Set([...(a.technology || []), a.language.toLowerCase()]);
  const techB = new Set([...(b.technology || []), b.language.toLowerCase()]);
  const techScore = jaccardSimilarity(techA, techB);

  // Tags score
  const tagsA = new Set(a.tags.map((t) => t.toLowerCase()));
  const tagsB = new Set(b.tags.map((t) => t.toLowerCase()));
  const tagScore = jaccardSimilarity(tagsA, tagsB);

  // Code & Title tokens score
  const tokensA = extractTokens(`${a.title} ${a.code.slice(0, 300)}`);
  const tokensB = extractTokens(`${b.title} ${b.code.slice(0, 300)}`);
  const tokenScore = jaccardSimilarity(tokensA, tokensB);

  return (
    domainScore * 0.3 +
    techScore * 0.25 +
    tagScore * 0.3 +
    tokenScore * 0.15
  );
}

/**
 * Finds top N related snippets for a given snippet.
 */
export function findRelatedSnippets(
  target: Snippet,
  allSnippets: Snippet[],
  limit = 3
): { snippet: Snippet; score: number }[] {
  return allSnippets
    .filter((s) => s.id !== target.id)
    .map((s) => ({
      snippet: s,
      score: computeSnippetSimilarity(target, s),
    }))
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Ranks snippets by semantic query relevance score.
 */
export function rankSnippetsByQuery(
  query: string,
  snippets: Snippet[]
): { snippet: Snippet; score: number }[] {
  const queryTokens = extractTokens(query);
  if (queryTokens.size === 0) {
    return snippets.map((s) => ({ snippet: s, score: 0 }));
  }

  return snippets
    .map((snippet) => {
      const titleTokens = extractTokens(snippet.title);
      const tagTokens = extractTokens(snippet.tags.join(' '));
      const descTokens = extractTokens(snippet.description || '');
      const codeTokens = extractTokens(snippet.code);
      const metaTokens = extractTokens(
        `${snippet.language} ${snippet.category || ''} ${(snippet.technology || []).join(' ')}`
      );

      let score = 0;
      for (const token of queryTokens) {
        if (titleTokens.has(token)) score += 5.0;
        if (tagTokens.has(token)) score += 4.0;
        if (metaTokens.has(token)) score += 3.0;
        if (descTokens.has(token)) score += 2.0;
        if (codeTokens.has(token)) score += 1.0;
      }

      return { snippet, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}
