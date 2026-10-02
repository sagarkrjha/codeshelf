import { useState, useMemo, useCallback } from 'react';
import type { Snippet, SnippetFilter } from '@codeshelf/shared';
import {
  DEFAULT_USAGES,
  extractAllCategories,
  extractCategorySubcategories,
  extractAllTechnologies,
  filterSnippets,
  rankSnippetsByQuery,
} from '@codeshelf/shared';

export interface FacetSelection {
  type: 'all' | 'domain' | 'tech' | 'usage' | 'tag' | 'subcategory' | 'markdown' | 'history';
  value: string;
  parentCategory?: string;
}

export function useSnippetSearch(snippets: Snippet[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(false);
  const [sortOption, setSortOption] = useState<'updated_desc' | 'created_desc' | 'title_asc'>('updated_desc');
  const [selectedFacet, setSelectedFacet] = useState<FacetSelection>({
    type: 'all',
    value: 'All',
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [modalFilter, setModalFilter] = useState<SnippetFilter>({});

  // Compute all unique tags across snippets
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    snippets.forEach((s) => s.tags?.forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet).sort();
  }, [snippets]);

  // Compute flexible taxonomy
  const allCategories = useMemo(() => extractAllCategories(snippets), [snippets]);
  const categorySubcategories = useMemo(() => extractCategorySubcategories(snippets), [snippets]);
  const allTechnologies = useMemo(() => {
    const techs = new Set<string>(extractAllTechnologies(snippets));
    snippets.forEach((s) => {
      if (s.language && s.language.trim()) {
        techs.add(s.language.trim());
      }
    });
    return Array.from(techs).sort((a, b) => a.localeCompare(b));
  }, [snippets]);

  const allUsages = useMemo(() => {
    const usagesSet = new Set<string>(DEFAULT_USAGES);
    snippets.forEach((s) => {
      s.usage?.forEach((u) => {
        if (u && u.trim()) usagesSet.add(u.trim());
      });
    });
    return Array.from(usagesSet).sort((a, b) => a.localeCompare(b));
  }, [snippets]);

  // Advanced search parser supporting query syntax (e.g. lang:ts tag:array)
  const parsedSearch = useMemo(() => {
    let raw = searchQuery.trim();
    let langFilter = '';
    let tagFilter = '';
    let domainFilter = '';

    const langMatch = raw.match(/lang:(\S+)/i);
    if (langMatch) {
      langFilter = langMatch[1]!.toLowerCase();
      raw = raw.replace(langMatch[0], '').trim();
    }

    const tagMatch = raw.match(/tag:(\S+)/i);
    if (tagMatch) {
      tagFilter = tagMatch[1]!.toLowerCase();
      raw = raw.replace(tagMatch[0], '').trim();
    }

    const domainMatch = raw.match(/domain:(\S+)/i);
    if (domainMatch) {
      domainFilter = domainMatch[1]!.toLowerCase();
      raw = raw.replace(domainMatch[0], '').trim();
    }

    return {
      freeText: raw.toLowerCase(),
      langFilter,
      tagFilter,
      domainFilter,
    };
  }, [searchQuery]);

  // Compute active modal filter count
  const activeModalFilterCount = useMemo(() => {
    let count = 0;
    if (modalFilter.domain) count += Array.isArray(modalFilter.domain) ? modalFilter.domain.length : 1;
    if (modalFilter.subcategory) count += Array.isArray(modalFilter.subcategory) ? modalFilter.subcategory.length : 1;
    if (modalFilter.technology) count += Array.isArray(modalFilter.technology) ? modalFilter.technology.length : 1;
    if (modalFilter.language) count += Array.isArray(modalFilter.language) ? modalFilter.language.length : 1;
    if (modalFilter.usage) count += Array.isArray(modalFilter.usage) ? modalFilter.usage.length : 1;
    if (modalFilter.tag) count += Array.isArray(modalFilter.tag) ? modalFilter.tag.length : 1;
    if (modalFilter.complexityTime) count += 1;
    if (modalFilter.complexitySpace) count += 1;
    return count;
  }, [modalFilter]);

  // Filter snippets based on parsed search, facet selection, modal filters, and optional semantic ranking
  const filteredSnippets = useMemo(() => {
    let baseList = snippets;
    if (activeModalFilterCount > 0) {
      baseList = filterSnippets(snippets, modalFilter);
    }

    const { freeText, langFilter, tagFilter, domainFilter } = parsedSearch;

    const matched = baseList.filter((s) => {
      // 1. Prefix query filters
      if (langFilter && !s.language.toLowerCase().includes(langFilter)) return false;
      if (tagFilter && !s.tags.some((t) => t.toLowerCase().includes(tagFilter))) return false;
      if (domainFilter && (!s.category || !s.category.toLowerCase().includes(domainFilter))) return false;

      // 2. Free text matching (when semantic ranking is disabled)
      if (freeText && !semanticSearchEnabled) {
        const matchesFreeText =
          s.title.toLowerCase().includes(freeText) ||
          s.code.toLowerCase().includes(freeText) ||
          s.language.toLowerCase().includes(freeText) ||
          s.tags.some((t) => t.toLowerCase().includes(freeText)) ||
          (s.description && s.description.toLowerCase().includes(freeText));
        if (!matchesFreeText) return false;
      }

      // 3. Facet matching
      if (selectedFacet.type === 'domain') {
        if (s.category !== selectedFacet.value) return false;
      } else if (selectedFacet.type === 'subcategory') {
        if (s.subcategory !== selectedFacet.value) return false;
        if (selectedFacet.parentCategory && s.category !== selectedFacet.parentCategory) return false;
      } else if (selectedFacet.type === 'tech') {
        const hasTech =
          s.technology?.includes(selectedFacet.value) ||
          s.language.toLowerCase() === selectedFacet.value.toLowerCase();
        if (!hasTech) return false;
      } else if (selectedFacet.type === 'usage') {
        if (!s.usage?.some((u) => u.toLowerCase() === selectedFacet.value.toLowerCase())) return false;
      } else if (selectedFacet.type === 'tag') {
        if (!s.tags.includes(selectedFacet.value)) return false;
      } else if (selectedFacet.type === 'markdown') {
        if (!s.markdown && (!s.codeBlocks || s.codeBlocks.length <= 1)) return false;
      } else if (selectedFacet.type === 'history') {
        if (!s.history || s.history.length === 0) return false;
      }

      return true;
    });

    // 4. Semantic ranking if enabled
    if (semanticSearchEnabled && freeText) {
      const ranked = rankSnippetsByQuery(freeText, matched);
      return ranked.map((r) => r.snippet);
    }

    // 5. Standard sort
    return matched.sort((a, b) => {
      if (sortOption === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortOption === 'created_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [
    snippets,
    parsedSearch,
    selectedFacet,
    sortOption,
    semanticSearchEnabled,
    modalFilter,
    activeModalFilterCount,
  ]);

  const clearFacet = useCallback(() => {
    setSelectedFacet({ type: 'all', value: 'All' });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedFacet({ type: 'all', value: 'All' });
    setModalFilter({});
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    semanticSearchEnabled,
    setSemanticSearchEnabled,
    sortOption,
    setSortOption,
    selectedFacet,
    setSelectedFacet,
    isFilterModalOpen,
    setIsFilterModalOpen,
    modalFilter,
    setModalFilter,
    allTags,
    allCategories,
    categorySubcategories,
    allTechnologies,
    allUsages,
    parsedSearch,
    activeModalFilterCount,
    filteredSnippets,
    clearFacet,
    clearAllFilters,
  };
}
