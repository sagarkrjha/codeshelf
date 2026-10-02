import { useState, useEffect, useMemo } from 'react';
import type { Snippet } from '@codeshelf/shared';
import { extractAllCodeBlocks } from '@codeshelf/shared';
import { CodeViewer } from './CodeViewer';
import { MarkdownViewer } from './MarkdownViewer';
import { downloadSnippetAsMarkdown } from '../../export-import/index';
import {
  PanelLeftOpen,
  GitCommit,
  Clock,
  HardDrive,
  Edit2,
  Trash2,
  Tag,
  Share2Icon,
  Copy,
  FileCode,
  Check,
  Eye,
  Code,
} from 'lucide-react';

interface SnippetDetailPanelProps {
  activeSnippet: Snippet | null;
  isSidebarCollapsed: boolean;
  isListCollapsed: boolean;
  onExpandSidebar: () => void;
  onToggleList: () => void;
  onOpenHistory: () => void;
  onAutofill?: () => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (id: string, title: string) => void;
  onCopyCode: (code: string) => void;
  onCopyCodeAsMarkdown: (snippet: Snippet) => void;
  copied: boolean;
  copiedMarkdown: boolean;
  relatedSnippets: Array<{ snippet: Snippet; score: number }>;
  onSelectSnippet: (id: string) => void;
  onSelectTagFacet: (tag: string) => void;
}

export function SnippetDetailPanel({
  onCopyCode,
  copied,
  activeSnippet,
  isSidebarCollapsed,
  isListCollapsed,
  onExpandSidebar,
  onOpenHistory,
  onEdit,
  onDelete,
  relatedSnippets,
  onSelectSnippet,
  onSelectTagFacet,
  onCopyCodeAsMarkdown,
  copiedMarkdown,
}: SnippetDetailPanelProps) {
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  useEffect(() => {
    setSelectedBlockIndex(0);
  }, [activeSnippet?.id]);

  const allCodeBlocks = useMemo(() => {
    return activeSnippet ? extractAllCodeBlocks(activeSnippet) : [];
  }, [activeSnippet]);

  const currentBlock = useMemo(() => {
    if (!activeSnippet) return null;
    if (allCodeBlocks.length > 0 && selectedBlockIndex < allCodeBlocks.length) {
      return allCodeBlocks[selectedBlockIndex]!;
    }
    return (
      allCodeBlocks[0] || {
        code: activeSnippet.code,
        language: activeSnippet.language,
        name: 'Implementation',
      }
    );
  }, [activeSnippet, allCodeBlocks, selectedBlockIndex]);

  // Clean Markdown preview content (stripping YAML frontmatter and formatting Notion-style document)
  const previewContent = useMemo(() => {
    if (!activeSnippet) return '';
    if (activeSnippet.markdown) {
      let md = activeSnippet.markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
      if (!/^#\s+/m.test(md)) {
        md = `# ${activeSnippet.title}\n\n${md}`;
      }
      return md;
    }

    // Synthesize clean markdown preview for snippets without raw markdown
    const parts: string[] = [];
    parts.push(`# ${activeSnippet.title}`);

    if (activeSnippet.description && activeSnippet.description.trim()) {
      parts.push(activeSnippet.description.trim());
    }

    if (allCodeBlocks.length > 1) {
      for (let i = 0; i < allCodeBlocks.length; i++) {
        const block = allCodeBlocks[i]!;
        parts.push(`### ${block.name || `Code Block ${i + 1}`}\n\n\`\`\`${block.language}\n${block.code.trim()}\n\`\`\``);
      }
    } else {
      const primary = allCodeBlocks[0];
      const codeToRender = (primary?.code || activeSnippet.code || '').trim();
      const langToRender = primary?.language || activeSnippet.language || 'typescript';
      if (codeToRender) {
        parts.push(`## Implementation\n\n\`\`\`${langToRender}\n${codeToRender}\n\`\`\``);
      }
    }

    if (activeSnippet.complexity?.time || activeSnippet.complexity?.space) {
      const compLines = ['### Complexity'];
      if (activeSnippet.complexity.time) compLines.push(`- **Time**: ${activeSnippet.complexity.time}`);
      if (activeSnippet.complexity.space) compLines.push(`- **Space**: ${activeSnippet.complexity.space}`);
      parts.push(compLines.join('\n'));
    }

    return parts.join('\n\n');
  }, [activeSnippet, allCodeBlocks]);

  if (!activeSnippet) {
    return (
      <main className="flex-1 bg-bg-secondary flex flex-col overflow-hidden">
        <div className="p-8 text-text-muted text-sm">
          Select a snippet to view details.
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-bg-secondary flex flex-col overflow-hidden">
      {/* Detail Header */}
      <header className="px-6 py-4 border-b border-border-color flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            {isSidebarCollapsed && isListCollapsed && (
              <button
                className="btn p-1.5"
                onClick={onExpandSidebar}
                title="Show Navigation Sidebar (Ctrl+B)"
              >
                <PanelLeftOpen size={22} />
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-main">{activeSnippet.title}</h1>
              {activeSnippet.version && (
                <button
                  className="badge inline-flex items-center gap-1 bg-bg-tertiary text-accent cursor-pointer border border-border-color hover:border-accent"
                  onClick={onOpenHistory}
                  title="View Revision History & Diffs"
                >
                  <GitCommit size={12} /> v{activeSnippet.version}
                  {activeSnippet.history && activeSnippet.history.length > 0 && (
                    <span className="opacity-70 text-[0.65rem]">
                      ({activeSnippet.history.length})
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle: Code vs Preview */}
          <div className="flex items-center bg-bg-primary p-0.5 rounded-md border border-border-color mr-1">
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'code'
                  ? 'bg-bg-tertiary text-accent font-semibold shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
              onClick={() => setViewMode('code')}
              title="Code & Implementation View"
            >
              <Code size={13} />
              <span>Code</span>
              {allCodeBlocks.length > 1 && (
                <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.2 rounded-full font-mono">
                  {allCodeBlocks.length}
                </span>
              )}
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'preview'
                  ? 'bg-bg-tertiary text-accent font-semibold shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
              onClick={() => setViewMode('preview')}
              title="Markdown Document Preview"
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
          </div>

          <button
            className="btn"
            onClick={() => downloadSnippetAsMarkdown(activeSnippet)}
            title="Export snippet as portable Markdown"
          >
            <Share2Icon size={15} />
          </button>

          <button
            className="btn"
            onClick={() => onEdit(activeSnippet)}
            title="Edit Snippet"
          >
            <Edit2 size={15} />
          </button>

          <button
            className="btn text-red-400 hover:bg-red-500/10 border-red-500/30"
            onClick={() => onDelete(activeSnippet.id, activeSnippet.title)}
            title="Delete Snippet"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      {/* Metadata Bar - visible in both Code and Preview views */}
      <div className="text-sm text-text-muted flex gap-3 items-center mt-2 mb-3 px-6 flex-wrap">
        <span className="badge">
          {(currentBlock?.language || activeSnippet.language).toUpperCase()}
        </span>

        {activeSnippet.category && (
          <span>
            Domain: <strong>{activeSnippet.category}</strong>
            {activeSnippet.subcategory && ` / ${activeSnippet.subcategory}`}
          </span>
        )}

        {activeSnippet.complexity?.time && (
          <span className="inline-flex items-center gap-1">
            <Clock size={13} />
            Time: {activeSnippet.complexity.time}
          </span>
        )}

        {activeSnippet.complexity?.space && (
          <span className="inline-flex items-center gap-1">
            <HardDrive size={13} />
            Space: {activeSnippet.complexity.space}
          </span>
        )}

        {activeSnippet.tags?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag size={14} className="text-text-muted" />

            {activeSnippet.tags.map((tag) => (
              <span
                key={tag}
                className="badge cursor-pointer hover:border-accent border border-transparent"
                onClick={() => onSelectTagFacet(tag)}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'preview' ? (
        <div className="flex-1 p-6 pt-0 overflow-y-auto">
          <div className="bg-bg-primary border border-border-color p-6 rounded-lg text-text-main shadow-xs">
            <MarkdownViewer content={previewContent} />
          </div>

          {/* Related Snippets Recommendation */}
          {relatedSnippets.length > 0 && (
            <div className="mt-7">
              <div className="text-sm uppercase text-text-muted font-semibold mb-2 tracking-wider">Related Knowledge</div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5 mt-2.5">
                {relatedSnippets.map((rel) => (
                  <div
                    key={rel.snippet.id}
                    onClick={() => onSelectSnippet(rel.snippet.id)}
                    className="bg-bg-primary border border-border-color rounded-lg p-3 cursor-pointer hover:border-accent transition-colors"
                  >
                    <div className="font-semibold text-sm mb-1 truncate">
                      {rel.snippet.title}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="badge">{rel.snippet.language.toUpperCase()}</span>
                      <span className="text-sm text-text-muted">
                        {Math.round(rel.score * 100)}% match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 p-6 pt-0 overflow-y-auto">
          {/* Code viewer header */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm uppercase text-text-muted font-semibold tracking-wider flex items-center gap-2">
              <span>Code</span>
              {allCodeBlocks.length > 1 && (
                <span className="badge bg-bg-tertiary text-accent text-xs font-normal">
                  {allCodeBlocks.length} blocks
                </span>
              )}
            </div>
          </div>

          {/* Code block selector tabs when snippet has multiple blocks */}
          {allCodeBlocks.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 border-b border-border-color">
              {allCodeBlocks.map((block, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedBlockIndex(idx)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    selectedBlockIndex === idx
                      ? 'bg-accent/15 text-accent border border-accent/40 font-semibold'
                      : 'text-text-muted hover:text-text-main hover:bg-bg-tertiary border border-transparent'
                  }`}
                >
                  <Code size={13} />
                  <span>{block.name || `Block ${idx + 1}`}</span>
                  <span className="text-[10px] opacity-60 uppercase font-mono">({block.language})</span>
                </button>
              ))}
            </div>
          )}

          <div className="relative overflow-hidden">
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
              <button
                className="btn p-1.5 text-text-muted hover:text-text-main"
                onClick={() => onCopyCode(currentBlock?.code || activeSnippet.code)}
                title={`Copy ${currentBlock?.name || 'code'} to clipboard`}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>

              <button
                className="btn p-1.5 text-text-muted hover:text-text-main"
                onClick={() =>
                  onCopyCodeAsMarkdown({
                    ...activeSnippet,
                    code: currentBlock?.code || activeSnippet.code,
                    language: currentBlock?.language || activeSnippet.language,
                  })
                }
                title={`Copy ${currentBlock?.name || 'code'} as Markdown to clipboard`}
              >
                {copiedMarkdown ? (
                  <Check size={15} className="text-emerald-400" />
                ) : (
                  <FileCode size={15} />
                )}
              </button>
            </div>

            <CodeViewer
              code={currentBlock?.code || activeSnippet.code}
              language={currentBlock?.language || activeSnippet.language}
            />
          </div>

          {/* Related Snippets Recommendation */}
          {relatedSnippets.length > 0 && (
            <div className="mt-7">
              <div className="text-sm uppercase text-text-muted font-semibold mb-2 tracking-wider">Related Knowledge</div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5 mt-2.5">
                {relatedSnippets.map((rel) => (
                  <div
                    key={rel.snippet.id}
                    onClick={() => onSelectSnippet(rel.snippet.id)}
                    className="bg-bg-primary border border-border-color rounded-lg p-3 cursor-pointer hover:border-accent transition-colors"
                  >
                    <div className="font-semibold text-sm mb-1 truncate">
                      {rel.snippet.title}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="badge">{rel.snippet.language.toUpperCase()}</span>
                      <span className="text-sm text-text-muted">
                        {Math.round(rel.score * 100)}% match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
