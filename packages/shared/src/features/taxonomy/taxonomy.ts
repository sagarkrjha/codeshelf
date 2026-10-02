import type { Snippet, SnippetFilter } from '../../models/models';
import { DEFAULT_DOMAINS, DEFAULT_TECHNOLOGIES } from '../../models/constants';

/**
 * Extracts all unique categories from snippets merged with default domains.
 */
export function extractAllCategories(
  snippets: Snippet[],
  defaultDomains: readonly string[] = DEFAULT_DOMAINS
): string[] {
  const categories = new Set<string>(defaultDomains);
  for (const snippet of snippets) {
    if (snippet.category && snippet.category.trim()) {
      categories.add(snippet.category.trim());
    }
  }
  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}

/**
 * Extracts a map of category names to their unique subcategories.
 */
export function extractCategorySubcategories(snippets: Snippet[]): Record<string, string[]> {
  const result: Record<string, Set<string>> = {};

  for (const snippet of snippets) {
    const cat = snippet.category?.trim();
    const sub = snippet.subcategory?.trim();
    if (cat && sub) {
      if (!result[cat]) {
        result[cat] = new Set<string>();
      }
      result[cat].add(sub);
    }
  }

  const sortedResult: Record<string, string[]> = {};
  for (const [cat, subSet] of Object.entries(result)) {
    sortedResult[cat] = Array.from(subSet).sort((a, b) => a.localeCompare(b));
  }
  return sortedResult;
}

/**
 * Extracts all unique technologies from snippets merged with default technologies.
 */
export function extractAllTechnologies(
  snippets: Snippet[],
  defaultTechnologies: readonly string[] = DEFAULT_TECHNOLOGIES
): string[] {
  const techs = new Set<string>(defaultTechnologies);
  for (const snippet of snippets) {
    if (Array.isArray(snippet.technology)) {
      for (const t of snippet.technology) {
        if (t.trim()) techs.add(t.trim());
      }
    }
  }
  return Array.from(techs).sort((a, b) => a.localeCompare(b));
}

/**
 * Extracts all unique languages from snippets.
 */
export function extractAllLanguages(snippets: Snippet[]): string[] {
  const languages = new Set<string>();
  for (const snippet of snippets) {
    if (snippet.language && snippet.language.trim()) {
      languages.add(snippet.language.trim().toLowerCase());
    }
  }
  return Array.from(languages).sort((a, b) => a.localeCompare(b));
}

/**
 * Multi-faceted snippet filter supporting flexible categories, subcategories,
 * tags, languages, technologies, and complexity.
 */
export function filterSnippets(snippets: Snippet[], filter: SnippetFilter): Snippet[] {
  const matchesStringOrArray = (
    filterVal: string | string[] | undefined,
    itemVal: string | undefined | null
  ): boolean => {
    if (!filterVal) return true;
    if (!itemVal) return false;
    if (Array.isArray(filterVal)) {
      if (filterVal.length === 0) return true;
      return filterVal.some((f) => f.toLowerCase() === itemVal.toLowerCase());
    }
    return itemVal.toLowerCase() === filterVal.toLowerCase();
  };

  const matchesArrayOrArray = (
    filterVal: string | string[] | undefined,
    itemVals: string[] | undefined | null
  ): boolean => {
    if (!filterVal) return true;
    if (!itemVals || itemVals.length === 0) return false;
    const filterArray = Array.isArray(filterVal) ? filterVal : [filterVal];
    if (filterArray.length === 0) return true;
    return filterArray.some((f) =>
      itemVals.some((item) => item.toLowerCase() === f.toLowerCase())
    );
  };

  return snippets.filter((s) => {
    if (filter.domain && !matchesStringOrArray(filter.domain, s.category)) {
      return false;
    }
    if (filter.subcategory && !matchesStringOrArray(filter.subcategory, s.subcategory)) {
      return false;
    }
    if (filter.language && !matchesStringOrArray(filter.language, s.language)) {
      return false;
    }
    if (filter.usage && !matchesArrayOrArray(filter.usage, s.usage)) {
      return false;
    }
    if (filter.tag && !matchesArrayOrArray(filter.tag, s.tags)) {
      return false;
    }
    if (filter.technology) {
      const techList = s.technology || [];
      const hasTech = matchesArrayOrArray(filter.technology, techList) ||
        matchesStringOrArray(filter.technology, s.language);
      if (!hasTech) return false;
    }
    if (filter.complexityTime) {
      if (!s.complexity?.time || !s.complexity.time.toLowerCase().includes(filter.complexityTime.toLowerCase())) {
        return false;
      }
    }
    if (filter.complexitySpace) {
      if (!s.complexity?.space || !s.complexity.space.toLowerCase().includes(filter.complexitySpace.toLowerCase())) {
        return false;
      }
    }
    if (filter.query) {
      const q = filter.query.toLowerCase().trim();
      const inTitle = s.title.toLowerCase().includes(q);
      const inCode = s.code.toLowerCase().includes(q);
      const inDesc = s.description?.toLowerCase().includes(q);
      const inTags = s.tags.some((t) => t.toLowerCase().includes(q));
      if (!inTitle && !inCode && !inDesc && !inTags) {
        return false;
      }
    }
    return true;
  });
}
