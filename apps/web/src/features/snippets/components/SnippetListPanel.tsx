import type { Snippet, SnippetFilter } from '@codeshelf/shared';
import type { FacetSelection } from '../../search/index';
import {
  Search,
  PanelLeftOpen,
  ArrowUpDown,
  Sparkles,
  SlidersHorizontal,
  X,
  Clock,
  GitCommit,
} from 'lucide-react';

interface SnippetListPanelProps {
  isCollapsed: boolean;
  isSidebarCollapsed: boolean;
  onExpandSidebar: () => void;
  onCollapseList: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: 'updated_desc' | 'created_desc' | 'title_asc';
  onSortChange: (sort: 'updated_desc' | 'created_desc' | 'title_asc') => void;
  semanticSearchEnabled: boolean;
  onToggleSemantic: () => void;
  activeModalFilterCount: number;
  onOpenFilterModal: () => void;
  selectedFacet: FacetSelection;
  modalFilter: SnippetFilter;
  onClearFacet: () => void;
  onClearFilterField: (field: keyof SnippetFilter) => void;
  onClearAllFilters: () => void;
  filteredSnippets: Snippet[];
  activeSnippetId?: string;
  onSelectSnippet: (id: string) => void;
}

export function SnippetListPanel({
  isCollapsed,
  isSidebarCollapsed,
  onExpandSidebar,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  semanticSearchEnabled,
  onToggleSemantic,
  activeModalFilterCount,
  onOpenFilterModal,
  selectedFacet,
  modalFilter,
  onClearFacet,
  onClearFilterField,
  onClearAllFilters,
  filteredSnippets,
  activeSnippetId,
  onSelectSnippet,
}: SnippetListPanelProps) {
  const hasActiveFilters = activeModalFilterCount > 0 || selectedFacet.type !== 'all';

  return (
    <section
      className={`w-85 min-w-85 bg-bg-primary border-r border-border-color flex flex-col transition-all duration-200 overflow-hidden ${
        isCollapsed ? 'w-0! min-w-0! p-0! border-r-0! opacity-0 pointer-events-none' : ''
      }`}
    >
      {/* Search Header */}
      <div className="p-3 border-b border-border-color">
        <div className="flex items-center gap-1.5">
          {isSidebarCollapsed && (
            <button
              className="btn p-1.5 shrink-0"
              onClick={onExpandSidebar}
              title="Expand Navigation Sidebar (Ctrl+B)"
            >
              <PanelLeftOpen size={24} />
            </button>
          )}

          <div className="relative flex-1">
            <input
              type="text"
              className="search-input pl-8"
              placeholder={
                semanticSearchEnabled
                  ? 'Semantic search (intent/concept)...'
                  : 'Search (e.g. lang:ts tag:array)...'
              }
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <Search
              size={15}
              className="absolute left-2.5 top-2.5 text-text-muted pointer-events-none"
            />
          </div>
        </div>

        {/* Sort & Controls Bar */}
        <div className="flex items-center justify-between mt-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-text-muted">
            <div className="flex items-center gap-1">
              <ArrowUpDown size={12} />
              <select
                value={sortOption}
                onChange={(e) => onSortChange(e.target.value as any)}
                disabled={semanticSearchEnabled}
                className="bg-transparent border-0 text-text-muted text-xs outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="updated_desc" className="bg-bg-secondary text-text-main">Recently Updated</option>
                <option value="created_desc" className="bg-bg-secondary text-text-main">Recently Created</option>
                <option value="title_asc" className="bg-bg-secondary text-text-main">Title (A-Z)</option>
              </select>
            </div>

            <button
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
              className={`btn text-[0.7rem] py-0.5 px-2 ${
                activeModalFilterCount > 0
                  ? 'bg-blue-900/30 border-blue-500 text-blue-300'
                  : 'bg-transparent border-border-color text-text-muted'
              }`}
              onClick={onOpenFilterModal}
              title="Open Multi-Faceted Filters Modal"
            >
              <SlidersHorizontal size={11} /> Filters{' '}
              {activeModalFilterCount > 0 && `(${activeModalFilterCount})`}
            </button>
          </div>

          {selectedFacet.type !== 'all' && (
            <button
              className="bg-transparent border-0 text-accent cursor-pointer text-xs hover:underline"
              onClick={onClearFacet}
            >
              Clear
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border-color items-center">
            {selectedFacet.type !== 'all' && (
              <span className="badge bg-blue-900/30 text-blue-300 border border-blue-500 inline-flex items-center gap-1 px-1.5 py-0.5">
                <span>
                  {selectedFacet.type === 'domain'
                    ? 'Category'
                    : selectedFacet.type === 'markdown' || selectedFacet.type === 'history'
                    ? 'View'
                    : selectedFacet.type}:{' '}
                  {selectedFacet.value}
                </span>
                <X size={11} className="cursor-pointer hover:text-white" onClick={onClearFacet} />
              </span>
            )}

            {modalFilter.domain && (
              <span className="badge bg-purple-900/30 text-purple-300 border border-purple-500 inline-flex items-center gap-1 px-1.5 py-0.5">
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

            {modalFilter.subcategory && (
              <span className="badge bg-purple-900/30 text-purple-300 border border-purple-500 inline-flex items-center gap-1 px-1.5 py-0.5">
                <span>
                  Subcategory:{' '}
                  {Array.isArray(modalFilter.subcategory)
                    ? modalFilter.subcategory.join(', ')
                    : modalFilter.subcategory}
                </span>
                <X
                  size={11}
                  className="cursor-pointer hover:text-white"
                  onClick={() => onClearFilterField('subcategory')}
                />
              </span>
            )}

            {modalFilter.technology && (
              <span className="badge bg-emerald-900/30 text-emerald-300 border border-emerald-500 inline-flex items-center gap-1 px-1.5 py-0.5">
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

            {modalFilter.language && (
              <span className="badge bg-amber-900/30 text-amber-300 border border-amber-500 inline-flex items-center gap-1 px-1.5 py-0.5">
                <span>
                  Lang:{' '}
                  {Array.isArray(modalFilter.language)
                    ? modalFilter.language.join(', ')
                    : modalFilter.language}
                </span>
                <X
                  size={11}
                  className="cursor-pointer hover:text-white"
                  onClick={() => onClearFilterField('language')}
                />
              </span>
            )}

            {modalFilter.complexityTime && (
              <span className="badge bg-red-900/30 text-red-300 border border-red-500 inline-flex items-center gap-1 px-1.5 py-0.5">
                <span>Time: {modalFilter.complexityTime}</span>
                <X
                  size={11}
                  className="cursor-pointer hover:text-white"
                  onClick={() => onClearFilterField('complexityTime')}
                />
              </span>
            )}

            <button
              className="bg-transparent border-0 text-accent cursor-pointer text-[0.7rem] ml-auto hover:underline"
              onClick={onClearAllFilters}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Snippet Cards List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSnippets.length === 0 ? (
          <div className="p-6 text-text-muted text-sm">
            No matching snippets found.
          </div>
        ) : (
          filteredSnippets.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 border-b border-border-color cursor-pointer transition-colors ${
                item.id === activeSnippetId
                  ? 'bg-bg-tertiary border-l-[3px] border-l-accent'
                  : 'border-l-[3px] border-l-transparent hover:bg-bg-secondary'
              }`}
              onClick={() => onSelectSnippet(item.id)}
            >
              <div className="text-sm font-semibold mb-1 text-text-main line-clamp-1">{item.title}</div>
              <div className="text-xs text-text-muted flex gap-2 items-center">
                <span className="badge">{item.language}</span>
                {item.category && <span>{item.category}</span>}
                {item.complexity?.time && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} /> {item.complexity.time}
                  </span>
                )}
                {item.version && item.version > 1 && (
                  <span className="inline-flex items-center gap-0.5 text-accent">
                    <GitCommit size={11} /> v{item.version}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
