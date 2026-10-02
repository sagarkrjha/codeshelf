import { useMemo } from 'react';
import { Marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

// Load language grammars for Prism syntax highlighting in Markdown previews
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';

interface MarkdownViewerProps {
  content: string;
}

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  typescript: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'jsx',
  py: 'python',
  python: 'python',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  rs: 'rust',
  rust: 'rust',
  go: 'go',
  golang: 'go',
  java: 'java',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  shell: 'bash',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  html: 'markup',
  xml: 'markup',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Configured Marked instance with syntax highlighting & Notion-style text highlighting
const markedInstance = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang }) {
      const cleanLang = (lang || '').trim().toLowerCase().split(/\s+/)[0] || '';
      const mappedLang = LANGUAGE_ALIASES[cleanLang] || cleanLang;
      const grammar = Prism.languages[mappedLang];

      let highlighted = '';
      try {
        if (grammar) {
          highlighted = Prism.highlight(text, grammar, mappedLang);
        } else {
          highlighted = escapeHtml(text);
        }
      } catch {
        highlighted = escapeHtml(text);
      }

      const encodedCode = encodeURIComponent(text);
      const displayLang = (mappedLang || 'code').toUpperCase();

      return `<div class="not-prose code-block-wrapper my-3.5 rounded-lg border border-border-color overflow-hidden bg-[#0d1117]">
        <div class="code-block-header px-3.5 py-1.5 bg-bg-secondary/80 border-b border-border-color flex items-center justify-between text-xs">
          <span class="font-mono text-[0.7rem] font-semibold text-text-muted tracking-wide">${displayLang}</span>
          <button type="button" class="markdown-copy-btn inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[0.75rem] text-text-muted hover:text-text-main bg-bg-primary/50 hover:bg-bg-tertiary border border-border-color/80 cursor-pointer transition-colors" data-code="${encodedCode}" title="Copy code">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span class="btn-label">Copy</span>
          </button>
        </div>
        <pre class="language-${mappedLang || 'text'} p-4 overflow-x-auto m-0 bg-transparent font-mono text-xs sm:text-sm leading-relaxed"><code class="language-${mappedLang || 'text'} font-mono text-xs sm:text-sm leading-relaxed">${highlighted}</code></pre>
      </div>`;
    },
  },
});

// Notion / Obsidian text highlight extension: ==highlighted text==
markedInstance.use({
  extensions: [
    {
      name: 'highlight',
      level: 'inline',
      start(src: string) {
        return src.match(/==/)?.index;
      },
      tokenizer(src: string) {
        const match = /^==([^=\r\n]+)==/.exec(src);
        if (match && match[0] && match[1]) {
          const contentText = match[1].trim();
          return {
            type: 'highlight',
            raw: match[0],
            text: contentText,
            tokens: (this as any).lexer?.inlineTokens ? (this as any).lexer.inlineTokens(contentText) : [],
          };
        }
        return undefined;
      },
      renderer(token: any) {
        const inner = token.tokens && (this as any).parser?.parseInline
          ? (this as any).parser.parseInline(token.tokens)
          : token.text || '';
        return `<mark class="bg-amber-400/25 text-amber-200 border-b border-amber-400/50 px-1.5 py-0.5 rounded font-medium">${inner}</mark>`;
      },
    } as any,
  ],
});

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const cleanContent = useMemo(() => {
    if (!content) return '';
    // Strip leading YAML frontmatter if present to ensure clean rendered preview
    return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  }, [content]);

  const htmlContent = useMemo(() => {
    try {
      return markedInstance.parse(cleanContent, { async: false, breaks: true }) as string;
    } catch (err) {
      console.error('Failed to parse markdown', err);
      return `<p>${escapeHtml(cleanContent)}</p>`;
    }
  }, [cleanContent]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('.markdown-copy-btn') as HTMLButtonElement | null;
    if (!target) return;
    const encoded = target.getAttribute('data-code');
    if (encoded) {
      const rawCode = decodeURIComponent(encoded);
      navigator.clipboard
        .writeText(rawCode)
        .then(() => {
          const label = target.querySelector('.btn-label');
          if (label) label.textContent = 'Copied!';
          target.classList.add('text-emerald-400');
          setTimeout(() => {
            if (label) label.textContent = 'Copy';
            target.classList.remove('text-emerald-400');
          }, 2000);
        })
        .catch((err) => console.error('Failed to copy', err));
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className="markdown-body prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
