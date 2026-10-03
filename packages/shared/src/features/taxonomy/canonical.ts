/**
 * Canonical technology definition containing:
 * - canonical: The display name (e.g., 'TypeScript', 'C++', 'Python')
 * - language: The lowercase identifier (e.g., 'typescript', 'cpp', 'python')
 * - extensions: File extensions mapped to this language (e.g., ['.ts', '.tsx'])
 * - aliases: Common case-insensitive aliases/representations (e.g., ['ts', 'typescript', '.ts'])
 */
export interface CanonicalTechnology {
  canonical: string;
  language: string;
  extensions: string[];
  aliases: string[];
}

export const CANONICAL_TECHNOLOGIES: CanonicalTechnology[] = [
  {
    canonical: 'TypeScript',
    language: 'typescript',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    aliases: ['typescript', 'ts', 'tsx', 'mts', 'cts', '.ts', '.tsx', '.mts', '.cts'],
  },
  {
    canonical: 'JavaScript',
    language: 'javascript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    aliases: ['javascript', 'js', 'jsx', 'mjs', 'cjs', '.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    canonical: 'Python',
    language: 'python',
    extensions: ['.py', '.pyw', '.ipynb'],
    aliases: ['python', 'py', 'python3', 'py3', '.py', '.pyw', '.ipynb'],
  },
  {
    canonical: 'C++',
    language: 'cpp',
    extensions: ['.cpp', '.cxx', '.cc', '.hpp', '.hxx', '.hh'],
    aliases: ['c++', 'cpp', 'cxx', 'cc', 'cplusplus', '.cpp', '.cxx', '.cc', '.hpp', '.hxx', '.hh'],
  },
  {
    canonical: 'C',
    language: 'c',
    extensions: ['.c', '.h'],
    aliases: ['c', '.c', '.h'],
  },
  {
    canonical: 'Rust',
    language: 'rust',
    extensions: ['.rs'],
    aliases: ['rust', 'rs', '.rs'],
  },
  {
    canonical: 'Go',
    language: 'go',
    extensions: ['.go'],
    aliases: ['go', 'golang', '.go'],
  },
  {
    canonical: 'Java',
    language: 'java',
    extensions: ['.java'],
    aliases: ['java', '.java'],
  },
  {
    canonical: 'Kotlin',
    language: 'kotlin',
    extensions: ['.kt', '.kts'],
    aliases: ['kotlin', 'kt', 'kts', '.kt', '.kts'],
  },
  {
    canonical: 'Swift',
    language: 'swift',
    extensions: ['.swift'],
    aliases: ['swift', '.swift'],
  },
  {
    canonical: 'C#',
    language: 'csharp',
    extensions: ['.cs'],
    aliases: ['c#', 'csharp', 'cs', '.cs'],
  },
  {
    canonical: 'PHP',
    language: 'php',
    extensions: ['.php', '.phtml'],
    aliases: ['php', '.php', '.phtml'],
  },
  {
    canonical: 'Ruby',
    language: 'ruby',
    extensions: ['.rb'],
    aliases: ['ruby', 'rb', '.rb'],
  },
  {
    canonical: 'SQL',
    language: 'sql',
    extensions: ['.sql'],
    aliases: ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', '.sql'],
  },
  {
    canonical: 'HTML',
    language: 'html',
    extensions: ['.html', '.htm'],
    aliases: ['html', 'htm', '.html', '.htm'],
  },
  {
    canonical: 'CSS',
    language: 'css',
    extensions: ['.css', '.scss', '.sass', '.less'],
    aliases: ['css', 'scss', 'sass', 'less', '.css', '.scss', '.sass', '.less'],
  },
  {
    canonical: 'Shell/Bash',
    language: 'bash',
    extensions: ['.sh', '.bash', '.zsh'],
    aliases: ['bash', 'sh', 'shell', 'zsh', '.sh', '.bash', '.zsh'],
  },
  {
    canonical: 'JSON',
    language: 'json',
    extensions: ['.json'],
    aliases: ['json', '.json'],
  },
  {
    canonical: 'YAML',
    language: 'yaml',
    extensions: ['.yaml', '.yml'],
    aliases: ['yaml', 'yml', '.yaml', '.yml'],
  },
  {
    canonical: 'Markdown',
    language: 'markdown',
    extensions: ['.md', '.markdown'],
    aliases: ['markdown', 'md', '.md', '.markdown'],
  },
  {
    canonical: 'React',
    language: 'typescript',
    extensions: ['.tsx', '.jsx'],
    aliases: ['react', 'reactjs', 'react.js'],
  },
  {
    canonical: 'Node.js',
    language: 'javascript',
    extensions: ['.js', '.mjs'],
    aliases: ['node', 'nodejs', 'node.js'],
  },
  {
    canonical: 'Docker',
    language: 'dockerfile',
    extensions: ['.dockerfile'],
    aliases: ['docker', 'dockerfile', '.dockerfile'],
  },
];

// Lookup maps for fast canonicalization
const aliasToCanonicalMap = new Map<string, CanonicalTechnology>();
const extensionToCanonicalMap = new Map<string, CanonicalTechnology>();

for (const tech of CANONICAL_TECHNOLOGIES) {
  for (const alias of tech.aliases) {
    aliasToCanonicalMap.set(alias.toLowerCase().trim(), tech);
  }
  for (const ext of tech.extensions) {
    const cleanExt = ext.toLowerCase().trim().replace(/^\.?/, '.');
    extensionToCanonicalMap.set(cleanExt, tech);
  }
}

/**
 * Normalizes an extension or alias input (e.g. '.TS', 'ts', 'Ts', 'cpp', 'C++', '.CPP')
 * to its canonical technology name (e.g. 'TypeScript', 'C++').
 * If no known canonical entry matches, normalizes by trimming and cleaning leading dots.
 */
export function canonicalizeTechnology(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  // Check direct alias match
  const fromAlias = aliasToCanonicalMap.get(lower);
  if (fromAlias) return fromAlias.canonical;

  // Check with or without leading dot
  const withDot = lower.startsWith('.') ? lower : `.${lower}`;
  const fromWithDot = extensionToCanonicalMap.get(withDot) || aliasToCanonicalMap.get(withDot);
  if (fromWithDot) return fromWithDot.canonical;

  const withoutDot = lower.replace(/^\.+/, '');
  const fromWithoutDot = aliasToCanonicalMap.get(withoutDot);
  if (fromWithoutDot) return fromWithoutDot.canonical;

  // Fallback: preserve user-defined technology casing / format trimmed
  return trimmed;
}

/**
 * Normalizes an extension or language name to its canonical lowercase language identifier
 * (e.g. '.TS' -> 'typescript', 'C++' / '.cpp' -> 'cpp', 'py' -> 'python').
 */
export function canonicalizeLanguage(raw: string): string {
  if (!raw || typeof raw !== 'string') return 'typescript';
  const trimmed = raw.trim();
  if (!trimmed) return 'typescript';

  const lower = trimmed.toLowerCase();
  const fromAlias = aliasToCanonicalMap.get(lower);
  if (fromAlias) return fromAlias.language;

  const withDot = lower.startsWith('.') ? lower : `.${lower}`;
  const fromWithDot = extensionToCanonicalMap.get(withDot) || aliasToCanonicalMap.get(withDot);
  if (fromWithDot) return fromWithDot.language;

  const withoutDot = lower.replace(/^\.+/, '');
  const fromWithoutDot = aliasToCanonicalMap.get(withoutDot);
  if (fromWithoutDot) return fromWithoutDot.language;

  return lower;
}

/**
 * Automatically detects language and canonical technology from a filename or extension
 * (e.g. 'solution.TS' -> { language: 'typescript', technology: 'TypeScript', extension: '.ts' })
 */
export function detectLanguageFromFilename(filename: string): {
  language: string;
  technology: string;
  extension: string;
} | null {
  if (!filename || typeof filename !== 'string') return null;
  const match = filename.trim().match(/\.([a-zA-Z0-9+#_-]+)$/);
  if (!match) return null;

  const ext = `.${match[1]!.toLowerCase()}`;
  const matchedTech = extensionToCanonicalMap.get(ext) || aliasToCanonicalMap.get(ext);
  if (matchedTech) {
    return {
      language: matchedTech.language,
      technology: matchedTech.canonical,
      extension: ext,
    };
  }

  return {
    language: match[1]!.toLowerCase(),
    technology: match[1]!,
    extension: ext,
  };
}

/**
 * Normalizes a tag string: strips leading '#', trims, converts to lowercase,
 * and canonicalizes if it represents an extension or technology alias.
 */
export function normalizeTag(rawTag: string): string {
  if (!rawTag || typeof rawTag !== 'string') return '';
  let cleaned = rawTag.trim().replace(/^#+/, '').trim().toLowerCase();
  if (!cleaned) return '';

  // If the tag starts with a dot (extension like .ts, .cpp), canonicalize to language tag
  if (cleaned.startsWith('.')) {
    const fromExt = extensionToCanonicalMap.get(cleaned) || aliasToCanonicalMap.get(cleaned);
    if (fromExt) {
      return fromExt.language;
    }
    return cleaned.replace(/^\.+/, '');
  }

  // If it's a known language alias (like 'ts', 'cpp', 'c++', 'py'), canonicalize
  const fromAlias = aliasToCanonicalMap.get(cleaned);
  if (fromAlias && (fromAlias.language === cleaned || cleaned === 'c++' || cleaned === 'c#' || fromAlias.extensions.some(e => e.slice(1) === cleaned))) {
    return fromAlias.language;
  }

  return cleaned;
}

/**
 * Normalizes a list of tags: removes duplicates case-insensitively,
 * canonicalizes language/extension tags, and preserves order.
 */
export function normalizeTags(tags: string[] | undefined | null): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const t of tags) {
    const normalized = normalizeTag(t);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

/**
 * Normalizes a list of technologies: canonicalizes each entry (e.g. '.ts', 'cpp', 'C++' -> 'TypeScript', 'C++'),
 * deduplicates case-insensitively, and sorts them.
 */
export function normalizeTechnologies(techs: string[] | undefined | null): string[] {
  if (!techs || !Array.isArray(techs)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const t of techs) {
    const canonical = canonicalizeTechnology(t);
    const key = canonical.toLowerCase();
    if (canonical && !seen.has(key)) {
      seen.add(key);
      result.push(canonical);
    }
  }

  return result.sort((a, b) => a.localeCompare(b));
}

/**
 * Checks whether two technology or tag names match case-insensitively or via canonicalization.
 */
export function matchesTechnologyOrTag(a: string, b: string): boolean {
  if (!a || !b) return false;
  const canonicalA = canonicalizeTechnology(a).toLowerCase();
  const canonicalB = canonicalizeTechnology(b).toLowerCase();
  if (canonicalA === canonicalB) return true;

  const tagA = normalizeTag(a);
  const tagB = normalizeTag(b);
  if (tagA === tagB) return true;

  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
