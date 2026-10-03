import {
  canonicalizeLanguage,
  normalizeTags,
  normalizeTechnologies,
} from '../taxonomy/canonical';

export interface AutofillResult {
  title: string;
  language: string;
  category: string;
  subcategory?: string;
  tags: string[];
  technology: string[];
  usage: string[];
  complexity?: {
    time?: string;
    space?: string;
  };
  description: string;
}

export function detectLanguageFromCode(code: string): string {
  const lower = code.toLowerCase();

  // Python
  if (
    /^\s*def\s+[a-zA-Z0-9_]+\s*\(/m.test(code) ||
    /^\s*import\s+[a-zA-Z0-9_]+/m.test(code) ||
    /^\s*from\s+[a-zA-Z0-9_]+\s+import/m.test(code) ||
    lower.includes('__name__ == "__main__"') ||
    lower.includes('print(') && !lower.includes('System.out')
  ) {
    return 'python';
  }

  // Rust
  if (
    /^\s*fn\s+[a-zA-Z0-9_]+/m.test(code) ||
    lower.includes('let mut ') ||
    lower.includes('println!') ||
    lower.includes('pub fn ')
  ) {
    return 'rust';
  }

  // Go
  if (
    lower.includes('package main') ||
    /^\s*func\s+[a-zA-Z0-9_]+/m.test(code) ||
    lower.includes('fmt.println')
  ) {
    return 'go';
  }

  // C++ / C
  if (
    lower.includes('#include <') ||
    lower.includes('std::cout') ||
    lower.includes('std::vector')
  ) {
    return 'cpp';
  }

  // Java
  if (
    lower.includes('public class ') ||
    lower.includes('public static void main') ||
    lower.includes('system.out.println')
  ) {
    return 'java';
  }

  // SQL
  if (
    /^\s*(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE)\b/i.test(code)
  ) {
    return 'sql';
  }

  // HTML
  if (lower.includes('<!doctype html>') || (lower.includes('<html') && lower.includes('</html>'))) {
    return 'html';
  }

  // CSS
  if (
    (lower.includes('{') && lower.includes('}') && (lower.includes('margin:') || lower.includes('padding:') || lower.includes('display:')))
  ) {
    return 'css';
  }

  // Shell / Bash
  if (
    code.startsWith('#!/bin/') ||
    /^\s*(echo|curl|chmod|grep)\s+/m.test(code) ||
    /^\s*export\s+[A-Za-z0-9_]+=/m.test(code)
  ) {
    return 'bash';
  }

  // TypeScript vs JavaScript
  if (
    lower.includes('interface ') ||
    lower.includes('type ') ||
    /:\s*(string|number|boolean|any|void)\b/.test(code) ||
    /<[A-Z]>/.test(code)
  ) {
    return 'typescript';
  }

  return 'typescript';
}

function nameToTitle(identifier: string): string {
  if (identifier.startsWith('use') && identifier.length > 3 && /[A-Z]/.test(identifier[3]!)) {
    return identifier;
  }
  const words = identifier
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/);

  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function autofillSnippetDetails(
  code: string,
  existing?: Partial<AutofillResult>
): AutofillResult {
  const trimmed = code.trim();
  const lower = trimmed.toLowerCase();

  // 1. Language
  const language = existing?.language || detectLanguageFromCode(trimmed);

  // 2. Title detection
  let title = existing?.title || '';
  if (!title) {
    // Check first line comment
    const firstLine = trimmed.split(/\r?\n/)[0]?.trim() || '';
    const commentMatch = firstLine.match(/^(?:\/\/|#|\/\*)\s*([a-zA-Z0-9\s_-]{3,50})(?:\*\/)?$/);
    if (commentMatch && commentMatch[1]) {
      title = nameToTitle(commentMatch[1]);
    } else {
      // Check function / class / const pattern
      const funcMatch =
        trimmed.match(/(?:function|class|def|fn|func)\s+([a-zA-Z0-9_]+)/) ||
        trimmed.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/);

      if (funcMatch && funcMatch[1]) {
        const rawName = funcMatch[1];
        if (rawName.startsWith('use') && rawName.length > 3 && /[A-Z]/.test(rawName[3]!)) {
          title = `${rawName} Hook`;
        } else {
          title = nameToTitle(rawName);
        }
      }
    }

    if (!title) {
      if (lower.includes('binary') && lower.includes('search')) title = 'Binary Search';
      else if (lower.includes('quick') && lower.includes('sort')) title = 'Quick Sort';
      else if (lower.includes('merge') && lower.includes('sort')) title = 'Merge Sort';
      else if (lower.includes('debounce')) title = 'useDebounce Hook';
      else if (lower.includes('throttle')) title = 'Throttle Utility';
      else if (lower.includes('fibonacci')) title = 'Fibonacci Sequence';
      else if (lower.includes('lru')) title = 'LRU Cache';
      else title = `${language.charAt(0).toUpperCase() + language.slice(1)} Snippet`;
    }
  }

  // 3. Category / Domain & Subcategory
  let category = existing?.category || '';
  let subcategory = existing?.subcategory || '';

  if (!category) {
    if (
      lower.includes('sort') ||
      (lower.includes('binary') && lower.includes('search')) ||
      lower.includes('binarysearch') ||
      lower.includes('partition') ||
      lower.includes('recursion') ||
      lower.includes('dfs') ||
      lower.includes('bfs') ||
      lower.includes('pivot')
    ) {
      category = 'Algorithms';
      subcategory = lower.includes('sort')
        ? 'Sorting'
        : (lower.includes('search') || lower.includes('binary'))
        ? 'Searching'
        : 'Recursion';
    } else if (
      lower.includes('usestate') ||
      lower.includes('useeffect') ||
      lower.includes('usememo') ||
      lower.includes('react') ||
      lower.includes('component')
    ) {
      category = 'Frontend';
      subcategory = lower.includes('use') ? 'Hooks' : 'Components';
    } else if (
      lower.includes('express') ||
      lower.includes('req, res') ||
      lower.includes('middleware') ||
      lower.includes('app.get') ||
      lower.includes('app.post')
    ) {
      category = 'Backend';
      subcategory = 'API Routes';
    } else if (
      lower.includes('select ') ||
      lower.includes('from ') ||
      lower.includes('insert into') ||
      lower.includes('create table')
    ) {
      category = 'Database';
      subcategory = 'SQL Queries';
    } else if (
      lower.includes('docker') ||
      lower.includes('kubectl') ||
      lower.includes('nginx')
    ) {
      category = 'DevOps';
      subcategory = 'Infrastructure';
    } else if (
      lower.includes('linkedlist') ||
      lower.includes('trie') ||
      lower.includes('heap') ||
      lower.includes('tree')
    ) {
      category = 'Data Structures';
      subcategory = 'Trees & Graphs';
    } else {
      category = 'Utilities';
      subcategory = 'Helpers';
    }
  }

  // 4. Technology
  const technology: string[] = existing?.technology || [];
  if (technology.length === 0) {
    if (language === 'typescript') technology.push('TypeScript');
    else if (language === 'python') technology.push('Python');
    else if (language === 'rust') technology.push('Rust');
    else if (language === 'go') technology.push('Go');
    else if (language === 'cpp') technology.push('C++');
    else if (language === 'java') technology.push('Java');
    else if (language === 'sql') technology.push('SQL');
    else if (language === 'bash') technology.push('Shell/Bash');

    if (lower.includes('react') || lower.includes('usestate') || lower.includes('useeffect')) {
      if (!technology.includes('React')) technology.unshift('React');
    }
    if (lower.includes('express') || lower.includes('node')) {
      if (!technology.includes('Node.js')) technology.push('Node.js');
    }
  }

  // 5. Tags
  const tagsSet = new Set<string>(existing?.tags || []);
  if (language) tagsSet.add(language.toLowerCase());

  if (lower.includes('while') && (lower.includes('mid') || lower.includes('binary'))) {
    tagsSet.add('binary-search');
    tagsSet.add('logarithmic');
  }
  if (lower.includes('sort') || lower.includes('partition') || lower.includes('pivot')) {
    tagsSet.add('sorting');
  }
  if (lower.includes('recursion') || lower.includes('return ') && trimmed.includes(title.toLowerCase().replace(/\s+/g, ''))) {
    tagsSet.add('recursion');
  }
  if (lower.includes('usestate') || lower.includes('useeffect') || lower.includes('hook')) {
    tagsSet.add('react');
    tagsSet.add('hook');
  }
  if (lower.includes('debounce')) tagsSet.add('debounce');
  if (lower.includes('throttle')) tagsSet.add('throttle');
  if (lower.includes('async') || lower.includes('await') || lower.includes('promise')) {
    tagsSet.add('async');
  }
  if (lower.includes('array') || lower.includes('nums') || lower.includes('[]')) {
    tagsSet.add('array');
  }
  if (lower.includes('string')) tagsSet.add('string');
  if (tagsSet.size === 1) tagsSet.add('utility');

  // 6. Complexity Estimation
  let timeComplexity = existing?.complexity?.time || '';
  let spaceComplexity = existing?.complexity?.space || '';

  if (!timeComplexity) {
    if (lower.includes('binary') && (lower.includes('left') || lower.includes('mid'))) {
      timeComplexity = 'O(log n)';
    } else if (lower.includes('sort')) {
      timeComplexity = 'O(n log n)';
    } else {
      const loopCount = (trimmed.match(/for\s*\(|while\s*\(|\.forEach|\.map/g) || []).length;
      if (loopCount >= 2) timeComplexity = 'O(n^2)';
      else if (loopCount === 1) timeComplexity = 'O(n)';
      else timeComplexity = 'O(1)';
    }
  }

  if (!spaceComplexity) {
    if (lower.includes('matrix') || (lower.includes('[][') && lower.includes('new'))) {
      spaceComplexity = 'O(n^2)';
    } else if (lower.includes('new array') || lower.includes('[]') && lower.includes('push') || lower.includes('recursion')) {
      spaceComplexity = 'O(n)';
    } else {
      spaceComplexity = 'O(1)';
    }
  }

  // 7. Usage Context
  const usage: string[] = existing?.usage || [];
  if (usage.length === 0) {
    if (category === 'Algorithms') {
      usage.push('LeetCode', 'Interview');
    } else if (category === 'Frontend' || category === 'Backend') {
      usage.push('Personal Project', 'Production');
    } else {
      usage.push('Learning/Reference');
    }
  }

  // 8. Description
  let description = existing?.description || '';
  if (!description) {
    description = `${technology.join('/') || language.toUpperCase()} implementation of ${title} for ${category}${
      subcategory ? ` (${subcategory})` : ''
    }.`;
  }

  return {
    title,
    language: canonicalizeLanguage(language),
    category,
    subcategory,
    tags: normalizeTags(Array.from(tagsSet)),
    technology: normalizeTechnologies(technology),
    usage,
    complexity: {
      time: timeComplexity,
      space: spaceComplexity,
    },
    description,
  };
}
