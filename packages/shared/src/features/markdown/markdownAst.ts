import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import type { Root, Content } from 'mdast';
import type { Snippet, SnippetCodeBlock } from '../../models/models';
import {
  cleanCodeContent,
  inferDescriptiveBlockTitle,
  parseMarkdownToSnippet,
  serializeSnippetToMarkdown,
} from './markdown';

/**
 * Reusable Unified processor pipeline:
 * parses markdown string into mdast (Markdown Abstract Syntax Tree)
 * and stringifies mdast back into markdown string.
 */
const remarkProcessor = unified()
  .use(remarkParse)
  .use(remarkStringify, {
    bullet: '-',
    fences: true,
    fence: '`',
    rule: '-',
  });

/**
 * Structured JSON representation of a Markdown document with AST.
 */
export interface MarkdownJsonAstDocument {
  /** Serialized markdown string */
  markdown: string;
  /** Parsed mdast AST (JSON-serializable) */
  ast: Root;
  /** High-level extracted metadata and blocks */
  snippet?: Snippet;
}

/**
 * Parse Markdown string into JSON AST (mdast root object).
 */
export function markdownToJsonAst(markdown: string): Root {
  return remarkProcessor.parse(markdown);
}

/**
 * Serialize JSON AST (mdast root or node) back to Markdown text.
 */
export function jsonAstToMarkdown(ast: Root | Content): string {
  return remarkProcessor.stringify(ast as Root);
}

/**
 * Generate full JSON document from snippet or markdown text.
 * Parses markdown to AST JSON, extracts structured snippet fields,
 * and preserves exact AST structure ready for storage and extraction.
 */
export function generateMarkdownAstDocument(
  source: string | Snippet,
  fallbackId?: string
): MarkdownJsonAstDocument {
  const markdownText =
    typeof source === 'string'
      ? source
      : (source.markdown || serializeSnippetToMarkdown(source));

  const ast = markdownToJsonAst(markdownText);
  const snippet =
    typeof source === 'object'
      ? source
      : parseMarkdownToSnippet(markdownText, fallbackId);

  return {
    markdown: markdownText,
    ast,
    snippet,
  };
}

/**
 * Extract code blocks directly from mdast JSON AST.
 */
export function extractCodeBlocksFromAst(ast: Root): SnippetCodeBlock[] {
  const blocks: SnippetCodeBlock[] = [];

  let lastHeadingText = '';

  for (const node of ast.children) {
    if (node.type === 'heading') {
      const textNode = node.children.find((c) => c.type === 'text');
      if (textNode && 'value' in textNode) {
        lastHeadingText = (textNode.value as string).trim();
      }
    } else if (node.type === 'code') {
      const code = cleanCodeContent(node.value || '').trim();
      if (code) {
        const lang = node.lang || 'typescript';
        const name = lastHeadingText || inferDescriptiveBlockTitle(code, lang, blocks.length);
        blocks.push({
          code,
          language: lang,
          name,
        });
      }
    }
  }


  return blocks;
}

/**
 * Parse and extract Markdown document from JSON AST to renderable markdown string.
 */
export function extractAndParseAstToMarkdown(
  doc: MarkdownJsonAstDocument | Root | string
): string {
  if (typeof doc === 'string') {
    return doc;
  }
  if ('ast' in doc && doc.ast) {
    return jsonAstToMarkdown(doc.ast);
  }
  return jsonAstToMarkdown(doc as Root);
}
