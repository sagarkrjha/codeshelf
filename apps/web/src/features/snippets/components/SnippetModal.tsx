import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Snippet, CreateSnippetInput } from '@codeshelf/shared';
import {
  validateCreateSnippetInput,
  autofillSnippetDetails,
  extractAllCategories,
  extractCategorySubcategories,
  serializeSnippetToMarkdown,
  parseMarkdownToSnippet,
  aiAutofillFromCode,
  aiGenerateCommitMessage,
  normalizeTags,
  normalizeTechnologies,
  canonicalizeLanguage,
  inferDescriptiveBlockTitle,
} from '@codeshelf/shared';
import { MarkdownViewer } from './MarkdownViewer';
import { getLocalConfig, getOrFetchGeminiApiKey } from '../../storage/storage';
import { GeminiApiKeyModal } from '../../ai';
import {
  Wand2,
  Sparkles,
  Check,

  X,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table,
  Columns,
  Eye,
  Edit3,
  FileText,
  Minus,
  Clock,
  HardDrive,
} from 'lucide-react';

interface SnippetModalProps {
  isOpen: boolean;
  snippet?: Snippet | null;
  snippets?: Snippet[];
  initialCategory?: string;
  onClose: () => void;
  onSave: (input: CreateSnippetInput & { changeSummary?: string }) => void;
}

function getInitialMarkdownTemplate(category = 'General', language = 'typescript'): string {
  return `---
category: "${category}"
tags: ["example"]
---

# New Snippet

Brief description, intuition, or usage notes...

## Implementation

\`\`\`${language}
function solution() {
  // Implementation code here
}
\`\`\`

## Complexity
- **Time**: O(1)
- **Space**: O(1)
`;
}

function updateMarkdownMetadata(
  content: string,
  updates: {
    category?: string;
    subcategory?: string;
    tags?: string[];
    usage?: string[];
    technology?: string[];
    complexity?: { time?: string; space?: string };
  }
): string {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!frontmatterMatch) {
    const lines = ['---'];
    if (updates.category) lines.push(`category: ${JSON.stringify(updates.category)}`);
    if (updates.subcategory) lines.push(`subcategory: ${JSON.stringify(updates.subcategory)}`);
    if (updates.tags && updates.tags.length > 0) {
      lines.push(`tags: [${updates.tags.map((t) => JSON.stringify(t)).join(', ')}]`);
    }
    if (updates.usage && updates.usage.length > 0) {
      lines.push(`usage: [${updates.usage.map((u) => JSON.stringify(u)).join(', ')}]`);
    }
    if (updates.technology && updates.technology.length > 0) {
      lines.push(`technology: [${updates.technology.map((t) => JSON.stringify(t)).join(', ')}]`);
    }
    if (updates.complexity?.time) lines.push(`complexity_time: ${JSON.stringify(updates.complexity.time)}`);
    if (updates.complexity?.space) lines.push(`complexity_space: ${JSON.stringify(updates.complexity.space)}`);
    lines.push('---', '');
    return `${lines.join('\n')}\n${content}`;
  }

  const rawFm = frontmatterMatch[1]!;
  const body = content.slice(frontmatterMatch[0].length);
  const fmLines = rawFm.split(/\r?\n/);
  const updatedLines: string[] = [];
  const handled = new Set<string>();

  for (const line of fmLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      updatedLines.push(line);
      continue;
    }
    const key = line.slice(0, colonIdx).trim();
    if (key === 'category' && updates.category !== undefined) {
      handled.add('category');
      updatedLines.push(`category: ${JSON.stringify(updates.category)}`);
    } else if (key === 'subcategory' && updates.subcategory !== undefined) {
      handled.add('subcategory');
      if (updates.subcategory.trim()) {
        updatedLines.push(`subcategory: ${JSON.stringify(updates.subcategory.trim())}`);
      }
    } else if (key === 'tags' && updates.tags !== undefined) {
      handled.add('tags');
      updatedLines.push(`tags: [${updates.tags.map((t) => JSON.stringify(t)).join(', ')}]`);
    } else if (key === 'usage' && updates.usage !== undefined) {
      handled.add('usage');
      if (updates.usage.length > 0) {
        updatedLines.push(`usage: [${updates.usage.map((u) => JSON.stringify(u)).join(', ')}]`);
      }
    } else if (key === 'technology' && updates.technology !== undefined) {
      handled.add('technology');
      if (updates.technology.length > 0) {
        updatedLines.push(`technology: [${updates.technology.map((t) => JSON.stringify(t)).join(', ')}]`);
      }
    } else if (key === 'complexity_time' && updates.complexity?.time !== undefined) {
      handled.add('complexity_time');
      updatedLines.push(`complexity_time: ${JSON.stringify(updates.complexity.time)}`);
    } else if (key === 'complexity_space' && updates.complexity?.space !== undefined) {
      handled.add('complexity_space');
      updatedLines.push(`complexity_space: ${JSON.stringify(updates.complexity.space)}`);
    } else {
      updatedLines.push(line);
    }
  }

  if (updates.category !== undefined && !handled.has('category')) {
    updatedLines.push(`category: ${JSON.stringify(updates.category)}`);
  }
  if (updates.subcategory !== undefined && !handled.has('subcategory') && updates.subcategory && updates.subcategory.trim()) {
    updatedLines.push(`subcategory: ${JSON.stringify(updates.subcategory.trim())}`);
  }
  if (updates.tags !== undefined && !handled.has('tags') && updates.tags.length > 0) {
    updatedLines.push(`tags: [${updates.tags.map((t) => JSON.stringify(t)).join(', ')}]`);
  }
  if (updates.usage !== undefined && !handled.has('usage') && updates.usage.length > 0) {
    updatedLines.push(`usage: [${updates.usage.map((u) => JSON.stringify(u)).join(', ')}]`);
  }
  if (updates.technology !== undefined && !handled.has('technology') && updates.technology.length > 0) {
    updatedLines.push(`technology: [${updates.technology.map((t) => JSON.stringify(t)).join(', ')}]`);
  }
  if (updates.complexity?.time && !handled.has('complexity_time')) {
    updatedLines.push(`complexity_time: ${JSON.stringify(updates.complexity.time)}`);
  }
  if (updates.complexity?.space && !handled.has('complexity_space')) {
    updatedLines.push(`complexity_space: ${JSON.stringify(updates.complexity.space)}`);
  }

  return `---\n${updatedLines.join('\n')}\n---\n${body}`;
}

export function SnippetModal({
  isOpen,
  snippet,
  snippets = [],
  initialCategory,
  onClose,
  onSave,
}: SnippetModalProps) {
  // Markdown view layout: 'edit' | 'split' | 'preview'
  const [markdownView, setMarkdownView] = useState<'edit' | 'split' | 'preview'>('split');

  // Full Markdown document content
  const [markdown, setMarkdown] = useState<string>('');

  const defaultFolder = initialCategory || 'General';

  // Quick frontmatter sync states
  const [category, setCategory] = useState<string>(defaultFolder);
  const [subcategory, setSubcategory] = useState('');
  const [tags, setTags] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiCommitLoading, setIsAiCommitLoading] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevIsOpenRef = useRef(false);
  const prevSnippetIdRef = useRef<string | null>(null);

  const allCategories = useMemo(() => extractAllCategories(snippets), [snippets]);
  const categorySubcategories = useMemo(() => extractCategorySubcategories(snippets), [snippets]);

  // Synchronize ONLY when modal opens or active snippet target ID changes.
  // This prevents user typing or background re-renders from blowing away editor state and resetting caret position.
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isSnippetSwitched = (snippet?.id ?? null) !== prevSnippetIdRef.current;

    if (isOpening || isSnippetSwitched) {
      if (snippet) {
        const fullMd = snippet.markdown || serializeSnippetToMarkdown(snippet);
        setMarkdown(fullMd);
        setCategory(snippet.category || defaultFolder);
        setSubcategory(snippet.subcategory || '');
        setTags(snippet.tags.join(', '));
      } else {
        const defaultMd = getInitialMarkdownTemplate(defaultFolder);
        setMarkdown(defaultMd);
        setCategory(defaultFolder);
        setSubcategory('');
        setTags('');
      }
      setErrorMsg('');
      setNoticeMsg('');
      setChangeSummary('');
      setMarkdownView('split');
    }

    prevIsOpenRef.current = isOpen;
    prevSnippetIdRef.current = snippet?.id ?? null;
  }, [snippet?.id, isOpen, defaultFolder]);

  // Parsed metadata from current markdown content
  const parsedFromMarkdown = useMemo(() => {
    try {
      return parseMarkdownToSnippet(markdown);
    } catch {
      return null;
    }
  }, [markdown]);

  // Body content for preview (strips frontmatter for clean Notion-like document view)
  const previewBody = useMemo(() => {
    return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  }, [markdown]);

  // Helper for inserting markdown text around current selection
  const insertFormatting = (before: string, after = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = markdown;
    const selected = text.substring(start, end) || defaultText;
    const replacement = `${before}${selected}${after}`;

    const next = text.substring(0, start) + replacement + text.substring(end);
    setMarkdown(next);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  // Helper for prefixing line (headers, lists, quotes)
  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = markdown;

    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', end);
    const line = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);

    const updatedLine = line.startsWith(prefix) ? line.slice(prefix.length) : `${prefix}${line}`;
    const next = text.substring(0, lineStart) + updatedLine + (lineEnd === -1 ? '' : text.substring(lineEnd));
    setMarkdown(next);

    setTimeout(() => {
      textarea.focus();
      const newPos = lineStart + updatedLine.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Smart keyboard shortcuts in Markdown editor
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Ctrl/Cmd + B for Bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertFormatting('**', '**', 'bold text');
      return;
    }

    // Ctrl/Cmd + I for Italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertFormatting('*', '*', 'italic text');
      return;
    }

    // Tab key for 2-space indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        // Shift+Tab: outdent
        const text = markdown;
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        if (text.startsWith('  ', lineStart)) {
          const next = text.substring(0, lineStart) + text.substring(lineStart + 2);
          setMarkdown(next);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(Math.max(start - 2, lineStart), Math.max(end - 2, lineStart));
          }, 0);
        }
      } else {
        // Tab: indent 2 spaces
        const next = markdown.substring(0, start) + '  ' + markdown.substring(end);
        setMarkdown(next);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
      return;
    }

    // Enter key auto-continues lists
    if (e.key === 'Enter') {
      const start = textarea.selectionStart;
      const text = markdown;
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const line = text.substring(lineStart, start);

      const bulletMatch = line.match(/^(\s*)([-*+] )/);
      const numMatch = line.match(/^(\s*)(\d+)\. /);
      const taskMatch = line.match(/^(\s*)(- \[[ xX]\] )/);

      if (taskMatch) {
        if (line.trim() === '- [ ]' || line.trim() === '- [x]') {
          e.preventDefault();
          const next = text.substring(0, lineStart) + text.substring(start);
          setMarkdown(next);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }
        e.preventDefault();
        const prefix = taskMatch[1] + '- [ ] ';
        const next = text.substring(0, start) + '\n' + prefix + text.substring(start);
        setMarkdown(next);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 1 + prefix.length, start + 1 + prefix.length);
        }, 0);
        return;
      }

      if (numMatch && numMatch[1] !== undefined && numMatch[2] !== undefined) {
        const num = parseInt(numMatch[2], 10);
        if (line.trim() === `${num}.`) {
          e.preventDefault();
          const next = text.substring(0, lineStart) + text.substring(start);
          setMarkdown(next);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }
        e.preventDefault();
        const prefix = `${numMatch[1]}${num + 1}. `;
        const next = text.substring(0, start) + '\n' + prefix + text.substring(start);
        setMarkdown(next);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 1 + prefix.length, start + 1 + prefix.length);
        }, 0);
        return;
      }

      if (bulletMatch && bulletMatch[1] !== undefined && bulletMatch[2] !== undefined) {
        if (line.trim() === bulletMatch[2].trim()) {
          e.preventDefault();
          const next = text.substring(0, lineStart) + text.substring(start);
          setMarkdown(next);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }
        e.preventDefault();
        const prefix = bulletMatch[1] + bulletMatch[2];
        const next = text.substring(0, start) + '\n' + prefix + text.substring(start);
        setMarkdown(next);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 1 + prefix.length, start + 1 + prefix.length);
        }, 0);
      }
    }
  };

  // Insert template helpers
  const handleInsertTemplate = (type: 'react' | 'backend' | 'algorithm') => {
    let tpl = '';
    if (type === 'react') {
      tpl = `---
category: "React"
subcategory: "Hooks"
tags: ["react", "hook", "ui"]
---

# useExampleHook

Custom React hook documentation and usage instructions.

## Implementation

\`\`\`typescript
import { useState, useEffect } from 'react';

export function useExampleHook<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  return [state, setState] as const;
}
\`\`\`

## Usage
- Reusable across UI components
`;
    } else if (type === 'backend') {
      tpl = `---
category: "Backend"
subcategory: "API"
tags: ["node", "express", "api"]
---

# API Route Handler

Handles HTTP requests with validation and structured JSON response.

## Implementation

\`\`\`typescript
import { Request, Response } from 'express';

export async function handleRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    return res.status(200).json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
}
\`\`\`
`;
    } else {
      tpl = `# Snippet Title

Write your description, documentation, or intuition here...

\`\`\`typescript
// Code here
\`\`\`
`;
    }

    if (markdown.trim() && markdown.trim() !== getInitialMarkdownTemplate().trim()) {
      if (!window.confirm(`Replace current document with the ${type} template?`)) {
        return;
      }
    }

    setMarkdown(tpl);
    setNoticeMsg(`Inserted ${type} template! ✨`);
    setTimeout(() => setNoticeMsg(''), 2500);
  };

  // Fast local heuristic auto-fill (offline)
  const handleAutofillMarkdown = () => {
    const parsed = parseMarkdownToSnippet(markdown);
    if (!parsed.code.trim()) {
      setErrorMsg('Please include a code block (```language ... ```) in your markdown document.');
      return;
    }
    setErrorMsg('');

    const filled = autofillSnippetDetails(parsed.code, {
      title: parsed.title !== 'Snippet' ? parsed.title : undefined,
      language: parsed.language || 'typescript',
      category: parsed.category,
      subcategory: parsed.subcategory,
    });

    const currentTitle = parsed.title !== 'Snippet' ? parsed.title : filled.title || 'Snippet';
    const currentCategory = parsed.category || filled.category || 'Algorithms';
    const currentSubcategory = parsed.subcategory || filled.subcategory || '';
    const currentTags = parsed.tags.length > 0 ? parsed.tags : filled.tags;
    const currentTech = parsed.technology || filled.technology;
    const currentUsage = parsed.usage || filled.usage;
    const currentComplexity = parsed.complexity || filled.complexity;

    const updated: Snippet = {
      id: snippet?.id || 'temp',
      title: currentTitle,
      language: filled.language || parsed.language || 'typescript',
      code: parsed.code,
      codeBlocks: parsed.codeBlocks,
      description: parsed.description || filled.description,
      category: currentCategory,
      subcategory: currentSubcategory || undefined,
      tags: currentTags,
      technology: currentTech,
      usage: currentUsage,
      complexity: currentComplexity,
      version: snippet?.version || 1,
      createdAt: snippet?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMarkdown(serializeSnippetToMarkdown({ ...updated, markdown: undefined }));
    setNoticeMsg('Analyzed and auto-filled Markdown details with local heuristics! ✨');
    setTimeout(() => setNoticeMsg(''), 3000);
  };

  // Gemini AI Autofill from Code
  const handleAiAutofillMarkdown = async () => {
    let config = getLocalConfig();
    let apiKey = config.geminiApiKey?.trim();
    if (!apiKey) {
      apiKey = (await getOrFetchGeminiApiKey())?.trim();
      config = getLocalConfig();
    }
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const parsed = parseMarkdownToSnippet(markdown);
    if (!parsed.code.trim()) {
      setErrorMsg('Please include a code block (```language ... ```) in your markdown document for AI analysis.');
      return;
    }
    setErrorMsg('');
    setIsAiLoading(true);

    // If multiple code blocks exist in the markdown, send the full markdown so the AI receives all code blocks
    const codeForAi = (parsed.codeBlocks && parsed.codeBlocks.length > 1) ? markdown : parsed.code;

    try {
      const aiResult = await aiAutofillFromCode({
        code: codeForAi,
        language: parsed.language || 'typescript',
        apiKey,
        model: config.geminiModel,
        previousMetadata: snippet ? {
          title: snippet.title,
          category: snippet.category,
          subcategory: snippet.subcategory,
          tags: snippet.tags,
          technology: snippet.technology,
          usage: snippet.usage,
          complexity: snippet.complexity,
        } : undefined,
      });

      // Build comprehensive developer article description
      const explanationParts: string[] = [];
      const primarySummary = aiResult.description || parsed.description || '';
      if (primarySummary) {
        explanationParts.push(primarySummary);
      }

      if (aiResult.explanation) {
        if (Array.isArray(aiResult.explanation.headings) && aiResult.explanation.content) {
          for (const heading of aiResult.explanation.headings) {
            const body = aiResult.explanation.content[heading];
            if (body) {
              const titleCase = heading
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase())
                .trim();
              explanationParts.push(`### ${titleCase}\n${body}`);
            }
          }
        } else {
          const { what, why, when, how } = aiResult.explanation as any;
          if (what) explanationParts.push(`### What\n${what}`);
          if (why) explanationParts.push(`### Why\n${why}`);
          if (when) explanationParts.push(`### When to Use\n${when}`);
          if (how) explanationParts.push(`### How It Works\n${how}`);
        }
      }

      // Add full-sentence Usage Description section
      const usageSentence = aiResult.usageDescription?.trim();
      if (usageSentence) {
        explanationParts.push(`### Usage Description\n${usageSentence}`);
      }

      const comprehensiveDescription = explanationParts.join('\n\n');

      const updated: Snippet = {
        id: snippet?.id || 'temp',
        title: aiResult.title || parsed.title,
        language: parsed.language || 'typescript',
        code: parsed.code,
        codeBlocks: parsed.codeBlocks,
        description: comprehensiveDescription,
        category: aiResult.category || parsed.category || 'Algorithms',
        subcategory: aiResult.subcategory || parsed.subcategory,
        tags: aiResult.tags.length > 0 ? aiResult.tags : parsed.tags,
        technology: aiResult.technology.length > 0 ? aiResult.technology : parsed.technology,
        usage: aiResult.usage.length > 0 ? aiResult.usage : parsed.usage,
        complexity: aiResult.complexity || parsed.complexity,
        version: snippet?.version || 1,
        createdAt: snippet?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Construct article markdown:
      // When multiple code blocks exist, weave the article flow cleanly
      if (parsed.codeBlocks && parsed.codeBlocks.length > 1 && aiResult.explanation?.content) {
        const fm = [
          '---',
          `title: ${JSON.stringify(updated.title)}`,
          `language: ${updated.language}`,
          `category: ${JSON.stringify(updated.category)}`,
          updated.subcategory ? `subcategory: ${JSON.stringify(updated.subcategory)}` : '',
          updated.tags.length > 0 ? `tags: [${updated.tags.map((t) => JSON.stringify(t)).join(', ')}]` : '',
          updated.technology && updated.technology.length > 0 ? `technology: [${updated.technology.map((t) => JSON.stringify(t)).join(', ')}]` : '',
          updated.usage && updated.usage.length > 0 ? `usage: [${updated.usage.map((u) => JSON.stringify(u)).join(', ')}]` : '',
          updated.complexity?.time ? `time: ${JSON.stringify(updated.complexity.time)}` : '',
          updated.complexity?.space ? `space: ${JSON.stringify(updated.complexity.space)}` : '',
          '---',
        ].filter(Boolean).join('\n');

        const articleLines: string[] = [fm, '', `# ${updated.title}`, ''];
        if (primarySummary) {
          articleLines.push(primarySummary, '');
        }

        const headings = aiResult.explanation.headings || [];
        const contentMap = aiResult.explanation.content;
        // Section 1 (problem / motivation) before blocks
        if (headings[0] && contentMap[headings[0]]) {
          const title = headings[0].replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
          articleLines.push(`### ${title}`, contentMap[headings[0]]!, '');
        }

        // Weave blocks with intermediate explanations
        for (let i = 0; i < parsed.codeBlocks.length; i++) {
          const block = parsed.codeBlocks[i]!;
          const blockTitle = block.name || inferDescriptiveBlockTitle(block.code, block.language, i);
          articleLines.push(`### ${blockTitle}`, '');
          articleLines.push(`\`\`\`${block.language || updated.language}`);
          articleLines.push(block.code.trim());
          articleLines.push('```', '');

          // Insert Section 2 (mechanism/data flow) between first and second block
          if (i === 0 && headings[1] && contentMap[headings[1]]) {
            const title = headings[1].replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
            articleLines.push(`### ${title}`, contentMap[headings[1]]!, '');
          }
        }

        // Section 3 (inputs/contract/edge cases)
        if (headings[2] && contentMap[headings[2]]) {
          const title = headings[2].replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
          articleLines.push(`### ${title}`, contentMap[headings[2]]!, '');
        }

        // Section 4 (tradeoffs/limits)
        if (headings[3] && contentMap[headings[3]]) {
          const title = headings[3].replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
          articleLines.push(`### ${title}`, contentMap[headings[3]]!, '');
        }

        // Usage Description as complete sentences
        if (usageSentence) {
          articleLines.push('## Usage Description', usageSentence, '');
        } else if (updated.usage && updated.usage.length > 0) {
          articleLines.push('## Usage');
          for (const u of updated.usage) {
            articleLines.push(`- ${u}`);
          }
          articleLines.push('');
        }

        // Complexity
        if (updated.complexity?.time || updated.complexity?.space) {
          articleLines.push('## Complexity');
          if (updated.complexity.time) articleLines.push(`- **Time**: ${updated.complexity.time}`);
          if (updated.complexity.space) articleLines.push(`- **Space**: ${updated.complexity.space}`);
          articleLines.push('');
        }

        setMarkdown(articleLines.join('\n'));
      } else {
        setMarkdown(serializeSnippetToMarkdown({ ...updated, markdown: undefined }));
      }
      setNoticeMsg('✨ Snippet successfully enriched with AI analysis!');
      setTimeout(() => setNoticeMsg(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gemini AI autofill failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Gemini AI Commit Note Generator
  const handleAiGenerateCommit = async () => {
    let config = getLocalConfig();
    let apiKey = config.geminiApiKey?.trim();
    if (!apiKey) {
      apiKey = (await getOrFetchGeminiApiKey())?.trim();
      config = getLocalConfig();
    }
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const parsed = parseMarkdownToSnippet(markdown);
    if (!parsed.code.trim()) {
      setErrorMsg('Cannot generate commit note without code in the snippet.');
      return;
    }

    setIsAiCommitLoading(true);
    try {
      const note = await aiGenerateCommitMessage({
        currentCode: parsed.code,
        previousCode: snippet?.code,
        language: parsed.language,
        title: parsed.title,
        apiKey,
        model: config.geminiModel,
      });
      setChangeSummary(note);
      setNoticeMsg('Generated commit note with Gemini AI! ✨');
      setTimeout(() => setNoticeMsg(''), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate commit note with Gemini AI.');
    } finally {
      setIsAiCommitLoading(false);
    }
  };

  // Submit and save snippet
  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();
    setErrorMsg('');

    const parsed = parseMarkdownToSnippet(markdown);

    if (!parsed.title || parsed.title.trim() === '') {
      setErrorMsg('Please include a title in your Markdown document (e.g. # Quick Sort Algorithm).');
      return;
    }

    if (!parsed.code || parsed.code.trim() === '') {
      setErrorMsg('Please include at least one code block in your Markdown (e.g. ```typescript ... ```).');
      return;
    }

    const formTags = tags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const resolvedTags = normalizeTags(
      parsed.tags && parsed.tags.length > 0
        ? parsed.tags
        : (formTags.length > 0 ? formTags : (snippet?.tags || []))
    );

    const normalizedLang = canonicalizeLanguage(parsed.language || 'typescript');
    const rawTech = parsed.technology || snippet?.technology || [normalizedLang];
    const normalizedTech = normalizeTechnologies(rawTech);

    const input: CreateSnippetInput = {
      title: parsed.title.trim(),
      language: normalizedLang,
      code: parsed.code,
      description: parsed.description || undefined,
      category: parsed.category || category || defaultFolder,
      subcategory: parsed.subcategory || subcategory || undefined,
      tags: resolvedTags,
      technology: normalizedTech,
      usage: parsed.usage || snippet?.usage,
      complexity: parsed.complexity,
      markdown: markdown,
      codeBlocks: parsed.codeBlocks,
    };

    const validation = validateCreateSnippetInput(input);
    if (!validation.valid) {
      setErrorMsg(validation.errors.join(' | '));
      return;
    }

    onSave({
      ...input,
      changeSummary: changeSummary.trim() || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-[3px] p-2 sm:p-4">
        <div className="bg-bg-secondary border border-border-color rounded-xl w-[96vw] max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-border-color flex justify-between items-center bg-bg-secondary shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-text-main flex items-center gap-2">
                <FileText size={18} className="text-accent" />
                <span>{snippet ? 'Edit Snippet' : 'New Snippet'}</span>
              </h2>
              <span className="text-[11px] text-text-muted bg-bg-primary px-2 py-0.5 rounded border border-border-color font-mono">
                Markdown Editor
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Auto-fill Button */}
              <button
                type="button"
                className="btn text-xs py-1 px-2.5 text-text-muted hover:text-text-main border-border-color inline-flex items-center gap-1.5"
                onClick={handleAutofillMarkdown}
                title="Auto-fill snippet details from local offline heuristics"
              >
                <Wand2 size={13} />
                <span>Auto-fill</span>
              </button>

              {/* Gemini AI Autofill */}
              <button
                type="button"
                className="btn text-xs py-1 px-2.5 text-blue-400 hover:text-blue-300 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                onClick={handleAiAutofillMarkdown}
                disabled={isAiLoading}
                title="Auto-fill rich title, description, tags, and complexity using Gemini AI"
              >
                <Sparkles size={13} className={isAiLoading ? 'animate-spin text-blue-400' : 'text-blue-400'} />
                <span>{isAiLoading ? 'AI Thinking...' : 'AI Autofill'}</span>
              </button>

              <button
                onClick={onClose}

                className="bg-transparent border-0 text-text-muted hover:text-text-main cursor-pointer p-1 rounded transition-colors ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Notice & Error Alerts */}
          {noticeMsg && (
            <div className="bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 px-4 py-2 text-xs flex items-center gap-2 shrink-0">
              <Check size={14} className="text-emerald-400 shrink-0" />
              <span>{noticeMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-500/20 border-b border-red-500/40 text-red-300 px-4 py-2 text-xs flex items-center gap-2 shrink-0">
              <X size={14} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Main Markdown Editor Area */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Notion-Style Formatting Toolbar */}
              <div className="px-3.5 py-1.5 border-b border-border-color bg-bg-secondary flex items-center justify-between gap-2 flex-wrap shrink-0">
                {/* Formatting Tools */}
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Headings */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertLinePrefix('# ')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Heading 1 (# )"
                  >
                    <Heading1 size={15} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertLinePrefix('## ')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Heading 2 (## )"
                  >
                    <Heading2 size={15} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertLinePrefix('### ')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Heading 3 (### )"
                  >
                    <Heading3 size={15} />
                  </button>

                  <span className="w-px h-4 bg-border-color mx-1" />

                  {/* Inline styles */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('**', '**', 'bold text')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Bold (Ctrl+B)"
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('*', '*', 'italic text')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Italic (Ctrl+I)"
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Strikethrough (~~text~~)"
                  >
                    <Strikethrough size={15} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('==', '==', 'highlighted text')}
                    className="p-1 rounded text-amber-400/80 hover:text-amber-300 hover:bg-bg-tertiary"
                    title="Highlight text (==text==)"
                  >
                    <Highlighter size={15} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('`', '`', 'code')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary font-mono text-xs px-1.5"
                    title="Inline code (`code`)"
                  >
                    &lt;/&gt;
                  </button>

                  <span className="w-px h-4 bg-border-color mx-1" />

                  {/* Code block */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('```typescript\n', '\n```', '// code here')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Code Block (```lang)"
                  >
                    <Code size={15} />
                  </button>

                  {/* Lists */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertLinePrefix('- ')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Bullet List (- )"
                  >
                    <List size={15} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertLinePrefix('1. ')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Numbered List (1. )"
                  >
                    <ListOrdered size={15} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertLinePrefix('- [ ] ')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Task Checklist (- [ ])"
                  >
                    <CheckSquare size={15} />
                  </button>

                  <span className="w-px h-4 bg-border-color mx-1" />

                  {/* Quote, Table, Divider */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertLinePrefix('> ')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Blockquote (> )"
                  >
                    <Quote size={15} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      insertFormatting(
                        '\n| Column 1 | Column 2 |\n| :--- | :--- |\n| Value 1 | Value 2 |\n',
                        ''
                      )
                    }
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Markdown Table"
                  >
                    <Table size={15} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFormatting('\n---\n')}
                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-tertiary"
                    title="Divider (---)"
                  >
                    <Minus size={15} />
                  </button>

                  <span className="w-px h-4 bg-border-color mx-1" />

                  {/* Insert Templates */}
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <span>Templates:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('algorithm')}
                      className="px-1.5 py-0.5 rounded bg-bg-tertiary hover:text-text-main text-[0.7rem]"
                    >
                      Algorithm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('react')}
                      className="px-1.5 py-0.5 rounded bg-bg-tertiary hover:text-text-main text-[0.7rem]"
                    >
                      React
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('backend')}
                      className="px-1.5 py-0.5 rounded bg-bg-tertiary hover:text-text-main text-[0.7rem]"
                    >
                      API
                    </button>
                  </div>
                </div>

                {/* View Mode Controls: Edit | Split | Preview */}
                <div className="flex items-center bg-bg-primary p-0.5 rounded border border-border-color shrink-0">
                  <button
                    type="button"
                    onClick={() => setMarkdownView('edit')}
                    className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                      markdownView === 'edit'
                        ? 'bg-accent text-white shadow-xs'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                    title="Full editor view"
                  >
                    <Edit3 size={12} className="inline mr-1" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkdownView('split')}
                    className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                      markdownView === 'split'
                        ? 'bg-accent text-white shadow-xs'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                    title="Side-by-side editor and live preview"
                  >
                    <Columns size={12} className="inline mr-1" /> Split
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkdownView('preview')}
                    className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                      markdownView === 'preview'
                        ? 'bg-accent text-white shadow-xs'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                    title="Full preview view"
                  >
                    <Eye size={12} className="inline mr-1" /> Preview
                  </button>
                </div>
              </div>

              {/* Metadata Quick Bar: Category, Subcategory, Tags */}
              <div className="px-3.5 py-1.5 border-b border-border-color bg-bg-secondary/70 flex items-center gap-3 text-xs shrink-0 flex-wrap">
                {/* Category */}
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted font-medium">Category:</span>
                  <select
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setCategory(newCat);
                      setMarkdown((prev) => updateMarkdownMetadata(prev, { category: newCat }));
                    }}
                    className="search-input py-0.5 px-2 text-xs bg-bg-primary rounded border border-border-color text-text-main"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted font-medium">Subcategory:</span>
                  <input
                    type="text"
                    list="md-subcategories-datalist"
                    placeholder="e.g. Search, Hooks"
                    value={subcategory}
                    onChange={(e) => {
                      const newSub = e.target.value;
                      setSubcategory(newSub);
                      setMarkdown((prev) => updateMarkdownMetadata(prev, { subcategory: newSub }));
                    }}
                    className="search-input py-0.5 px-2 text-xs w-32 bg-bg-primary rounded border border-border-color text-text-main"
                  />
                  <datalist id="md-subcategories-datalist">
                    {(categorySubcategories[category] || []).map((sub) => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  <span className="text-text-muted font-medium">Tags:</span>
                  <input
                    type="text"
                    placeholder="comma-separated tags (e.g. dsa, tree)"
                    value={tags}
                    onChange={(e) => {
                      const newTags = e.target.value;
                      setTags(newTags);
                      const tagList = newTags
                        .split(',')
                        .map((t) => t.trim().replace(/^#/, ''))
                        .filter(Boolean);
                      setMarkdown((prev) => updateMarkdownMetadata(prev, { tags: tagList }));
                    }}
                    className="search-input py-0.5 px-2 text-xs flex-1 bg-bg-primary rounded border border-border-color text-text-main"
                  />
                </div>
              </div>

              {/* Editor / Preview Panes */}
              <div className="flex-1 flex overflow-hidden">
                {/* Editor textarea */}
                {(markdownView === 'edit' || markdownView === 'split') && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-code-bg">
                    <textarea
                      ref={textareaRef}
                      value={markdown}
                      onChange={(e) => setMarkdown(e.target.value)}
                      onKeyDown={handleEditorKeyDown}
                      placeholder="# Snippet Title&#10;&#10;Write markdown documentation, notes, and code blocks here...&#10;&#10;```typescript&#10;function solution() {}&#10;```"
                      className="flex-1 w-full p-4 font-mono text-xs sm:text-sm leading-relaxed text-gray-200 bg-transparent resize-none outline-none overflow-y-auto selection:bg-accent/30 caret-blue-400"
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* Live Rendered Markdown Preview (Notion Document Style) */}
                {(markdownView === 'preview' || markdownView === 'split') && (
                  <div
                    className={`flex-1 overflow-y-auto p-6 bg-bg-primary ${
                      markdownView === 'split' ? 'border-l border-border-color' : ''
                    }`}
                  >
                    {/* Notion-style Document Header */}
                    {parsedFromMarkdown && (
                      <div className="mb-4 pb-4 border-b border-border-color flex flex-wrap gap-2 items-center text-xs">
                        <span className="badge bg-blue-900/40 text-blue-300 border border-blue-500/50">
                          {parsedFromMarkdown.language.toUpperCase()}
                        </span>
                        {parsedFromMarkdown.category && (
                          <span className="badge bg-purple-900/40 text-purple-300 border border-purple-500/50">
                            {parsedFromMarkdown.category}
                            {parsedFromMarkdown.subcategory ? ` / ${parsedFromMarkdown.subcategory}` : ''}
                          </span>
                        )}
                        {parsedFromMarkdown.complexity?.time && (
                          <span className="badge bg-amber-900/40 text-amber-300 border border-amber-500/50 inline-flex items-center gap-1">
                            <Clock size={11} /> Time: {parsedFromMarkdown.complexity.time}
                          </span>
                        )}
                        {parsedFromMarkdown.complexity?.space && (
                          <span className="badge bg-amber-900/40 text-amber-300 border border-amber-500/50 inline-flex items-center gap-1">
                            <HardDrive size={11} /> Space: {parsedFromMarkdown.complexity.space}
                          </span>
                        )}
                        {parsedFromMarkdown.tags.map((t) => (
                          <span
                            key={t}
                            className="badge bg-bg-tertiary text-text-muted border border-border-color"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <MarkdownViewer content={previewBody} />
                  </div>
                )}
              </div>
            </div>

            {/* Footer Controls */}
            <div className="px-5 py-3 border-t border-border-color bg-bg-secondary flex justify-between items-center shrink-0">
              <div className="text-xs text-text-muted flex items-center gap-3">
                {snippet && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-text-muted">Revision Note:</span>
                    <input
                      type="text"
                      placeholder="e.g. feat: optimize search logic"
                      className="search-input py-0.5 px-2 text-xs w-56 font-mono text-[11px]"
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn text-xs py-0.5 px-2 text-blue-400 hover:text-blue-300 border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/20 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      onClick={handleAiGenerateCommit}
                      disabled={isAiCommitLoading}
                      title="Generate commit note using Gemini AI"
                    >
                      <Sparkles size={11} className={isAiCommitLoading ? 'animate-spin text-blue-400' : 'text-blue-400'} />
                      <span>{isAiCommitLoading ? 'Generating...' : 'AI Commit'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button type="button" className="btn text-xs py-1.5 px-3" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs py-1.5 px-4 font-semibold">
                  {snippet ? 'Update Snippet' : 'Save Snippet'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <GeminiApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />
    </>
  );
}

