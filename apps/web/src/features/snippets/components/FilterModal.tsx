import { useState, useMemo } from 'react';
import type { Snippet, SnippetFilter } from '@codeshelf/shared';
import {
  extractAllCategories,
  extractAllTechnologies,
  extractAllLanguages,
  filterSnippets,
  normalizeTag,
} from '@codeshelf/shared';
import { X, Filter, RotateCcw, Check, Tag, Layers, Code, Clock } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  snippets: Snippet[];
  activeFilter: SnippetFilter;
  onClose: () => void;
  onApply: (filter: SnippetFilter) => void;
  onReset: () => void;
}

export function FilterModal({
  isOpen,
  snippets,
  activeFilter,
  onClose,
  onApply,
  onReset,
}: FilterModalProps) {
  // Working local state inside the modal
  const [selectedDomains, setSelectedDomains] = useState<string[]>(() => {
    if (!activeFilter.domain) return [];
    return Array.isArray(activeFilter.domain) ? activeFilter.domain : [activeFilter.domain];
  });

  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(() => {
    if (!activeFilter.subcategory) return [];
    return Array.isArray(activeFilter.subcategory) ? activeFilter.subcategory : [activeFilter.subcategory];
  });

  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>(() => {
    if (!activeFilter.technology) return [];
    return Array.isArray(activeFilter.technology) ? activeFilter.technology : [activeFilter.technology];
  });

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
    if (!activeFilter.language) return [];
    return Array.isArray(activeFilter.language) ? activeFilter.language : [activeFilter.language];
  });

  const [selectedUsages, setSelectedUsages] = useState<string[]>(() => {
    if (!activeFilter.usage) return [];
    return Array.isArray(activeFilter.usage) ? activeFilter.usage : [activeFilter.usage];
  });

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (!activeFilter.tag) return [];
    return Array.isArray(activeFilter.tag) ? activeFilter.tag : [activeFilter.tag];
  });

  const [complexityTime, setComplexityTime] = useState<string>(activeFilter.complexityTime || '');
  const [complexitySpace, setComplexitySpace] = useState<string>(activeFilter.complexitySpace || '');

  const [activeTab, setActiveTab] = useState<'categories' | 'tech' | 'tags' | 'complexity'>('categories');
  const [tagSearch, setTagSearch] = useState('');

  // Extract all available facets from dataset
  const allCategories = useMemo(() => extractAllCategories(snippets), [snippets]);
  const allTechnologies = useMemo(() => extractAllTechnologies(snippets), [snippets]);
  const allLanguages = useMemo(() => extractAllLanguages(snippets), [snippets]);

  // Extract all subcategories across snippets
  const allSubcategories = useMemo(() => {
    const set = new Set<string>();
    snippets.forEach((s) => {
      if (s.subcategory) set.add(s.subcategory);
    });
    return Array.from(set).sort();
  }, [snippets]);

  // Extract all tags with frequency counts (canonicalized and deduplicated)
  const allTagsWithCounts = useMemo(() => {
    const map = new Map<string, number>();
    snippets.forEach((s) => {
      const seenSnippetTags = new Set<string>();
      s.tags?.forEach((t) => {
        const normalized = normalizeTag(t);
        if (normalized && !seenSnippetTags.has(normalized)) {
          seenSnippetTags.add(normalized);
          map.set(normalized, (map.get(normalized) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [snippets]);

  // Calculate matching snippets count for live preview
  const previewFilter = useMemo<SnippetFilter>(() => {
    return {
      domain: selectedDomains.length > 0 ? selectedDomains : undefined,
      subcategory: selectedSubcategories.length > 0 ? selectedSubcategories : undefined,
      technology: selectedTechnologies.length > 0 ? selectedTechnologies : undefined,
      language: selectedLanguages.length > 0 ? selectedLanguages : undefined,
      usage: selectedUsages.length > 0 ? selectedUsages : undefined,
      tag: selectedTags.length > 0 ? selectedTags : undefined,
      complexityTime: complexityTime || undefined,
      complexitySpace: complexitySpace || undefined,
    };
  }, [
    selectedDomains,
    selectedSubcategories,
    selectedTechnologies,
    selectedLanguages,
    selectedUsages,
    selectedTags,
    complexityTime,
    complexitySpace,
  ]);

  const matchedCount = useMemo(() => {
    return filterSnippets(snippets, previewFilter).length;
  }, [snippets, previewFilter]);

  const totalActiveFilterCount =
    selectedDomains.length +
    selectedSubcategories.length +
    selectedTechnologies.length +
    selectedLanguages.length +
    selectedUsages.length +
    selectedTags.length +
    (complexityTime ? 1 : 0) +
    (complexitySpace ? 1 : 0);

  if (!isOpen) return null;

  const toggleArrayItem = (item: string, list: string[], setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleApplyClick = () => {
    onApply(previewFilter);
    onClose();
  };

  const handleResetClick = () => {
    setSelectedDomains([]);
    setSelectedSubcategories([]);
    setSelectedTechnologies([]);
    setSelectedLanguages([]);
    setSelectedUsages([]);
    setSelectedTags([]);
    setComplexityTime('');
    setComplexitySpace('');
    onReset();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-[3px] p-4">
      <div className="bg-bg-secondary border border-border-color rounded-xl w-full max-w-[780px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-bg-secondary">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-accent" />
            <h2 className="text-base font-semibold text-text-main">Filter Snippets</h2>
            {totalActiveFilterCount > 0 && (
              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full text-xs font-semibold">
                {totalActiveFilterCount} active
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-text-muted hover:text-text-main cursor-pointer p-1 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-color bg-bg-primary px-4 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-2.5 bg-transparent border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-accent text-text-main'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <Layers size={14} /> Categories & Subcategories
            {selectedDomains.length + selectedSubcategories.length > 0 && (
              <span className="badge ml-1">{selectedDomains.length + selectedSubcategories.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tech')}
            className={`px-3.5 py-2.5 bg-transparent border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'tech'
                ? 'border-accent text-text-main'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <Code size={14} /> Technology & Language
            {selectedTechnologies.length + selectedLanguages.length > 0 && (
              <span className="badge ml-1">{selectedTechnologies.length + selectedLanguages.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-3.5 py-2.5 bg-transparent border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'tags'
                ? 'border-accent text-text-main'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <Tag size={14} /> Tags & Context
            {selectedTags.length + selectedUsages.length > 0 && (
              <span className="badge ml-1">{selectedTags.length + selectedUsages.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('complexity')}
            className={`px-3.5 py-2.5 bg-transparent border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'complexity'
                ? 'border-accent text-text-main'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <Clock size={14} /> Complexity
            {(complexityTime || complexitySpace) && <span className="badge ml-1">Active</span>}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'categories' && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="text-xs uppercase font-semibold text-text-muted mb-2.5 tracking-wider">
                  Categories & Domains (Standard & Custom)
                </div>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => {
                    const isSelected = selectedDomains.includes(cat);
                    const count = snippets.filter((s) => s.category === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleArrayItem(cat, selectedDomains, setSelectedDomains)}
                        className={`px-3 py-1.5 rounded-md text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all font-medium border ${
                          isSelected
                            ? 'bg-blue-500/25 text-blue-300 border-blue-500'
                            : 'bg-bg-tertiary text-text-main border-border-color hover:bg-border-color'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        <span>{cat}</span>
                        <span className="text-[0.72rem] opacity-60">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {allSubcategories.length > 0 && (
                <div>
                  <div className="text-xs uppercase font-semibold text-text-muted mb-2.5 tracking-wider">
                    Subcategories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allSubcategories.map((sub) => {
                      const isSelected = selectedSubcategories.includes(sub);
                      const count = snippets.filter((s) => s.subcategory === sub).length;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => toggleArrayItem(sub, selectedSubcategories, setSelectedSubcategories)}
                          className={`px-3 py-1.5 rounded-md text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all font-medium border ${
                            isSelected
                              ? 'bg-blue-500/25 text-blue-300 border-blue-500'
                              : 'bg-bg-tertiary text-text-main border-border-color hover:bg-border-color'
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                          <span>{sub}</span>
                          <span className="text-[0.72rem] opacity-60">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tech' && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="text-xs uppercase font-semibold text-text-muted mb-2.5 tracking-wider">
                  Technologies & Frameworks
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTechnologies.map((tech) => {
                    const isSelected = selectedTechnologies.includes(tech);
                    const count = snippets.filter(
                      (s) => s.technology?.includes(tech) || s.language.toLowerCase() === tech.toLowerCase()
                    ).length;
                    return (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => toggleArrayItem(tech, selectedTechnologies, setSelectedTechnologies)}
                        className={`px-3 py-1.5 rounded-md text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all font-medium border ${
                          isSelected
                            ? 'bg-blue-500/25 text-blue-300 border-blue-500'
                            : 'bg-bg-tertiary text-text-main border-border-color hover:bg-border-color'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        <span>{tech}</span>
                        {count > 0 && <span className="text-[0.72rem] opacity-60">({count})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase font-semibold text-text-muted mb-2.5 tracking-wider">
                  Programming Languages
                </div>
                <div className="flex flex-wrap gap-2">
                  {allLanguages.map((lang) => {
                    const isSelected = selectedLanguages.includes(lang);
                    const count = snippets.filter((s) => s.language.toLowerCase() === lang.toLowerCase()).length;
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleArrayItem(lang, selectedLanguages, setSelectedLanguages)}
                        className={`px-3 py-1.5 rounded-md text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all font-medium border ${
                          isSelected
                            ? 'bg-blue-500/25 text-blue-300 border-blue-500'
                            : 'bg-bg-tertiary text-text-main border-border-color hover:bg-border-color'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        <span>{lang}</span>
                        <span className="text-[0.72rem] opacity-60">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Search tags..."
                className="search-input"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5 max-h-[240px] overflow-y-auto">
                {allTagsWithCounts
                  .filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                  .map((t) => {
                    const isSelected = selectedTags.includes(t.name);
                    return (
                      <span
                        key={t.name}
                        onClick={() => toggleArrayItem(t.name, selectedTags, setSelectedTags)}
                        className={`badge cursor-pointer px-2.5 py-1 text-xs border transition-colors ${
                          isSelected
                            ? 'bg-accent text-white border-accent'
                            : 'bg-tag-bg text-tag-text border-transparent hover:border-accent'
                        }`}
                      >
                        #{t.name} ({t.count})
                      </span>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'complexity' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase font-semibold text-text-muted block mb-2 tracking-wider">
                  Time Complexity Filter
                </label>
                <div className="flex flex-col gap-1.5">
                  {['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'].map((tc) => (
                    <button
                      key={tc}
                      type="button"
                      onClick={() => setComplexityTime(complexityTime === tc ? '' : tc)}
                      className={`px-3 py-2 rounded-md text-xs cursor-pointer text-left transition-all border font-medium ${
                        complexityTime === tc
                          ? 'bg-blue-500/25 text-blue-300 border-blue-500'
                          : 'bg-bg-tertiary text-text-main border-border-color hover:bg-border-color'
                      }`}
                    >
                      {tc}
                    </button>
                  ))}
                  <input
                    type="text"
                    className="search-input mt-1"
                    placeholder="Custom time complexity..."
                    value={complexityTime}
                    onChange={(e) => setComplexityTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-semibold text-text-muted block mb-2 tracking-wider">
                  Space Complexity Filter
                </label>
                <div className="flex flex-col gap-1.5">
                  {['O(1)', 'O(n)', 'O(n^2)'].map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setComplexitySpace(complexitySpace === sc ? '' : sc)}
                      className={`px-3 py-2 rounded-md text-xs cursor-pointer text-left transition-all border font-medium ${
                        complexitySpace === sc
                          ? 'bg-blue-500/25 text-blue-300 border-blue-500'
                          : 'bg-bg-tertiary text-text-main border-border-color hover:bg-border-color'
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                  <input
                    type="text"
                    className="search-input mt-1"
                    placeholder="Custom space complexity..."
                    value={complexitySpace}
                    onChange={(e) => setComplexitySpace(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border-color bg-bg-secondary flex justify-between items-center">
          <div className="text-xs sm:text-sm text-text-muted">
            Matching: <strong className="text-text-main">{matchedCount}</strong> of {snippets.length} snippets
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleResetClick}
              disabled={totalActiveFilterCount === 0}
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button type="button" className="btn btn-primary" onClick={handleApplyClick}>
              Apply Filters ({matchedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
