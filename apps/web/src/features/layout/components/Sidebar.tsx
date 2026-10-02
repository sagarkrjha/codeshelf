import { useState, useMemo } from 'react';
import type { Snippet, AppUpdateInfo } from '@codeshelf/shared';
import { DEFAULT_TECHNOLOGIES, DEFAULT_USAGES } from '@codeshelf/shared';
import type { FacetSelection } from '../../search/index';
import {
  BookOpen,
  Plus,
  PanelLeftClose,
  ChevronRight,
  ChevronDown,
  Upload,
  FolderGit2,
  RotateCcw,
  Download,
  Sparkles,
  List,
  FileText,
  History,
  Layers,
  Code2,
  Tag,
  Compass,
  FileArchive,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onCollapse: () => void;
  isListCollapsed?: boolean;
  onOpenList?: () => void;
  toggleList?: () => void;
  snippets: Snippet[];
  selectedFacet: FacetSelection;
  onSelectFacet: (facet: FacetSelection) => void;
  allCategories: string[];
  categorySubcategories: Record<string, string[]>;
  expandedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  allTechnologies: string[];
  allUsages?: string[];
  allTags: string[];
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
  isListCollapsed,
  onOpenList,
  toggleList,
  snippets,
  selectedFacet,
  onSelectFacet,
  allCategories,
  categorySubcategories,
  expandedCategories,
  onToggleCategory,
  allTechnologies,
  allUsages,
  allTags,
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

  // Collapsible state for top-level sidebar sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    categories: false,
    technologies: false,
    usages: false,
    tags: false,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Derived counts for views
  const markdownDocsCount = useMemo(() => {
    return snippets.filter((s) => s.markdown || (s.codeBlocks && s.codeBlocks.length > 1)).length;
  }, [snippets]);

  const historyCount = useMemo(() => {
    return snippets.filter((s) => s.history && s.history.length > 0).length;
  }, [snippets]);

  // Merge default usages with any custom usage contexts in snippets
  const usageList = useMemo(() => {
    if (allUsages && allUsages.length > 0) return allUsages;
    const set = new Set<string>(DEFAULT_USAGES);
    snippets.forEach((s) => {
      s.usage?.forEach((u) => {
        if (u?.trim()) set.add(u.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allUsages, snippets]);

  return (
    <aside
      className={`w-65 min-w-65 bg-bg-secondary border-r border-border-color flex flex-col transition-all duration-200 overflow-hidden ${
        isCollapsed ? 'w-0! min-w-0! p-0! border-r-0! opacity-0 pointer-events-none' : ''
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border-color flex items-center justify-between">
        <div className="font-bold text-[1.1rem] tracking-[-0.5px] flex items-center gap-2 text-text-main">
          <BookOpen size={24} className="text-accent" />
          <span>CodeShelf</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="p-1 bg-transparent border-0 text-text-muted hover:text-text-main cursor-pointer inline-flex items-center rounded transition-colors"
            onClick={toggleList}
            title={isListCollapsed ? 'Open Snippets List (Ctrl+Shift+B)' : 'Collapse Snippets List (Ctrl+Shift+B)'}
          >
            <List size={20} />
          </button>
          <button
            className="p-1 bg-transparent border-0 text-text-muted hover:text-text-main cursor-pointer inline-flex items-center rounded transition-colors"
            onClick={onCollapse}
            title="Collapse Sidebar (Ctrl+B)"
          >
            <PanelLeftClose size={20} />
          </button>
        </div>
      </div>

      {/* Main Facet Navigation */}
      <div className="px-4 py-3 overflow-y-auto flex-1">
        {/* Views Section */}
        <div className="text-xs uppercase text-text-muted font-semibold mb-2 tracking-wider flex items-center justify-between">
          <span>Views</span>
          <button
            className="btn btn-primary p-1 rounded"
            onClick={onNewSnippet}
            title="Create New Snippet (or Notion-style Markdown doc)"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-0.5 mb-3">
          {/* All Snippets */}
          <div
            className={`px-2.5 py-1.5 rounded-md cursor-pointer text-sm flex justify-between items-center transition-colors ${
              selectedFacet.type === 'all'
                ? 'bg-bg-tertiary text-text-main font-medium'
                : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
            }`}
            onClick={() => {
              onSelectFacet({ type: 'all', value: 'All' });
              onOpenList?.();
            }}
            title={isListCollapsed ? 'Open all snippets in Snippet List' : 'Show all snippets'}
          >
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-text-muted" />
              <span>All Snippets</span>
            </div>
            <span className="text-xs opacity-70">{snippets.length}</span>
          </div>

          {/* Markdown Documents */}
          <div
            className={`px-2.5 py-1.5 rounded-md cursor-pointer text-sm flex justify-between items-center transition-colors ${
              selectedFacet.type === 'markdown'
                ? 'bg-bg-tertiary text-text-main font-medium'
                : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
            }`}
            onClick={() => {
              onSelectFacet({ type: 'markdown', value: 'Markdown Documents' });
              onOpenList?.();
            }}
            title="Filter Notion-style Markdown & Multi-code-block documents"
          >
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-text-muted" />
              <span className="truncate">Markdown Docs</span>
            </div>
            {markdownDocsCount > 0 && <span className="text-xs opacity-70">{markdownDocsCount}</span>}
          </div>

          {/* Version History */}
          <div
            className={`px-2.5 py-1.5 rounded-md cursor-pointer text-sm flex justify-between items-center transition-colors ${
              selectedFacet.type === 'history'
                ? 'bg-bg-tertiary text-text-main font-medium'
                : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
            }`}
            onClick={() => {
              onSelectFacet({ type: 'history', value: 'With Revisions' });
              onOpenList?.();
            }}
            title="Filter snippets with revision history"
          >
            <div className="flex items-center gap-2">
              <History size={15} className="text-text-muted" />
              <span className="truncate">With Revisions</span>
            </div>
            {historyCount > 0 && <span className="text-xs opacity-70">{historyCount}</span>}
          </div>
        </div>

        {/* Categories & Domains */}
        <div
          className="flex items-center justify-between mt-4 mb-1.5 cursor-pointer select-none group text-text-muted hover:text-text-main transition-colors"
          onClick={() => toggleSection('categories')}
          title={collapsedSections.categories ? 'Expand Categories' : 'Collapse Categories'}
        >
          <span className="text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5">
            {collapsedSections.categories ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <span>Categories</span>
          </span>
          <span className="text-[11px] opacity-60 group-hover:opacity-100">{allCategories.length}</span>
        </div>

        {!collapsedSections.categories && (
          <div className="flex flex-col gap-0.5">
            {allCategories.map((domain) => {
              const count = snippets.filter((s) => s.category === domain).length;
              const subcats = categorySubcategories[domain] || [];
              const hasSubcats = subcats.length > 0;
              const isExpanded = expandedCategories.has(domain);
              const isDomainActive = selectedFacet.type === 'domain' && selectedFacet.value === domain;

              return (
                <div key={domain} className="mb-0.5">
                  <div
                    className={`group px-2.5 py-1.5 rounded-md cursor-pointer text-sm flex justify-between items-center transition-colors ${
                      isDomainActive
                        ? 'bg-bg-tertiary text-text-main font-medium'
                        : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                    }`}
                    onClick={() => {
                      onSelectFacet({ type: 'domain', value: domain });
                      onOpenList?.();
                      if (hasSubcats && !isExpanded) {
                        onToggleCategory(domain);
                      }
                    }}
                    title={isListCollapsed ? `Open "${domain}" in Snippet List` : `Filter by "${domain}"`}
                  >
                    <div className="flex items-center gap-1 overflow-hidden">
                      {hasSubcats ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCategory(domain);
                          }}
                          className="cursor-pointer inline-flex items-center text-text-muted hover:text-text-main p-0.5 rounded hover:bg-bg-secondary"
                          title={isExpanded ? 'Collapse subcategories' : 'Expand subcategories'}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      ) : (
                        <span className="w-4" />
                      )}
                      <span className="truncate">{domain}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {count > 0 && <span className="text-xs opacity-60">{count}</span>}
                    </div>
                  </div>

                  {hasSubcats && isExpanded && (
                    <div className="flex flex-col mt-0.5">
                      {subcats.map((sub) => {
                        const subCount = snippets.filter(
                          (s) => s.category === domain && s.subcategory === sub
                        ).length;
                        const isSubActive =
                          selectedFacet.type === 'subcategory' &&
                          selectedFacet.value === sub &&
                          selectedFacet.parentCategory === domain;

                        return (
                          <div
                            key={sub}
                            className={`group py-1 pr-2 pl-6 rounded cursor-pointer text-xs flex justify-between items-center mb-0.5 transition-colors ${
                              isSubActive
                                ? 'bg-bg-tertiary text-text-main font-medium'
                                : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                            }`}
                            onClick={() => {
                              onSelectFacet({
                                type: 'subcategory',
                                value: sub,
                                parentCategory: domain,
                              });
                              onOpenList?.();
                            }}
                            title={isListCollapsed ? `Open "${domain} / ${sub}" in Snippet List` : `Filter by "${domain} / ${sub}"`}
                          >
                            <span className="truncate">↳ {sub}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {subCount > 0 && <span className="text-[0.7rem] opacity-60">{subCount}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Technologies & Languages */}
        <div
          className="flex items-center justify-between mt-4 mb-1.5 cursor-pointer select-none group text-text-muted hover:text-text-main transition-colors"
          onClick={() => toggleSection('technologies')}
          title={collapsedSections.technologies ? 'Expand Technologies' : 'Collapse Technologies'}
        >
          <span className="text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5">
            {collapsedSections.technologies ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <span className="flex items-center gap-1">
              <Code2 size={13} /> Technologies
            </span>
          </span>
          <span className="text-[11px] opacity-60 group-hover:opacity-100">{allTechnologies.length}</span>
        </div>

        {!collapsedSections.technologies && (
          <div className="flex flex-col gap-0.5">
            {allTechnologies.map((tech) => {
              const count = snippets.filter(
                (s) => s.technology?.includes(tech) || s.language.toLowerCase() === tech.toLowerCase()
              ).length;
              if (count === 0 && !DEFAULT_TECHNOLOGIES.includes(tech as any)) return null;

              const isTechActive = selectedFacet.type === 'tech' && selectedFacet.value === tech;
              return (
                <div
                  key={tech}
                  className={`px-2.5 py-1.5 rounded-md cursor-pointer text-sm flex justify-between items-center transition-colors ${
                    isTechActive
                      ? 'bg-bg-tertiary text-text-main font-medium'
                      : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                  }`}
                  onClick={() => {
                    onSelectFacet({ type: 'tech', value: tech });
                    onOpenList?.();
                  }}
                  title={isListCollapsed ? `Open "${tech}" in Snippet List` : `Filter by "${tech}"`}
                >
                  <span className="truncate">{tech}</span>
                  {count > 0 && <span className="text-xs opacity-60">{count}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Usage Context */}
        <div
          className="flex items-center justify-between mt-4 mb-1.5 cursor-pointer select-none group text-text-muted hover:text-text-main transition-colors"
          onClick={() => toggleSection('usages')}
          title={collapsedSections.usages ? 'Expand Usage Context' : 'Collapse Usage Context'}
        >
          <span className="text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5">
            {collapsedSections.usages ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <span className="flex items-center gap-1">
              <Compass size={13} /> Usage Context
            </span>
          </span>
          <span className="text-[11px] opacity-60 group-hover:opacity-100">{usageList.length}</span>
        </div>

        {!collapsedSections.usages && (
          <div className="flex flex-col gap-0.5">
            {usageList.map((usage) => {
              const count = snippets.filter((s) =>
                s.usage?.some((u) => u.toLowerCase() === usage.toLowerCase())
              ).length;
              const isUsageActive =
                selectedFacet.type === 'usage' &&
                selectedFacet.value.toLowerCase() === usage.toLowerCase();
              return (
                <div
                  key={usage}
                  className={`px-2.5 py-1.5 rounded-md cursor-pointer text-sm flex justify-between items-center transition-colors ${
                    isUsageActive
                      ? 'bg-bg-tertiary text-text-main font-medium'
                      : 'text-text-muted hover:bg-bg-tertiary hover:text-text-main'
                  }`}
                  onClick={() => {
                    onSelectFacet({ type: 'usage', value: usage });
                    onOpenList?.();
                  }}
                  title={isListCollapsed ? `Open "${usage}" in Snippet List` : `Filter by "${usage}"`}
                >
                  <span className="truncate">{usage}</span>
                  {count > 0 && <span className="text-xs opacity-60">{count}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <>
            <div
              className="flex items-center justify-between mt-4 mb-1.5 cursor-pointer select-none group text-text-muted hover:text-text-main transition-colors"
              onClick={() => toggleSection('tags')}
              title={collapsedSections.tags ? 'Expand Tags' : 'Collapse Tags'}
            >
              <span className="text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5">
                {collapsedSections.tags ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <span className="flex items-center gap-1">
                  <Tag size={13} /> Tags
                </span>
              </span>
              <span className="text-[11px] opacity-60 group-hover:opacity-100">{allTags.length}</span>
            </div>

            {!collapsedSections.tags && (
              <div className="flex flex-wrap gap-1 py-1">
                {allTags.map((tag) => {
                  const isSelected = selectedFacet.type === 'tag' && selectedFacet.value === tag;
                  return (
                    <span
                      key={tag}
                      className={`badge cursor-pointer border text-xs px-2 py-0.5 rounded-md transition-colors ${
                        isSelected
                          ? 'border-accent text-accent bg-accent/10 font-medium'
                          : 'border-border-color text-text-muted hover:border-text-muted hover:text-text-main'
                      }`}
                      onClick={() => {
                        onSelectFacet({ type: 'tag', value: tag });
                        onOpenList?.();
                      }}
                      title={`Filter by tag #${tag}`}
                    >
                      #{tag}
                    </span>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border-color flex flex-col gap-2 bg-bg-secondary shrink-0">
        {/* Import & Sync */}
        <button
          className="btn w-full justify-center text-xs py-1.5"
          onClick={onImportMarkdown}
          title="Import Markdown document or snippet file"
        >
          <Upload size={13} /> Import Markdown
        </button>
        <button
          className="btn w-full justify-center text-xs py-1.5"
          onClick={onExportGitSync}
          title="Export complete snippet library as Git-friendly Markdown repository structure"
        >
          <FolderGit2 size={13} /> Git Sync Manifest
        </button>

        {/* Backup & Restore */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            className="btn justify-center text-xs p-1.5"
            onClick={onRestoreBackup}
            title="Restore / Merge snippets from JSON backup file"
          >
            <RotateCcw size={12} /> Restore
          </button>
          <button
            className="btn justify-center text-xs p-1.5"
            onClick={onExportBackup}
            title="Download full JSON backup of all snippets"
          >
            <Download size={12} /> Backup
          </button>
        </div>
        {onExportCompressedBackup && (
          <button
            type="button"
            className="btn w-full justify-center text-xs py-1 text-purple-300 border-purple-500/25 bg-purple-500/10 hover:border-purple-400 cursor-pointer transition-colors"
            onClick={onExportCompressedBackup}
            title="Export compressed GZIP backup (on.gz) for minimal storage footprint"
          >
            <FileArchive size={12} className="text-purple-400" /> Backup (on.gz)
          </button>
        )}

        {/* AI Configuration */}
        <button
          type="button"
          className={`btn w-full justify-center text-xs py-1.5 transition-colors ${
            hasGeminiKey
              ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10 hover:border-emerald-400'
              : 'text-blue-400 border-blue-500/25 bg-blue-500/10 hover:border-blue-400'
          }`}
          onClick={onOpenGeminiKey}
          title="Configure Google Gemini API Key in ~/.codeshelf/config.json"
        >
          <Sparkles size={13} className={hasGeminiKey ? 'text-emerald-400' : 'text-blue-400'} />
          <span>{hasGeminiKey ? 'Gemini Key Configured' : 'Set Gemini API Key'}</span>
        </button>

        {/* Version & Updates */}
        <div className="mt-1 pt-2 border-t border-border-color flex items-center justify-between text-xs">

          <div className="text-text-muted font-mono">v{appVersion}</div>
          <button
            className={`btn text-xs py-1 px-2 ${
              updateInfo?.hasUpdate ? 'border-accent text-blue-400 font-semibold' : ''
            }`}
            onClick={onOpenUpdates}
            title="Check for application updates"
          >
            <Sparkles size={12} className={updateInfo?.hasUpdate ? 'text-accent' : ''} />
            {updateInfo?.hasUpdate ? 'Update Available!' : 'Updates'}
          </button>
        </div>
      </div>
    </aside>
  );
}
