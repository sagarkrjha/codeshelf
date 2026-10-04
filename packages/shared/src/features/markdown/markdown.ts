import type { Snippet, SnippetCodeBlock } from '../../models/models';
import {
  canonicalizeLanguage,
  normalizeTags,
  normalizeTechnologies,
} from '../taxonomy/canonical';

export interface ExtractedCodeBlock {
  language: string;
  code: string;
  name?: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Cleans a code snippet string by removing surrounding accidental fences
 * and stripping any leading markdown headings (like '## Implementation').
 */
export function cleanCodeContent(rawCode: string): string {
  if (!rawCode) return '';
  let cleaned = rawCode.trim();

  // Strip leading markdown headings like ## Implementation, ## Implementation 1, ## Solution, ### Code
  while (/^#{1,4}\s+.*?\b(?:Implementation|Solution|Code|Approach|Algorithm)\b[^\r\n]*(?:\r?\n|$)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^#{1,4}\s+.*?\b(?:Implementation|Solution|Code|Approach|Algorithm)\b[^\r\n]*(?:\r?\n|$)/i, '').trim();
  }

  // Strip leading and trailing code fence delimiters if raw code was wrapped in ``` or ~~~
  cleaned = cleaned.replace(/^(`{3,}|~{3,})[^\r\n]*\r?\n/, '').replace(/\r?\n(`{3,}|~{3,})\s*$/, '').trim();

  // Strip leading markdown headings again in case they were inside outer code fences
  while (/^#{1,4}\s+.*?\b(?:Implementation|Solution|Code|Approach|Algorithm)\b[^\r\n]*(?:\r?\n|$)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^#{1,4}\s+.*?\b(?:Implementation|Solution|Code|Approach|Algorithm)\b[^\r\n]*(?:\r?\n|$)/i, '').trim();
  }

  // If the entire content was simply a heading like '## Implementation' or '## Implementation 1', return empty string
  if (!cleaned || /^#{1,4}\s+.*?\b(?:Implementation|Solution|Code|Approach|Algorithm)\b[^\r\n]*$/i.test(cleaned)) {
    return '';
  }

  return cleaned;
}

/**
 * Robust line-by-line parser for fenced code blocks in Markdown (CommonMark compliant).
 * Correctly extracts adjacent blocks, tildes (~~~), backticks (```), complex language
 * identifiers (c++, c#, etc.), and infers descriptive names from preceding headings/labels.
 */
export function parseFencedCodeBlocks(
  text: string,
  defaultLanguage = 'typescript'
): ExtractedCodeBlock[] {
  const blocks: ExtractedCodeBlock[] = [];
  if (!text) return blocks;

  // Split into lines while keeping track of character start indices
  const lines: string[] = [];
  const lineStarts: number[] = [];

  const lineRegex = /([^\r\n]*)(?:\r?\n|$)/g;
  let lineMatch: RegExpExecArray | null;
  while ((lineMatch = lineRegex.exec(text)) !== null) {
    if (lineMatch.index === text.length && lineMatch[0] === '') {
      break;
    }
    lineStarts.push(lineMatch.index);
    lines.push(lineMatch[1]!);
    if (lineRegex.lastIndex === lineMatch.index) {
      lineRegex.lastIndex++;
    }
  }

  let inBlock = false;
  let fenceChar = '';
  let fenceLength = 0;
  let blockLang = '';
  let blockStartIndex = 0;
  let blockStartLineIdx = 0;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (!inBlock) {
      // Check for opening fence: 0-3 spaces, 3+ backticks or tildes, info string
      const openMatch = line.match(/^[ \t]{0,3}(`{3,}|~{3,})(.*)$/);
      if (openMatch) {
        const fenceStr = openMatch[1]!;
        const rawInfo = (openMatch[2] || '').trim();
        fenceChar = fenceStr[0]!;
        fenceLength = fenceStr.length;

        // If fence is backticks, info string cannot contain backticks
        if (fenceChar === '`' && rawInfo.includes('`')) {
          continue;
        }

        // Extract language from info string (first word, stripping punctuation except +, #, _, -, .)
        const langWord = rawInfo.split(/\s+/)[0] || '';
        const cleanLang = langWord
          .replace(/^[^a-zA-Z0-9+#_.-]+|[^a-zA-Z0-9+#_.-]+$/g, '')
          .toLowerCase();

        blockLang = cleanLang || defaultLanguage;
        blockStartIndex = lineStarts[i]!;
        blockStartLineIdx = i;
        codeLines = [];
        inBlock = true;
      }
    } else {
      // Check for closing fence: 0-3 spaces, >= fenceLength of fenceChar, optional whitespace, nothing else
      const closeRegex = new RegExp(`^[ \\t]{0,3}\\${fenceChar}{${fenceLength},}[ \\t]*$`);
      if (closeRegex.test(line)) {
        // Block closed
        const blockEndIndex = lineStarts[i]! + line.length;
        const rawCode = codeLines.join('\n');
        const cleaned = cleanCodeContent(rawCode);

        // Infer name from preceding lines before the opening fence
        let inferredName = '';
        for (let j = blockStartLineIdx - 1; j >= 0 && j >= blockStartLineIdx - 5; j--) {
          const prevLine = lines[j]!.trim();
          if (!prevLine) continue;
          const hMatch = prevLine.match(/^#{1,4}\s+(.+)$/);
          if (hMatch && hMatch[1]) {
            inferredName = hMatch[1].trim();
            break;
          }
          if (!inferredName && prevLine.endsWith(':')) {
            inferredName = prevLine.slice(0, -1).trim();
            break;
          }
        }

        if (cleaned && !/^#{1,4}\s+(?:Implementation|Solution|Code|Approach|Algorithm)\s*$/i.test(cleaned)) {
          blocks.push({
            code: cleaned,
            language: blockLang,
            name: inferredName || `Block ${blocks.length + 1} (${blockLang})`,
            startIndex: blockStartIndex,
            endIndex: blockEndIndex,
          });
        }

        inBlock = false;
      } else {
        codeLines.push(line);
      }
    }
  }

  // Handle unclosed fence at EOF
  if (inBlock) {
    const rawCode = codeLines.join('\n');
    const cleaned = cleanCodeContent(rawCode);
    if (cleaned && !/^#{1,4}\s+(?:Implementation|Solution|Code|Approach|Algorithm)\s*$/i.test(cleaned)) {
      let inferredName = '';
      for (let j = blockStartLineIdx - 1; j >= 0 && j >= blockStartLineIdx - 5; j--) {
        const prevLine = lines[j]!.trim();
        if (!prevLine) continue;
        const hMatch = prevLine.match(/^#{1,4}\s+(.+)$/);
        if (hMatch && hMatch[1]) {
          inferredName = hMatch[1].trim();
          break;
        }
        if (!inferredName && prevLine.endsWith(':')) {
          inferredName = prevLine.slice(0, -1).trim();
          break;
        }
      }
      blocks.push({
        code: cleaned,
        language: blockLang,
        name: inferredName || `Block ${blocks.length + 1} (${blockLang})`,
        startIndex: blockStartIndex,
        endIndex: text.length,
      });
    }
  }

  return blocks;
}


export function serializeSnippetToMarkdown(snippet: Snippet): string {
  // If the snippet was created/edited in full Markdown Document mode, preserve its complete markdown verbatim
  if (snippet.markdown && snippet.markdown.trim().length > 0) {
    return snippet.markdown;
  }

  const frontmatterLines: string[] = ['---'];
  frontmatterLines.push(`title: ${JSON.stringify(snippet.title)}`);
  frontmatterLines.push(`language: ${snippet.language}`);

  if (snippet.category) {
    frontmatterLines.push(`category: ${JSON.stringify(snippet.category)}`);
  }
  if (snippet.folder && snippet.folder !== snippet.category) {
    frontmatterLines.push(`folder: ${JSON.stringify(snippet.folder)}`);
  }
  if (snippet.subcategory) {
    frontmatterLines.push(`subcategory: ${JSON.stringify(snippet.subcategory)}`);
  }
  if (snippet.tags && snippet.tags.length > 0) {
    frontmatterLines.push(`tags: [${snippet.tags.map((t) => JSON.stringify(t)).join(', ')}]`);
  }
  if (snippet.technology && snippet.technology.length > 0) {
    frontmatterLines.push(
      `technology: [${snippet.technology.map((t) => JSON.stringify(t)).join(', ')}]`
    );
  }
  if (snippet.usage && snippet.usage.length > 0) {
    frontmatterLines.push(`usage: [${snippet.usage.map((u) => JSON.stringify(u)).join(', ')}]`);
  }
  if (snippet.complexity?.time) {
    frontmatterLines.push(`time: ${JSON.stringify(snippet.complexity.time)}`);
  }
  if (snippet.complexity?.space) {
    frontmatterLines.push(`space: ${JSON.stringify(snippet.complexity.space)}`);
  }
  if (snippet.version) {
    frontmatterLines.push(`version: ${snippet.version}`);
  }
  frontmatterLines.push(`createdAt: ${snippet.createdAt}`);
  frontmatterLines.push(`updatedAt: ${snippet.updatedAt}`);
  frontmatterLines.push('---');

  const lines = [frontmatterLines.join('\n'), ''];
  lines.push(`# ${snippet.title}`);
  lines.push('');

  if (snippet.description) {
    lines.push(snippet.description.trim());
    lines.push('');
  }

  if (snippet.codeBlocks && snippet.codeBlocks.length > 1) {
    for (let i = 0; i < snippet.codeBlocks.length; i++) {
      const block = snippet.codeBlocks[i]!;
      lines.push(`### ${block.name || `Code Block ${i + 1}`}`);
      lines.push('');
      lines.push(`\`\`\`${block.language || snippet.language}`);
      lines.push(cleanCodeContent(block.code).trim());
      lines.push('```');
      lines.push('');
    }
  } else {
    const block = snippet.codeBlocks?.[0];
    const codeToSerialize = cleanCodeContent(block?.code || snippet.code).trim();
    lines.push('## Implementation');
    lines.push('');
    lines.push(`\`\`\`${block?.language || snippet.language}`);
    lines.push(codeToSerialize);
    lines.push('```');
    lines.push('');
  }

  if (snippet.usage && snippet.usage.length > 0) {
    lines.push('## Usage');
    for (const u of snippet.usage) {
      lines.push(`- ${u}`);
    }
    lines.push('');
  }

  if (snippet.complexity?.time || snippet.complexity?.space) {
    lines.push('## Complexity');
    if (snippet.complexity.time) lines.push(`- **Time**: ${snippet.complexity.time}`);
    if (snippet.complexity.space) lines.push(`- **Space**: ${snippet.complexity.space}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function parseMarkdownToSnippet(
  content: string,
  fallbackId?: string
): Snippet {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const metadata: Record<string, string | string[] | number> = {};

  let body = content;
  if (frontmatterMatch && frontmatterMatch[1]) {
    body = content.slice(frontmatterMatch[0].length);
    const fmLines = frontmatterMatch[1].split(/\r?\n/);
    for (const line of fmLines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      let rawVal = line.slice(colonIdx + 1).trim();

      // Check if array [a, b, c]
      if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        const items = rawVal
          .slice(1, -1)
          .split(',')
          .map((item) => item.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        metadata[key] = items;
      } else {
        // String or number
        rawVal = rawVal.replace(/^["']|["']$/g, '');
        const num = Number(rawVal);
        metadata[key] = !isNaN(num) && rawVal.length > 0 ? num : rawVal;
      }
    }
  }

  const defaultLang =
    ((metadata['language'] || metadata['lang']) as string) || 'typescript';
  const parsedCodeBlocks = parseFencedCodeBlocks(body, defaultLang);

  // Determine primary code block (under ## Implementation/Solution, or 1st block)
  let primaryBlock = parsedCodeBlocks[0] || null;
  const implMatch = body.match(/##\s+(?:Implementation|Solution|Code)\b/i);
  if (implMatch && implMatch.index !== undefined) {
    const afterImpl = parsedCodeBlocks.find((cb) => cb.startIndex > implMatch.index!);
    if (afterImpl) {
      primaryBlock = afterImpl;
    }
  }

  const primaryLang = primaryBlock?.language || '';
  const language = primaryLang || defaultLang;
  const code = primaryBlock ? primaryBlock.code : '';

  // Extract title: visible H1 heading in body takes precedence over frontmatter
  const headingMatch = body.match(/^#\s+(.+)$/m);
  let title = headingMatch ? headingMatch[1]!.trim() : '';
  if (!title) {
    title = (metadata['title'] as string) || 'Snippet';
  }

  // Extract description:
  // Text around the code blocks (stripping title, code blocks, and ## Implementation / ## Complexity)
  let description = '';
  if (parsedCodeBlocks.length > 0) {
    const segments: string[] = [];
    let lastEnd = 0;

    for (const block of parsedCodeBlocks) {
      if (block.startIndex > lastEnd) {
        segments.push(body.slice(lastEnd, block.startIndex));
      }
      lastEnd = block.endIndex;
    }

    if (lastEnd < body.length) {
      segments.push(body.slice(lastEnd));
    }

    const cleanedSegments: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      let seg = segments[i]!;

      // Strip leading H1 title from first segment
      if (i === 0) {
        seg = seg.replace(/^#\s+[^\r\n]+(?:\r?\n)?/m, '');
      }

      // Strip trailing complexity section from last segment
      if (i === segments.length - 1) {
        seg = seg.replace(/##\s+Complexity[\s\S]*$/m, '');
      }

      // Strip section headings like ## Implementation, ## Implementation 1, ## Solution, ## Code
      seg = seg.replace(/^#{1,4}\s+.*?\b(?:Implementation|Solution|Code|Approach|Algorithm)\b[^\r\n]*(?:\r?\n|$)/gim, '');
      seg = seg.replace(/(?:\r?\n|^)#{1,4}\s+.*?\b(?:Implementation|Solution|Code|Approach|Algorithm)\b[^\r\n]*$/gim, '');

      // If this segment precedes a code block and ends with that block's heading, strip it
      if (i < parsedCodeBlocks.length) {
        const nextBlock = parsedCodeBlocks[i]!;
        if (nextBlock.name) {
          const escapedName = nextBlock.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const trailingHeadingRegex = new RegExp(`(?:\\r?\\n|^)#{1,4}\\s+${escapedName}\\s*$`, 'i');
          seg = seg.replace(trailingHeadingRegex, '');
        }
      }

      seg = seg.trim();
      if (seg) {
        cleanedSegments.push(seg);
      }
    }

    description = cleanedSegments.join('\n\n').trim();
  } else {
    description = body
      .replace(/^#\s+[^\r\n]+(?:\r?\n)?/m, '')
      .replace(/##\s+(?:Implementation|Solution|Code)[\s\S]*$/m, '')
      .replace(/##\s+Complexity[\s\S]*$/m, '')
      .trim();
  }

  // Extract complexity from body first, then fallback to frontmatter metadata
  let timeComplexity: string | undefined;
  let spaceComplexity: string | undefined;

  const timeMatch = body.match(/-\s+\*\*Time\*\*:\s*([^\r\n]+)/i);
  if (timeMatch && timeMatch[1]) {
    timeComplexity = timeMatch[1].trim().replace(/^["']|["']$/g, '');
  } else if (metadata['time']) {
    timeComplexity = String(metadata['time']).trim().replace(/^["']|["']$/g, '');
  }

  const spaceMatch = body.match(/-\s+\*\*Space\*\*:\s*([^\r\n]+)/i);
  if (spaceMatch && spaceMatch[1]) {
    spaceComplexity = spaceMatch[1].trim().replace(/^["']|["']$/g, '');
  } else if (metadata['space']) {
    spaceComplexity = String(metadata['space']).trim().replace(/^["']|["']$/g, '');
  }

  // Extract tags from metadata (array or comma-delimited string) or fallback to markdown body
  let parsedTags: string[] = [];
  const rawTags = metadata['tags'] || metadata['tag'];
  if (Array.isArray(rawTags)) {
    parsedTags = rawTags
      .map((t) => String(t).trim().replace(/^["']|["']$/g, '').replace(/^#/, ''))
      .filter(Boolean);
  } else if (typeof rawTags === 'string' && rawTags.trim()) {
    parsedTags = rawTags
      .split(',')
      .map((t) => t.trim().replace(/^["']|["']$/g, '').replace(/^#/, ''))
      .filter(Boolean);
  }

  if (parsedTags.length === 0) {
    const bodyTagsMatch = body.match(/(?:-\s+\*\*Tags\*\*:\s*|Tags:\s*)([^\r\n]+)/i);
    if (bodyTagsMatch && bodyTagsMatch[1]) {
      parsedTags = bodyTagsMatch[1]
        .split(/[, ]+/)
        .map((t) => t.trim().replace(/^["']|["']$/g, '').replace(/^#/, ''))
        .filter(Boolean);
    }
  }

  // Extract category, folder and subcategory from metadata or fallback to markdown body
  let category = (metadata['category'] as string) || (metadata['categories'] as string) || undefined;
  let folder = (metadata['folder'] as string) || (metadata['folders'] as string) || undefined;
  let subcategory = (metadata['subcategory'] as string) || undefined;

  if (!category) {
    const catMatch = body.match(/(?:-\s+\*\*Category\*\*:\s*|Category:\s*)([^\r\n]+)/i);
    if (catMatch && catMatch[1]) {
      category = catMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  if (!folder) {
    const folderMatch = body.match(/(?:-\s+\*\*Folder\*\*:\s*|Folder:\s*)([^\r\n]+)/i);
    if (folderMatch && folderMatch[1]) {
      folder = folderMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  // Extract usage contexts from metadata (array or comma-delimited string) or fallback to markdown body
  let parsedUsage: string[] = [];
  const rawUsage = metadata['usage'] || metadata['usageContext'] || metadata['usages'];
  if (Array.isArray(rawUsage)) {
    parsedUsage = rawUsage
      .map((u) => String(u).trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  } else if (typeof rawUsage === 'string' && rawUsage.trim()) {
    parsedUsage = rawUsage
      .split(',')
      .map((u) => u.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  if (parsedUsage.length === 0) {
    const bodyUsageMatch = body.match(/(?:-\s+\*\*(?:Usage(?:\s+Context)?|Context)\*\*:\s*|(?:^|\n)(?:Usage(?:\s+Context)?|Context):\s*)([^\r\n]+)/i);
    if (bodyUsageMatch && bodyUsageMatch[1]) {
      parsedUsage = bodyUsageMatch[1]
        .split(/[,]+/)
        .map((u) => u.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
  }

  const now = new Date().toISOString();

  const codeBlocks: SnippetCodeBlock[] = parsedCodeBlocks.map((b) => ({
    code: b.code,
    language: b.language || language,
    ...(b.name != null ? { name: b.name } : {}),
  }));

  const descValue = description || undefined;
  const codeBlocksValue = codeBlocks.length > 0 ? codeBlocks : undefined;
  const technologyValue = Array.isArray(metadata['technology']) ? (metadata['technology'] as string[]) : undefined;
  const usageValue = parsedUsage.length > 0 ? parsedUsage : (Array.isArray(metadata['usage']) ? (metadata['usage'] as string[]) : undefined);
  const complexityObj = timeComplexity || spaceComplexity
    ? {
        ...(timeComplexity ? { time: timeComplexity } : {}),
        ...(spaceComplexity ? { space: spaceComplexity } : {}),
      }
    : undefined;

  const normalizedLang = canonicalizeLanguage(language);
  const normalizedTags = normalizeTags(parsedTags);
  const rawTech = Array.isArray(metadata['technology'])
    ? (metadata['technology'] as string[])
    : (technologyValue || [normalizedLang]);
  const normalizedTech = normalizeTechnologies(rawTech);

  return {
    id: fallbackId || `snip-import-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    language: normalizedLang,
    code,
    ...(descValue != null ? { description: descValue } : {}),
    markdown: content,
    ...(codeBlocksValue != null ? { codeBlocks: codeBlocksValue } : {}),
    ...(category != null ? { category } : {}),
    ...(folder != null ? { folder } : {}),
    ...(subcategory != null ? { subcategory } : {}),
    tags: normalizedTags,
    technology: normalizedTech,
    ...(usageValue != null ? { usage: usageValue } : {}),
    ...(complexityObj != null ? { complexity: complexityObj } : {}),
    version: typeof metadata['version'] === 'number' ? metadata['version'] : 1,
    createdAt: (metadata['createdAt'] as string) || now,
    updatedAt: (metadata['updatedAt'] as string) || now,
  };
}

/**
 * Extracts all code blocks from a snippet (from codeBlocks field, markdown body, or primary code).
 * Correctly extracts every fenced code block, and never treats headings like '## Implementation' as code.
 */
export function extractAllCodeBlocks(snippet: {
  markdown?: string;
  code?: string;
  language?: string;
  description?: string;
  codeBlocks?: SnippetCodeBlock[];
}): SnippetCodeBlock[] {
  // 1. If explicit codeBlocks array exists and has valid code, sanitize and return
  if (snippet.codeBlocks && snippet.codeBlocks.length > 0) {
    const sanitized = snippet.codeBlocks
      .map((b) => ({
        ...b,
        code: cleanCodeContent(b.code),
        language: b.language || snippet.language || 'typescript',
        ...(b.name ? { name: b.name } : {}),
      }))
      .filter((b) => b.code.length > 0 && !/^#{1,4}\s+(?:Implementation|Solution|Code|Approach|Algorithm)\s*$/i.test(b.code));

    if (sanitized.length > 0) {
      return sanitized;
    }
  }

  // 2. Candidate markdown sources in order of preference
  const candidateSources = [
    snippet.markdown,
    snippet.code,
    snippet.description,
  ].filter((s): s is string => typeof s === 'string' && (s.includes('```') || s.includes('~~~')));

  for (const source of candidateSources) {
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    const parsed = parseFencedCodeBlocks(body, snippet.language || 'typescript');

    if (parsed.length > 0) {
      return parsed.map((p) => ({
        code: p.code,
        language: p.language,
        ...(p.name != null ? { name: p.name } : {}),
      }));
    }
  }

  // 3. Fallback to primary snippet.code if no fenced blocks were found
  if (snippet.code) {
    const cleaned = cleanCodeContent(snippet.code);
    if (cleaned && !/^#{1,4}\s+(?:Implementation|Solution|Code|Approach|Algorithm)\s*$/i.test(cleaned)) {
      return [
        {
          code: cleaned,
          language: snippet.language || 'typescript',
          name: 'Implementation',
        },
      ];
    }
  }

  return [];
}
