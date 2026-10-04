import type { Snippet, SnippetFilter } from '../../models/models';
import {
  canonicalizeTechnology,
  canonicalizeLanguage,
  matchesTechnologyOrTag,
} from './canonical';

/**
 * Extracts all unique categories from snippets merged with user-defined categories.
 * Preserves user-defined categories and trims whitespace without hardcoded fallbacks.
 */
export function extractAllCategories(
  snippets: Snippet[],
  additionalCategories: readonly string[] = []
): string[] {
  const categories = new Set<string>();

  for (const cat of additionalCategories) {
    if (cat && cat.trim()) {
      categories.add(cat.trim());
    }
  }

  for (const snippet of snippets) {
    const cat = (snippet.folder || snippet.category)?.trim();
    if (cat) {
      categories.add(cat);
    }
  }

  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}

/**
 * Extracts a map of category/folder names to their unique subcategories.
 */
export function extractCategorySubcategories(snippets: Snippet[]): Record<string, string[]> {
  const result: Record<string, Set<string>> = {};

  for (const snippet of snippets) {
    const cat = (snippet.folder || snippet.category)?.trim();
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
 * Extracts all unique technologies from snippets merged with user-defined technologies.
 * Automatically canonicalizes names (e.g. '.ts', 'cpp', 'C++', '.cpp' map to canonical technology names)
 * and eliminates duplicate tags case-insensitively.
 */
export function extractAllTechnologies(
  snippets: Snippet[],
  additionalTechnologies: readonly string[] = []
): string[] {
  const techSet = new Set<string>();

  for (const t of additionalTechnologies) {
    if (t && t.trim()) {
      const canonical = canonicalizeTechnology(t);
      if (canonical) techSet.add(canonical);
    }
  }

  for (const snippet of snippets) {
    if (Array.isArray(snippet.technology)) {
      for (const t of snippet.technology) {
        if (t && t.trim()) {
          const canonical = canonicalizeTechnology(t);
          if (canonical) techSet.add(canonical);
        }
      }
    }
    // Also include canonical technology corresponding to the snippet's language if available
    if (snippet.language && snippet.language.trim()) {
      const canonical = canonicalizeTechnology(snippet.language);
      if (canonical) techSet.add(canonical);
    }
  }

  return Array.from(techSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Extracts all unique normalized languages from snippets.
 */
export function extractAllLanguages(snippets: Snippet[]): string[] {
  const languages = new Set<string>();
  for (const snippet of snippets) {
    if (snippet.language && snippet.language.trim()) {
      languages.add(canonicalizeLanguage(snippet.language));
    }
  }
  return Array.from(languages).sort((a, b) => a.localeCompare(b));
}

/**
 * Multi-faceted snippet filter supporting case-insensitive and canonical matching for
 * categories/folders, subcategories, tags, languages, technologies, and complexity.
 */
export function filterSnippets(snippets: Snippet[], filter: SnippetFilter): Snippet[] {
  const matchesCategoryOrFolder = (
    filterVal: string | string[] | undefined,
    itemCategory: string | undefined | null
  ): boolean => {
    if (!filterVal) return true;
    if (!itemCategory) return false;
    const filterArray = Array.isArray(filterVal) ? filterVal : [filterVal];
    if (filterArray.length === 0) return true;
    const target = itemCategory.trim().toLowerCase();
    return filterArray.some((f) => f.trim().toLowerCase() === target);
  };

  const matchesSubcategory = (
    filterVal: string | string[] | undefined,
    itemSubcategory: string | undefined | null
  ): boolean => {
    if (!filterVal) return true;
    if (!itemSubcategory) return false;
    const filterArray = Array.isArray(filterVal) ? filterVal : [filterVal];
    if (filterArray.length === 0) return true;
    const target = itemSubcategory.trim().toLowerCase();
    return filterArray.some((f) => f.trim().toLowerCase() === target);
  };

  const matchesLanguage = (
    filterVal: string | string[] | undefined,
    itemLang: string | undefined | null
  ): boolean => {
    if (!filterVal) return true;
    if (!itemLang) return false;
    const filterArray = Array.isArray(filterVal) ? filterVal : [filterVal];
    if (filterArray.length === 0) return true;
    const itemCanonicalLang = canonicalizeLanguage(itemLang);
    return filterArray.some((f) => {
      const filterCanonicalLang = canonicalizeLanguage(f);
      return (
        itemCanonicalLang === filterCanonicalLang ||
        matchesTechnologyOrTag(f, itemLang)
      );
    });
  };

  const matchesTag = (
    filterVal: string | string[] | undefined,
    itemTags: string[] | undefined | null
  ): boolean => {
    if (!filterVal) return true;
    if (!itemTags || itemTags.length === 0) return false;
    const filterArray = Array.isArray(filterVal) ? filterVal : [filterVal];
    if (filterArray.length === 0) return true;

    return filterArray.some((f) =>
      itemTags.some((t) => matchesTechnologyOrTag(f, t))
    );
  };

  const matchesTechnology = (
    filterVal: string | string[] | undefined,
    snippet: Snippet
  ): boolean => {
    if (!filterVal) return true;
    const filterArray = Array.isArray(filterVal) ? filterVal : [filterVal];
    if (filterArray.length === 0) return true;

    const techList = snippet.technology || [];
    return filterArray.some((f) => {
      // Check in technology list
      const inTech = techList.some((t) => matchesTechnologyOrTag(f, t));
      if (inTech) return true;

      // Check against language
      if (snippet.language && matchesTechnologyOrTag(f, snippet.language)) {
        return true;
      }

      // Check against tags
      if (snippet.tags && snippet.tags.some((t) => matchesTechnologyOrTag(f, t))) {
        return true;
      }

      return false;
    });
  };

  const matchesUsage = (
    filterVal: string | string[] | undefined,
    itemUsage: string[] | undefined | null
  ): boolean => {
    if (!filterVal) return true;
    if (!itemUsage || itemUsage.length === 0) return false;
    const filterArray = Array.isArray(filterVal) ? filterVal : [filterVal];
    if (filterArray.length === 0) return true;

    return filterArray.some((f) =>
      itemUsage.some((u) => u.trim().toLowerCase() === f.trim().toLowerCase())
    );
  };

  return snippets.filter((s) => {
    const targetFolderOrCategory = s.folder || s.category;
    if (filter.folder && !matchesCategoryOrFolder(filter.folder, targetFolderOrCategory)) {
      return false;
    }
    if (filter.domain && !matchesCategoryOrFolder(filter.domain, targetFolderOrCategory)) {
      return false;
    }
    if (filter.subcategory && !matchesSubcategory(filter.subcategory, s.subcategory)) {
      return false;
    }
    if (filter.language && !matchesLanguage(filter.language, s.language)) {
      return false;
    }
    if (filter.usage && !matchesUsage(filter.usage, s.usage)) {
      return false;
    }
    if (filter.tag && !matchesTag(filter.tag, s.tags)) {
      return false;
    }
    if (filter.technology && !matchesTechnology(filter.technology, s)) {
      return false;
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
      const inCategory = Boolean(s.category?.toLowerCase().includes(q));
      const inFolder = Boolean(s.folder?.toLowerCase().includes(q));
      const inLang = Boolean(s.language?.toLowerCase().includes(q));
      const inTags = s.tags.some((t) => matchesTechnologyOrTag(q, t) || t.toLowerCase().includes(q));
      const inTech = s.technology?.some((t) => matchesTechnologyOrTag(q, t) || t.toLowerCase().includes(q));
      if (!inTitle && !inCode && !inDesc && !inTags && !inTech && !inCategory && !inFolder && !inLang) {
        return false;
      }
    }
    return true;
  });
}
