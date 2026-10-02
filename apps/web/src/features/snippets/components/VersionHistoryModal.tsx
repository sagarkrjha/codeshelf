import { useState, useMemo } from 'react';
import type { Snippet, SnippetRevision } from '@codeshelf/shared';
import {
  computeLineDiff,
  normalizeSnippetVersion,
  getSnippetVersionCount,
  getRevisionMarkdown,
  serializeSnippetToMarkdown,
  formatShortHash,
  computeSnippetHash,
} from '@codeshelf/shared';
import { GitCommit, Clock, RotateCcw, X, Eye, Search, Filter, Check } from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  snippet?: Snippet | null;
  onClose: () => void;
  onRevert: (version: number) => void;
}

export function VersionHistoryModal({
  isOpen,
  snippet,
  onClose,
  onRevert,
}: VersionHistoryModalProps) {
  const [selectedRevision, setSelectedRevision] = useState<SnippetRevision | null>(null);
  const [revisionSearch, setRevisionSearch] = useState('');
  const [diffScope, setDiffScope] = useState<'markdown' | 'code' | 'notes'>('markdown');
  const [diffFilterMode, setDiffFilterMode] = useState<'all' | 'changes' | 'added' | 'removed'>('all');
  const [diffSearchQuery, setDiffSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopyHash = (e: React.MouseEvent, hash: string) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {}
  };

  // Normalize snippet versions so version count and history are always strictly synchronized
  const normalizedSnippet = useMemo(() => {
    return snippet ? normalizeSnippetVersion(snippet) : null;
  }, [snippet]);

  // Default to the most recent previous revision
  const revisions = useMemo(() => {
    return normalizedSnippet?.history || [];
  }, [normalizedSnippet]);

  const totalVersionCount = useMemo(() => {
    return normalizedSnippet ? getSnippetVersionCount(normalizedSnippet) : 1;
  }, [normalizedSnippet]);

  // Filter revisions by version or change summary
  const filteredRevisions = useMemo(() => {
    if (!revisionSearch.trim()) return revisions;
    const q = revisionSearch.toLowerCase();
    return revisions.filter(
      (r: SnippetRevision) =>
        `v${r.version}`.includes(q) ||
        (r.changeSummary && r.changeSummary.toLowerCase().includes(q)) ||
        new Date(r.timestamp).toLocaleDateString().includes(q)
    );
  }, [revisions, revisionSearch]);

  const activeRev = selectedRevision || filteredRevisions[0] || revisions[0] || null;

  // Compute diff between active revision (old) and current snippet (new) across entire markdown or selected scope
  const rawDiffLines = useMemo(() => {
    if (!normalizedSnippet || !activeRev) return [];
    let oldText = '';
    let newText = '';

    if (diffScope === 'code') {
      oldText = activeRev.code;
      newText = normalizedSnippet.code;
    } else if (diffScope === 'notes') {
      oldText = activeRev.description || '';
      newText = normalizedSnippet.description || '';
    } else {
      // Entire Markdown document
      oldText = getRevisionMarkdown(activeRev, normalizedSnippet);
      newText = serializeSnippetToMarkdown(normalizedSnippet);
    }

    return computeLineDiff(oldText, newText);
  }, [normalizedSnippet, activeRev, diffScope]);

  // Metrics
  const diffMetrics = useMemo(() => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;
    for (const line of rawDiffLines) {
      if (line.type === 'added') added++;
      else if (line.type === 'removed') removed++;
      else unchanged++;
    }
    return { added, removed, unchanged, total: rawDiffLines.length };
  }, [rawDiffLines]);

  // Filter diff lines according to mode and search query
  const filteredDiffLines = useMemo(() => {
    return rawDiffLines.filter((line) => {
      // 1. Mode filter
      if (diffFilterMode === 'changes' && line.type === 'unchanged') return false;
      if (diffFilterMode === 'added' && line.type !== 'added') return false;
      if (diffFilterMode === 'removed' && line.type !== 'removed') return false;

      // 2. Query filter
      if (diffSearchQuery.trim()) {
        const q = diffSearchQuery.toLowerCase();
        if (!line.text.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [rawDiffLines, diffFilterMode, diffSearchQuery]);

  if (!isOpen || !normalizedSnippet) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] backdrop-blur-[3px]">
      <div className="bg-bg-secondary border border-border-color rounded-[10px] w-[900px] max-w-[95vw] h-[82vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-color flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GitCommit size={18} className="text-accent" />
            <h2 className="text-[1.1rem] font-semibold text-text-main">
              Version History — {normalizedSnippet.title}
            </h2>
            <span className="badge">Current: v{normalizedSnippet.version}</span>
            <span className="badge bg-bg-tertiary text-text-muted border border-border-color">
              {totalVersionCount} {totalVersionCount === 1 ? 'version' : 'versions'} total
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-text-muted hover:text-text-main cursor-pointer p-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: Left revisions list, Right diff viewer */}
        <div className="flex flex-1 overflow-hidden">
          {/* Revisions sidebar */}
          <div className="w-[280px] shrink-0 border-r border-border-color flex flex-col bg-bg-primary">
            <div className="p-3 border-b border-border-color">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter revisions..."
                  className="search-input text-xs pl-7 py-1.5 pr-2"
                  value={revisionSearch}
                  onChange={(e) => setRevisionSearch(e.target.value)}
                />
                <Search
                  size={13}
                  className="text-text-muted absolute left-2 top-2.5 pointer-events-none"
                />
              </div>
            </div>

            <div className="px-3.5 py-2 text-[0.72rem] uppercase font-semibold text-text-muted">
              Prior Revisions ({filteredRevisions.length}{revisions.length !== filteredRevisions.length ? ` / ${revisions.length}` : ''})
            </div>

            <div className="flex-1 overflow-y-auto">
              {revisions.length === 0 ? (
                <div className="p-5 text-text-muted text-sm leading-relaxed">
                  No prior revisions yet. You are viewing the initial version (v1). Revisions are created automatically when snippet or Markdown changes are saved.
                </div>
              ) : filteredRevisions.length === 0 ? (
                <div className="p-5 text-text-muted text-sm">
                  No revisions match "{revisionSearch}".
                </div>
              ) : (
                filteredRevisions.map((rev: SnippetRevision) => {
                  const isSelected = activeRev?.version === rev.version;
                  return (
                    <div
                      key={rev.version}
                      onClick={() => setSelectedRevision(rev)}
                      className={`px-3.5 py-3 border-b border-border-color cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-bg-tertiary border-l-[3px] border-l-accent'
                          : 'border-l-[3px] border-l-transparent hover:bg-bg-secondary'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold text-sm ${isSelected ? 'text-accent' : 'text-text-main'}`}>
                            v{rev.version}
                          </span>
                          {(() => {
                            const revHash = rev.hash || computeSnippetHash(rev);
                            return (
                              <button
                                type="button"
                                onClick={(e) => handleCopyHash(e, revHash)}
                                className="font-mono text-[10px] text-text-muted hover:text-text-main bg-black/40 px-1.5 py-0.5 rounded border border-border-color/60 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title={`Copy SHA-256 hash: ${revHash}`}
                              >
                                {copiedHash === revHash ? (
                                  <Check size={10} className="text-emerald-400" />
                                ) : (
                                  <GitCommit size={10} className="text-purple-400" />
                                )}
                                <span>{formatShortHash(revHash, 7)}</span>
                              </button>
                            );
                          })()}
                        </div>
                        <span className="text-[0.7rem] text-text-muted inline-flex items-center gap-1">
                          <Clock size={10} /> {new Date(rev.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      {rev.changeSummary && (
                        <div className="text-xs text-text-muted mt-1.5 line-clamp-2 font-mono text-[11px] text-accent/80 font-medium">
                          {rev.changeSummary}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Diff Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeRev ? (
              <>
                {/* Diff Header Bar */}
                <div className="px-4 py-2.5 border-b border-border-color flex justify-between items-center bg-bg-secondary flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-sm text-text-muted flex items-center gap-2 flex-wrap">
                      <span>
                        Comparing: <strong className="text-text-main">v{activeRev.version}</strong> (Old) vs <strong className="text-text-main">v{normalizedSnippet.version}</strong> (Current)
                      </span>
                      <span className="badge text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium inline-flex items-center gap-1">
                        Eugene Myers Diff
                      </span>
                      {(() => {
                        const activeHash = activeRev.hash || computeSnippetHash(activeRev);
                        return (
                          <button
                            type="button"
                            onClick={(e) => handleCopyHash(e, activeHash)}
                            className="font-mono text-[10px] text-text-muted hover:text-text-main bg-black/40 px-1.5 py-0.5 rounded border border-border-color inline-flex items-center gap-1 cursor-pointer"
                            title={`Copy active revision SHA-256 hash (${activeHash})`}
                          >
                            <GitCommit size={10} className="text-purple-400" />
                            <span>SHA-256: {formatShortHash(activeHash, 8)}</span>
                          </button>
                        );
                      })()}
                    </div>

                    {/* Diff Scope Tabs */}
                    <div className="flex items-center bg-bg-primary p-0.5 rounded border border-border-color">
                      <button
                        type="button"
                        onClick={() => setDiffScope('markdown')}
                        className={`text-xs px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                          diffScope === 'markdown'
                            ? 'bg-accent text-white shadow-xs'
                            : 'text-text-muted hover:text-text-main'
                        }`}
                        title="Diff entire Markdown document (YAML frontmatter, description, code, and complexity)"
                      >
                        Full Markdown
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiffScope('code')}
                        className={`text-xs px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                          diffScope === 'code'
                            ? 'bg-accent text-white shadow-xs'
                            : 'text-text-muted hover:text-text-main'
                        }`}
                        title="Diff snippet code only"
                      >
                        Code Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiffScope('notes')}
                        className={`text-xs px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                          diffScope === 'notes'
                            ? 'bg-accent text-white shadow-xs'
                            : 'text-text-muted hover:text-text-main'
                        }`}
                        title="Diff description and notes only"
                      >
                        Notes Only
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 font-semibold">
                      +{diffMetrics.added}
                    </span>
                    <span className="text-xs text-red-400 font-semibold">
                      -{diffMetrics.removed}
                    </span>
                    <button
                      className="btn btn-primary text-xs py-1 px-2.5"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Rollback entire snippet (Markdown, code, and notes) to v${activeRev.version}?`
                          )
                        ) {
                          onRevert(activeRev.version);
                          onClose();
                        }
                      }}
                      title={`Revert entire snippet state to v${activeRev.version}`}
                    >
                      <RotateCcw size={13} /> Revert to v{activeRev.version}
                    </button>
                  </div>
                </div>

                {/* Diff Filters Bar */}
                <div className="px-3.5 py-1.5 border-b border-border-color bg-bg-primary flex items-center justify-between gap-2.5">
                  {/* Mode buttons */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-muted inline-flex items-center gap-1 mr-1">
                      <Filter size={11} /> Filter:
                    </span>
                    {(
                      [
                        { id: 'all', label: `All (${diffMetrics.total})` },
                        { id: 'changes', label: `Changes (${diffMetrics.added + diffMetrics.removed})` },
                        { id: 'added', label: `Added (+${diffMetrics.added})` },
                        { id: 'removed', label: `Removed (-${diffMetrics.removed})` },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setDiffFilterMode(m.id)}
                        className={`text-xs px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                          diffFilterMode === m.id
                            ? 'border-accent bg-blue-500/20 text-blue-300'
                            : 'border-transparent text-text-muted hover:text-text-main'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Diff line search */}
                  <div className="w-44 relative">
                    <input
                      type="text"
                      placeholder="Search diff lines..."
                      className="search-input text-xs py-1 pl-6 pr-2"
                      value={diffSearchQuery}
                      onChange={(e) => setDiffSearchQuery(e.target.value)}
                    />
                    <Search
                      size={11}
                      className="text-text-muted absolute left-2 top-2 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Diff Lines View */}
                <div className="flex-1 overflow-y-auto bg-code-bg font-mono text-sm leading-relaxed py-2">
                  {filteredDiffLines.length === 0 ? (
                    <div className="p-6 text-text-muted text-center text-sm">
                      No diff lines match current filter.
                    </div>
                  ) : (
                    filteredDiffLines.map((line, idx) => {
                      let bg = 'transparent';
                      let color = 'text-gray-200';
                      let prefix = ' ';

                      if (line.type === 'added') {
                        bg = 'bg-emerald-950/40';
                        color = 'text-emerald-400';
                        prefix = '+';
                      } else if (line.type === 'removed') {
                        bg = 'bg-red-950/40';
                        color = 'text-red-400';
                        prefix = '-';
                      }

                      return (
                        <div
                          key={idx}
                          className={`${bg} ${color} flex px-3 py-0.5 whitespace-pre-wrap break-all`}
                        >
                          <span className="w-5 select-none opacity-60">{prefix}</span>
                          <span>{line.text}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : revisions.length === 0 ? (
              <div className="p-8 text-text-muted flex flex-col items-center justify-center h-full gap-2 text-center">
                <Eye size={28} className="opacity-50 text-accent mb-1" />
                <div className="font-semibold text-text-main text-sm">Initial Markdown Version (v1)</div>
                <div className="text-xs text-text-muted max-w-sm leading-relaxed">
                  This snippet is currently on its initial version. When you modify and save snippet or Markdown changes, prior snapshots will appear on the left so you can compare line diffs and rollback.
                </div>
              </div>
            ) : (
              <div className="p-8 text-text-muted flex items-center gap-2">
                <Eye size={18} /> Select a previous version on the left to inspect differences.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
