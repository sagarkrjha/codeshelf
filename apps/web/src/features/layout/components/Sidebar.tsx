import { useState, useMemo } from 'react';
import type { Snippet, AppUpdateInfo, SnippetFilter } from '@codeshelf/shared';
import {
  canonicalizeTechnology,
  normalizeTag,
  matchesTechnologyOrTag,
} from '@codeshelf/shared';
import type { FacetSelection } from '../../search/index';
import type { ActivityTab } from '../hooks/useLayoutState';
import {
  Files,
  Search,
  Tag as TagIcon,
  Settings,
  Plus,
  ChevronRight,
  ChevronDown,
  Upload,
  FolderGit2,
  RotateCcw,
  Download,
  Sparkles,
  FileText,
  History,
  Layers,
  Folder,
  FolderOpen,
  FileCode,
  Trash2,
  Check,
  X,
  FileArchive,
  ArrowUpDown,
  SlidersHorizontal,
  Clock,
  PanelLeftClose,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onCollapse: () => void;
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  // Snippets & Navigation
  snippets: Snippet[];
  selectedFacet: FacetSelection;
  onSelectFacet: (facet: FacetSelection) => void;
  allCategories: string[];
  categorySubcategories: Record<string, string[]>;
  expandedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  allTechnologies: string[];
  allTags: string[];
  customCategories?: string[];
  customTags?: string[];
  onAddFolder?: (folderName: string) => void;
  onDeleteFolder?: (folderName: string) => void;
  onAddTag?: (tagName: string) => void;
  onDeleteTag?: (tagName: string) => void;
  // Search & List state
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: 'updated_desc' | 'created_desc' | 'title_asc';
  onSortChange: (sort: 'updated_desc' | 'created_desc' | 'title_asc') => void;
  semanticSearchEnabled: boolean;
  onToggleSemantic: () => void;
  activeModalFilterCount: number;
  onOpenFilterModal: () => void;
  modalFilter: SnippetFilter;
  onClearFacet: () => void;
  onClearFilterField: (field: keyof SnippetFilter) => void;
  onClearAllFilters: () => void;
  filteredSnippets: Snippet[];
  activeSnippetId?: string;
  onSelectSnippet: (id: string) => void;
  // Primary actions
  onNewSnippet: () => void;
  onImportMarkdown: () => void;
  onExportGitSync: () => void;
  onRestoreBackup: () => void;
  onExportBackup: () => void;
  onExportCompressedBackup?: () => void;
  appVersion: string;
  updateInfo: AppUpdateInfo | null;
  onOpenUpdates: () => void;
  onOpenGeminiKey: () => void;
  hasGeminiKey?: boolean;
}

export function Sidebar({
  isCollapsed,
  onCollapse,
  activeTab,
  onTabChange,
  snippets,
  selectedFacet,
  onSelectFacet,
  allCategories,
  categorySubcategories,
  expandedCategories,
  onToggleCategory,
  allTechnologies,
  allTags,
  customCategories = [],
  customTags = [],
  onAddFolder,
  onDeleteFolder,
  onAddTag,
  onDeleteTag,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  semanticSearchEnabled,
  onToggleSemantic,
  activeModalFilterCount,
  onOpenFilterModal,
  modalFilter,
  onClearFacet,
  onClearFilterField,
  onClearAllFilters,
  filteredSnippets,
  activeSnippetId,
  onSelectSnippet,
  onNewSnippet,
  onImportMarkdown,
  onExportGitSync,
  onRestoreBackup,
  onExportBackup,
  onExportCompressedBackup,
  appVersion,
  updateInfo,
  onOpenUpdates,
  onOpenGeminiKey,
  hasGeminiKey,
}: SidebarProps) {
  // Subfolders expansion state (keyed by `${folder}::${sub}`)
  const [expandedSubfolders, setExpandedSubfolders] = useState<Set<string>>(() => new Set());
  const toggleSubfolder = (key: string) => {
    setExpandedSubfolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Inline creation states for folders and tags
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Derived counts for views
  const markdownDocsCount = useMemo(() => {
    return snippets.filter((s) => s.markdown || (s.codeBlocks && s.codeBlocks.length > 1)).length;
  }, [snippets]);

  const historyCount = useMemo(() => {
    return snippets.filter((s) => s.history && s.history.length > 0).length;
  }, [snippets]);

  // Combined tech and tag items without duplication (canonicalized and deduplicated)
  const combinedTechAndTags = useMemo(() => {
    const set = new Set<string>();
    const seenLower = new Set<string>();

    allTechnologies.forEach((t) => {
      if (t?.trim()) {
        const canonical = canonicalizeTechnology(t);
        const lower = canonical.toLowerCase();
        if (!seenLower.has(lower)) {
          seenLower.add(lower);
          set.add(canonical);
        }
      }
    });

    allTags.forEach((t) => {
      if (t?.trim()) {
        const normalized = normalizeTag(t);
        const lower = normalized.toLowerCase();
        if (!seenLower.has(lower)) {
          seenLower.add(lower);
          set.add(normalized);
        }
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allTechnologies, allTags]);

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (trimmed && onAddFolder) {
      onAddFolder(trimmed);
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  const handleCreateTag = () => {
    const trimmed = newTagName.trim().replace(/^#/, '');
    if (trimmed && onAddTag) {
      onAddTag(trimmed);
      setNewTagName('');
      setIsAddingTag(false);
    }
  };

  // Compute snippets visible in Explorer hierarchy (quick-filtered by search query, but not wiped out by selectedFacet)
  const treeSnippets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.language.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [snippets, searchQuery]);

  const hasActiveFilters = activeModalFilterCount > 0 || selectedFacet.type !== 'all';

  return (
    <div className="flex h-full shrink-0 select-none">
      {/* 1. VS Code Left Activity Bar Strip (48px) */}
      <aside className="w-12 min-w-12 bg-bg-tertiary border-r border-border-color flex flex-col justify-between items-center py-2 z-10">
        {/* Top Activity Bar Navigation Icons */}
        <div className="flex flex-col gap-1 w-full items-center">
          <button
            type="button"
            className={`w-10 h-10 flex items-center justify-center rounded-md cursor-pointer transition-colors relative ${
              activeTab === 'explorer' && !isCollapsed
                ? 'text-text-main bg-bg-secondary/60 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-accent before:rounded-r'
                : 'text-text-muted hover:text-text-main hover:bg-bg-secondary/30'
            }`}
            onClick={() => {
              if (activeTab === 'explorer' && !isCollapsed) {
                onCollapse();
              } else {
                onTabChange('explorer');
              }
            }}
            title="Explorer (Snippets & Folders - Ctrl+Shift+E)"
          >
            <Files size={20} />
          </button>

          <button
            type="button"
            className={`w-10 h-10 flex items-center justify-center rounded-md cursor-pointer transition-colors relative ${
              activeTab === 'search' && !isCollapsed
                ? 'text-text-main bg-bg-secondary/60 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-accent before:rounded-r'
                : 'text-text-muted hover:text-text-main hover:bg-bg-secondary/30'
            }`}
            onClick={() => {
              if (activeTab === 'search' && !isCollapsed) {
                onCollapse();
              } else {
                onTabChange('search');
              }
            }}
            title="Search & Filters (Ctrl+Shift+F)"
          >
            <Search size={20} />
          </button>

          <button
            type="button"
            className={`w-10 h-10 flex items-center justify-center rounded-md cursor-pointer transition-colors relative ${
              activeTab === 'tags' && !isCollapsed
                ? 'text-text-main bg-bg-secondary/60 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-accent before:rounded-r'
                : 'text-text-muted hover:text-text-main hover:bg-bg-secondary/30'
            }`}
            onClick={() => {
              if (activeTab === 'tags' && !isCollapsed) {
                onCollapse();
              } else {
                onTabChange('tags');
              }
            }}
            title="Technologies & Tags"
          >
            <TagIcon size={20} />
          </button>
        </div>

        {/* Bottom Activity Bar Icons */}
        <div className="flex flex-col gap-1 w-full items-center">
          <button
            type="button"
            className={`w-10 h-10 flex items-center justify-center rounded-md cursor-pointer transition-colors relative ${
              hasGeminiKey ? 'text-emerald-400' : 'text-blue-400'
            } hover:bg-bg-secondary/40`}
            onClick={onOpenGeminiKey}
            title={hasGeminiKey ? 'Gemini AI configured (click to edit)' : 'Set Gemini AI Key'}
          >
            <Sparkles size={18} />
          </button>

          <button
            type="button"
            className={`w-10 h-10 flex items-center justify-center rounded-md cursor-pointer transition-colors relative ${
              activeTab === 'settings' && !isCollapsed
                ? 'text-text-main bg-bg-secondary/60 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-accent before:rounded-r'
                : 'text-text-muted hover:text-text-main hover:bg-bg-secondary/30'
            }`}
            onClick={() => {
              if (activeTab === 'settings' && !isCollapsed) {
                onCollapse();
              } else {
                onTabChange('settings');
              }
            }}
            title="Settings, Sync & Backup"
          >
            <Settings size={18} />
            {updateInfo?.hasUpdate && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
        </div>
      </aside>

      {/* 2. VS Code Primary Sidebar Panel (Collapsible, ~320px) */}
      <section
        className={`w-80 min-w-80 bg-bg-secondary border-r border-border-color flex flex-col transition-all duration-200 overflow-hidden ${
          isCollapsed ? 'w-0! min-w-0! p-0! border-r-0! opacity-0 pointer-events-none' : ''
        }`}
      >
        {/* Header Bar */}
        <div className="h-10 px-3 border-b border-border-color flex items-center justify-between shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <span>
              {activeTab === 'explorer'
                ? 'Explorer'
                : activeTab === 'search'
                ? 'Search'
                : activeTab === 'tags'
                ? 'Technologies & Tags'
                : 'Settings & Storage'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-text-muted">
            <button
              type="button"
              className="p-1 rounded hover:bg-bg-tertiary hover:text-text-main cursor-pointer transition-colors"
              onClick={onNewSnippet}
              title="New Snippet"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-bg-tertiary hover:text-text-main cursor-pointer transition-colors"
              onClick={onCollapse}
              title="Close Sidebar (Ctrl+B)"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
        </div>

        {/* Tab 1: EXPLORER VIEW (Unified Folders & Snippets Tree) */}
        {activeTab === 'explorer' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Quick Search & Sort in Explorer */}
            <div className="p-2 border-b border-border-color bg-bg-primary/40 shrink-0 flex flex-col gap-1.5">
              <div className="relative">
                <input
                  type="text"
                  className="search-input pl-7 py-1 text-xs w-full"
                  placeholder="Filter explorer snippets..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                <Search
                  size={12}
                  className="absolute left-2.5 top-2 text-text-muted pointer-events-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1.5 text-text-muted hover:text-text-main cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-text-muted px-0.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold">
                  {filteredSnippets.length} {filteredSnippets.length === 1 ? 'snippet' : 'snippets'}
                </span>
                <div className="flex items-center gap-1">
                  <select
                    value={sortOption}
                    onChange={(e) => onSortChange(e.target.value as any)}
                    className="bg-transparent border-0 text-text-muted text-[11px] outline-none cursor-pointer"
                    title="Sort snippets"
                  >
                    <option value="updated_desc" className="bg-bg-secondary text-text-main">
                      Recent
                    </option>
                    <option value="created_desc" className="bg-bg-secondary text-text-main">
                      Created
                    </option>
                    <option value="title_asc" className="bg-bg-secondary text-text-main">
                      Title
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tree Section Header */}
            <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] font-semibold text-text-muted bg-bg-primary/20 border-b border-border-color shrink-0 select-none">
              <div className="flex items-center gap-1 uppercase tracking-wider">
                <span>Folders & Files</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="p-0.5 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary cursor-pointer"
                  onClick={() => setIsAddingFolder(true)}
                  title="New Folder"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Inline folder creation */}
            {isAddingFolder && (
              <div className="flex items-center gap-1 p-1.5 bg-bg-primary/50 border-b border-border-color">
                <input
                  type="text"
                  autoFocus
                  placeholder="New folder..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') {
                      setIsAddingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  className="search-input py-0.5 px-1.5 text-xs flex-1 bg-bg-primary rounded border border-border-color text-text-main"
                />
                <button
                  type="button"
                  className="p-1 text-accent hover:bg-bg-tertiary cursor-pointer rounded"
                  onClick={handleCreateFolder}
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  className="p-1 text-text-muted hover:bg-bg-tertiary cursor-pointer rounded"
                  onClick={() => {
                    setIsAddingFolder(false);
                    setNewFolderName('');
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Hierarchical Explorer Tree Container */}
            <div className="flex-1 overflow-y-auto p-1 flex flex-col gap-0.5 text-xs">
              {/* Quick Filters / Views */}
              <div
                className={`px-2 py-1 rounded cursor-pointer flex justify-between items-center transition-colors ${
                  selectedFacet.type === 'all'
                    ? 'bg-bg-tertiary text-text-main font-medium'
                    : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                }`}
                onClick={() => onSelectFacet({ type: 'all', value: 'All' })}
              >
                <div className="flex items-center gap-1.5">
                  <Layers size={13} />
                  <span>All Snippets</span>
                </div>
                <span className="opacity-60 text-[0.7rem]">{snippets.length}</span>
              </div>

              <div
                className={`px-2 py-1 rounded cursor-pointer flex justify-between items-center transition-colors ${
                  selectedFacet.type === 'markdown'
                    ? 'bg-bg-tertiary text-text-main font-medium'
                    : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                }`}
                onClick={() => onSelectFacet({ type: 'markdown', value: 'Markdown Documents' })}
              >
                <div className="flex items-center gap-1.5">
                  <FileText size={13} />
                  <span>Markdown Docs</span>
                </div>
                {markdownDocsCount > 0 && (
                  <span className="opacity-60 text-[0.7rem]">{markdownDocsCount}</span>
                )}
              </div>

              <div
                className={`px-2 py-1 rounded cursor-pointer flex justify-between items-center transition-colors ${
                  selectedFacet.type === 'history'
                    ? 'bg-bg-tertiary text-text-main font-medium'
                    : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                }`}
                onClick={() => onSelectFacet({ type: 'history', value: 'With Revisions' })}
              >
                <div className="flex items-center gap-1.5">
                  <History size={13} />
                  <span>With Revisions</span>
                </div>
                {historyCount > 0 && (
                  <span className="opacity-60 text-[0.7rem]">{historyCount}</span>
                )}
              </div>

              <div className="h-px bg-border-color my-1 mx-1 opacity-60" />

              {/* Folders & Subfolders & Snippets Tree */}
              {allCategories.map((folder) => {
                const folderSnippets = treeSnippets.filter(
                  (s) => s.category?.trim().toLowerCase() === folder.trim().toLowerCase()
                );
                const totalCount = snippets.filter(
                  (s) => s.category?.trim().toLowerCase() === folder.trim().toLowerCase()
                ).length;
                const subfolders = categorySubcategories[folder] || [];
                const isExpanded = expandedCategories.has(folder);
                const isFolderActive =
                  (selectedFacet.type === 'folder' || selectedFacet.type === 'domain') &&
                  selectedFacet.value.trim().toLowerCase() === folder.trim().toLowerCase();
                const isCustom = customCategories.some(
                  (c) => c.trim().toLowerCase() === folder.trim().toLowerCase()
                );

                // Direct snippets under folder that do NOT belong to any subfolder
                const directFolderSnippets = folderSnippets.filter((s) => !s.subcategory?.trim());

                return (
                  <div key={folder} className="group/folder flex flex-col">
                    {/* Folder Row */}
                    <div
                      className={`px-1.5 py-1 rounded cursor-pointer flex justify-between items-center transition-colors ${
                        isFolderActive
                          ? 'bg-bg-tertiary text-text-main font-medium'
                          : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                      }`}
                      onClick={() => {
                        onToggleCategory(folder);
                        onSelectFacet({ type: 'folder', value: folder });
                      }}
                    >
                      <div className="flex items-center gap-1 overflow-hidden min-w-0">
                        <span
                          className="p-0.5 hover:text-text-main rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCategory(folder);
                          }}
                        >
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </span>
                        {isExpanded ? (
                          <FolderOpen size={13} className="shrink-0 text-accent/80" />
                        ) : (
                          <Folder size={13} className="shrink-0" />
                        )}
                        <span className="truncate font-medium">{folder}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {totalCount > 0 && <span className="opacity-60 text-[0.7rem]">{totalCount}</span>}
                        {isCustom && onDeleteFolder && (
                          <button
                            type="button"
                            className="opacity-0 group-hover/folder:opacity-100 hover:text-red-400 p-0.5 rounded cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteFolder(folder);
                            }}
                            title={`Delete folder "${folder}"`}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Children when folder is expanded */}
                    {isExpanded && (
                      <div className="flex flex-col ml-3 pl-1.5 border-l border-border-color/50 my-0.5 gap-0.5">
                        {/* Subfolders */}
                        {subfolders.map((sub) => {
                          const subKey = `${folder}::${sub}`;
                          const isSubExpanded = expandedSubfolders.has(subKey);
                          const subSnippets = folderSnippets.filter(
                            (s) => s.subcategory?.trim().toLowerCase() === sub.trim().toLowerCase()
                          );
                          const subTotalCount = snippets.filter(
                            (s) =>
                              s.category?.trim().toLowerCase() === folder.trim().toLowerCase() &&
                              s.subcategory?.trim().toLowerCase() === sub.trim().toLowerCase()
                          ).length;
                          const isSubActive =
                            selectedFacet.type === 'subcategory' &&
                            selectedFacet.value.trim().toLowerCase() === sub.trim().toLowerCase() &&
                            selectedFacet.parentCategory?.trim().toLowerCase() === folder.trim().toLowerCase();

                          return (
                            <div key={sub} className="flex flex-col">
                              {/* Subfolder Row */}
                              <div
                                className={`px-1.5 py-0.5 rounded cursor-pointer flex justify-between items-center text-[11px] transition-colors ${
                                  isSubActive
                                    ? 'bg-bg-tertiary text-text-main font-medium'
                                    : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                                }`}
                                onClick={() => {
                                  toggleSubfolder(subKey);
                                  onSelectFacet({
                                    type: 'subcategory',
                                    value: sub,
                                    parentCategory: folder,
                                  });
                                }}
                              >
                                <div className="flex items-center gap-1 overflow-hidden min-w-0">
                                  <span
                                    className="p-0.5 hover:text-text-main rounded"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSubfolder(subKey);
                                    }}
                                  >
                                    {isSubExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                  </span>
                                  {isSubExpanded ? (
                                    <FolderOpen size={12} className="shrink-0 text-accent/70" />
                                  ) : (
                                    <Folder size={12} className="shrink-0" />
                                  )}
                                  <span className="truncate">{sub}</span>
                                </div>
                                {subTotalCount > 0 && (
                                  <span className="opacity-60 text-[0.65rem] shrink-0">{subTotalCount}</span>
                                )}
                              </div>

                              {/* Snippets under Subfolder */}
                              {isSubExpanded && (
                                <div className="flex flex-col ml-3 pl-1.5 border-l border-border-color/40 my-0.5 gap-0.5">
                                  {subSnippets.length === 0 ? (
                                    <div className="text-[10px] text-text-muted italic px-2 py-0.5">
                                      Empty subfolder
                                    </div>
                                  ) : (
                                    subSnippets.map((item) => (
                                      <div
                                        key={item.id}
                                        className={`px-2 py-1 rounded cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                          item.id === activeSnippetId
                                            ? 'bg-bg-tertiary text-accent font-medium border-l-2 border-accent'
                                            : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                                        }`}
                                        onClick={() => onSelectSnippet(item.id)}
                                        title={item.title}
                                      >
                                        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                                          {item.markdown ? (
                                            <FileText size={12} className="shrink-0 text-accent/80" />
                                          ) : (
                                            <FileCode size={12} className="shrink-0 text-text-muted" />
                                          )}
                                          <span className="truncate">{item.title}</span>
                                        </div>
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-bg-secondary text-text-muted shrink-0 uppercase">
                                          {item.language}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Direct Snippets under Folder (No Subcategory) */}
                        {directFolderSnippets.map((item) => (
                          <div
                            key={item.id}
                            className={`px-2 py-1 rounded cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              item.id === activeSnippetId
                                ? 'bg-bg-tertiary text-accent font-medium border-l-2 border-accent'
                                : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                            }`}
                            onClick={() => onSelectSnippet(item.id)}
                            title={item.title}
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                              {item.markdown ? (
                                <FileText size={12} className="shrink-0 text-accent/80" />
                              ) : (
                                <FileCode size={12} className="shrink-0 text-text-muted" />
                              )}
                              <span className="truncate">{item.title}</span>
                            </div>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-bg-secondary text-text-muted shrink-0 uppercase">
                              {item.language}
                            </span>
                          </div>
                        ))}

                        {folderSnippets.length === 0 && subfolders.length === 0 && (
                          <div className="text-[10px] text-text-muted italic px-2 py-0.5">
                            Empty folder
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Uncategorized Snippets (No category assigned) */}
              {(() => {
                const uncategorizedSnippets = treeSnippets.filter(
                  (s) =>
                    !s.category?.trim() ||
                    !allCategories.some(
                      (c) => c.trim().toLowerCase() === s.category?.trim().toLowerCase()
                    )
                );
                if (uncategorizedSnippets.length === 0) return null;

                const isUncategorizedExpanded = expandedCategories.has('__uncategorized__');

                return (
                  <div className="flex flex-col mt-1">
                    <div
                      className="px-1.5 py-1 rounded cursor-pointer flex justify-between items-center text-text-muted hover:bg-bg-tertiary hover:text-text-main transition-colors"
                      onClick={() => onToggleCategory('__uncategorized__')}
                    >
                      <div className="flex items-center gap-1 overflow-hidden min-w-0">
                        <span className="p-0.5 hover:text-text-main rounded">
                          {isUncategorizedExpanded ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                        </span>
                        {isUncategorizedExpanded ? (
                          <FolderOpen size={13} className="shrink-0 text-text-muted" />
                        ) : (
                          <Folder size={13} className="shrink-0 text-text-muted" />
                        )}
                        <span className="truncate italic">Uncategorized</span>
                      </div>
                      <span className="opacity-60 text-[0.7rem] shrink-0">
                        {uncategorizedSnippets.length}
                      </span>
                    </div>

                    {isUncategorizedExpanded && (
                      <div className="flex flex-col ml-3 pl-1.5 border-l border-border-color/50 my-0.5 gap-0.5">
                        {uncategorizedSnippets.map((item) => (
                          <div
                            key={item.id}
                            className={`px-2 py-1 rounded cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              item.id === activeSnippetId
                                ? 'bg-bg-tertiary text-accent font-medium border-l-2 border-accent'
                                : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                            }`}
                            onClick={() => onSelectSnippet(item.id)}
                            title={item.title}
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                              {item.markdown ? (
                                <FileText size={12} className="shrink-0 text-accent/80" />
                              ) : (
                                <FileCode size={12} className="shrink-0 text-text-muted" />
                              )}
                              <span className="truncate">{item.title}</span>
                            </div>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-bg-secondary text-text-muted shrink-0 uppercase">
                              {item.language}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {allCategories.length === 0 && snippets.length === 0 && (
                <div className="text-text-muted text-xs italic p-4 text-center">
                  No folders or snippets yet. Click + to create a folder or snippet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: SEARCH & ADVANCED FILTERS VIEW */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Input & Options */}
            <div className="p-3 border-b border-border-color flex flex-col gap-2 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  className="search-input pl-8 py-1.5 text-xs w-full"
                  placeholder={
                    semanticSearchEnabled
                      ? 'Semantic search (intent/concept)...'
                      : 'Search (e.g. lang:ts tag:auth)...'
                  }
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  autoFocus
                />
                <Search
                  size={14}
                  className="absolute left-2.5 top-2.5 text-text-muted pointer-events-none"
                />
              </div>

              {/* Toggles: Sort, Semantic, Filter Modal */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <div className="flex items-center gap-1">
                    <ArrowUpDown size={11} />
                    <select
                      value={sortOption}
                      onChange={(e) => onSortChange(e.target.value as any)}
                      disabled={semanticSearchEnabled}
                      className="bg-transparent border-0 text-text-muted text-xs outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="updated_desc" className="bg-bg-secondary text-text-main">
                        Recently Updated
                      </option>
                      <option value="created_desc" className="bg-bg-secondary text-text-main">
                        Recently Created
                      </option>
                      <option value="title_asc" className="bg-bg-secondary text-text-main">
                        Title (A-Z)
                      </option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className={`btn text-[0.7rem] py-0.5 px-1.5 ${
                      semanticSearchEnabled
                        ? 'bg-purple-900/30 border-purple-500 text-purple-300'
                        : 'bg-transparent border-border-color text-text-muted'
                    }`}
                    onClick={onToggleSemantic}
                    title="Toggle Semantic Intent Ranking"
                  >
                    <Sparkles size={11} /> Semantic
                  </button>

                  <button
                    type="button"
                    className={`btn text-[0.7rem] py-0.5 px-1.5 ${
                      activeModalFilterCount > 0
                        ? 'bg-blue-900/30 border-blue-500 text-blue-300'
                        : 'bg-transparent border-border-color text-text-muted'
                    }`}
                    onClick={onOpenFilterModal}
                    title="Open Filter Modal"
                  >
                    <SlidersHorizontal size={11} /> Filters{' '}
                    {activeModalFilterCount > 0 && `(${activeModalFilterCount})`}
                  </button>
                </div>
              </div>

              {/* Active Filter Chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-1 pt-1.5 border-t border-border-color items-center">
                  {selectedFacet.type !== 'all' && (
                    <span className="badge bg-blue-900/30 text-blue-300 border border-blue-500 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px]">
                      <span>
                        {selectedFacet.type === 'folder' || selectedFacet.type === 'domain'
                          ? 'Folder'
                          : selectedFacet.type === 'markdown' || selectedFacet.type === 'history'
                          ? 'View'
                          : selectedFacet.type}
                        : {selectedFacet.value}
                      </span>
                      <X
                        size={11}
                        className="cursor-pointer hover:text-white"
                        onClick={onClearFacet}
                      />
                    </span>
                  )}

                  {modalFilter.domain && (
                    <span className="badge bg-purple-900/30 text-purple-300 border border-purple-500 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px]">
                      <span>
                        Category:{' '}
                        {Array.isArray(modalFilter.domain)
                          ? modalFilter.domain.join(', ')
                          : modalFilter.domain}
                      </span>
                      <X
                        size={11}
                        className="cursor-pointer hover:text-white"
                        onClick={() => onClearFilterField('domain')}
                      />
                    </span>
                  )}

                  {modalFilter.technology && (
                    <span className="badge bg-emerald-900/30 text-emerald-300 border border-emerald-500 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px]">
                      <span>
                        Tech:{' '}
                        {Array.isArray(modalFilter.technology)
                          ? modalFilter.technology.join(', ')
                          : modalFilter.technology}
                      </span>
                      <X
                        size={11}
                        className="cursor-pointer hover:text-white"
                        onClick={() => onClearFilterField('technology')}
                      />
                    </span>
                  )}

                  <button
                    type="button"
                    className="bg-transparent border-0 text-accent cursor-pointer text-[0.7rem] ml-auto hover:underline"
                    onClick={onClearAllFilters}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 py-1.5 bg-bg-primary/20 border-b border-border-color text-[11px] text-text-muted font-medium flex justify-between">
                <span>RESULTS ({filteredSnippets.length})</span>
              </div>
              {filteredSnippets.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-xs">
                  No matching snippets found.
                </div>
              ) : (
                filteredSnippets.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border-b border-border-color cursor-pointer transition-colors ${
                      item.id === activeSnippetId
                        ? 'bg-bg-tertiary border-l-[3px] border-l-accent'
                        : 'border-l-[3px] border-l-transparent hover:bg-bg-secondary'
                    }`}
                    onClick={() => onSelectSnippet(item.id)}
                  >
                    <div className="text-xs font-semibold mb-1 text-text-main line-clamp-1">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-text-muted flex gap-2 items-center flex-wrap">
                      <span className="badge text-[10px] px-1 py-0.2">{item.language}</span>
                      {item.category && <span>{item.category}</span>}
                      {item.complexity?.time && (
                        <span className="inline-flex items-center gap-0.5">
                          <Clock size={10} /> {item.complexity.time}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: TAGS & TECHNOLOGIES VIEW */}
        {activeTab === 'tags' && (
          <div className="flex-1 flex flex-col overflow-hidden p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase text-text-muted font-semibold tracking-wider flex items-center gap-1.5">
                <TagIcon size={13} />
                <span>Technologies & Tags</span>
              </span>
              <button
                type="button"
                className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary cursor-pointer"
                onClick={() => setIsAddingTag(true)}
                title="Add New Tag"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Inline Tag Creation */}
            {isAddingTag && (
              <div className="flex items-center gap-1 mb-2.5">
                <input
                  type="text"
                  autoFocus
                  placeholder="New tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTag();
                    if (e.key === 'Escape') {
                      setIsAddingTag(false);
                      setNewTagName('');
                    }
                  }}
                  className="search-input py-1 px-2 text-xs flex-1 bg-bg-primary rounded border border-border-color text-text-main"
                />
                <button
                  type="button"
                  className="p-1 text-accent hover:bg-bg-tertiary cursor-pointer"
                  onClick={handleCreateTag}
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  className="p-1 text-text-muted hover:bg-bg-tertiary cursor-pointer"
                  onClick={() => {
                    setIsAddingTag(false);
                    setNewTagName('');
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Tag Cloud */}
            <div className="flex-1 overflow-y-auto">
              {combinedTechAndTags.length === 0 ? (
                <div className="text-text-muted text-xs italic p-4 text-center">
                  No tags or technologies yet. Click + to add one or tag snippets in the editor.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {combinedTechAndTags.map((item) => {
                    const isSelected =
                      (selectedFacet.type === 'tag' || selectedFacet.type === 'tech') &&
                      matchesTechnologyOrTag(selectedFacet.value, item);
                    const isCustom = customTags.some((t) => matchesTechnologyOrTag(t, item));

                    return (
                      <span
                        key={item}
                        className={`badge cursor-pointer border text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1 transition-colors ${
                          isSelected
                            ? 'border-accent text-accent bg-accent/10 font-medium'
                            : 'border-border-color text-text-muted hover:border-text-muted hover:text-text-main'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            onSelectFacet({ type: 'all', value: 'All' });
                          } else {
                            onSelectFacet({ type: 'tag', value: item });
                          }
                        }}
                      >
                        <span>#{item}</span>
                        {isSelected && (
                          <X
                            size={11}
                            className="cursor-pointer hover:text-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFacet({ type: 'all', value: 'All' });
                            }}
                          />
                        )}
                        {isCustom && onDeleteTag && !isSelected && (
                          <button
                            type="button"
                            className="hover:text-red-400 bg-transparent border-0 p-0 inline-flex items-center cursor-pointer text-text-muted ml-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTag(item);
                            }}
                            title={`Delete tag "${item}"`}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: SETTINGS, SYNC & BACKUP VIEW */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-3">
            <div className="text-xs uppercase text-text-muted font-semibold tracking-wider">
              Import & Export
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                className="btn justify-center text-xs py-1.5 cursor-pointer"
                onClick={onImportMarkdown}
              >
                <Upload size={13} /> Import Markdown
              </button>
              <button
                type="button"
                className="btn justify-center text-xs py-1.5 cursor-pointer"
                onClick={onExportGitSync}
              >
                <FolderGit2 size={13} /> Export Git Sync Manifest
              </button>
            </div>

            <div className="text-xs uppercase text-text-muted font-semibold tracking-wider mt-2">
              Backups
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className="btn justify-center text-xs p-1.5 cursor-pointer"
                onClick={onRestoreBackup}
              >
                <RotateCcw size={12} /> Restore
              </button>
              <button
                type="button"
                className="btn justify-center text-xs p-1.5 cursor-pointer"
                onClick={onExportBackup}
              >
                <Download size={12} /> Backup
              </button>
            </div>
            {onExportCompressedBackup && (
              <button
                type="button"
                className="btn justify-center text-xs py-1 text-purple-300 border-purple-500/25 bg-purple-500/10 hover:border-purple-400 cursor-pointer"
                onClick={onExportCompressedBackup}
              >
                <FileArchive size={12} className="text-purple-400" /> Compressed (on.gz)
              </button>
            )}

            <div className="text-xs uppercase text-text-muted font-semibold tracking-wider mt-2">
              AI Configuration
            </div>
            <button
              type="button"
              className={`btn justify-center text-xs py-1.5 cursor-pointer ${
                hasGeminiKey
                  ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10 hover:border-emerald-400'
                  : 'text-blue-400 border-blue-500/25 bg-blue-500/10 hover:border-blue-400'
              }`}
              onClick={onOpenGeminiKey}
            >
              <Sparkles size={13} className={hasGeminiKey ? 'text-emerald-400' : 'text-blue-400'} />
              <span>{hasGeminiKey ? 'Gemini Key Configured' : 'Configure Gemini API Key'}</span>
            </button>

            <div className="text-xs uppercase text-text-muted font-semibold tracking-wider mt-2">
              Application
            </div>
            <div className="p-2 rounded bg-bg-primary/40 border border-border-color flex justify-between items-center text-xs">
              <span className="font-mono text-text-muted">CodeShelf v{appVersion}</span>
              <button
                type="button"
                className={`btn text-xs py-0.5 px-2 cursor-pointer ${
                  updateInfo?.hasUpdate ? 'border-accent text-blue-400 font-semibold' : ''
                }`}
                onClick={onOpenUpdates}
              >
                <Sparkles size={11} className={updateInfo?.hasUpdate ? 'text-accent' : ''} />
                {updateInfo?.hasUpdate ? 'Update Available' : 'Check Updates'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
