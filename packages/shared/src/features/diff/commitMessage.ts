import { type DiffLine } from './diff';

/**
 * Generates an intelligent heuristic commit message based on Myers diff analysis.
 */
export function generateHeuristicCommitMessage(
  diffLines: DiffLine[],
  snippetTitle = 'snippet'
): string {
  const addedLines = diffLines.filter((d) => d.type === 'added').map((d) => d.text.trim());
  const removedLines = diffLines.filter((d) => d.type === 'removed').map((d) => d.text.trim());

  if (addedLines.length === 0 && removedLines.length === 0) {
    return `chore: minor metadata update for ${snippetTitle}`;
  }

  const addedText = addedLines.join('\n').toLowerCase();
  const removedText = removedLines.join('\n').toLowerCase();

  // Check for performance / optimization patterns
  if (
    addedText.includes('memo') ||
    addedText.includes('cache') ||
    addedText.includes('bitwise') ||
    addedText.includes('o(1)') ||
    addedText.includes('o(log n)') ||
    addedText.includes('binary')
  ) {
    return `perf: optimize algorithm complexity in ${snippetTitle}`;
  }

  // Check for documentation / comments / markdown updates
  if (
    addedLines.every((l) => l.startsWith('//') || l.startsWith('#') || l.startsWith('*') || l.startsWith('/*')) ||
    (addedText.includes('readme') || addedText.includes('usage') || addedText.includes('note'))
  ) {
    return `docs: update documentation and explanations for ${snippetTitle}`;
  }

  // Check for error handling / edge cases / null checks
  if (
    addedText.includes('throw') ||
    addedText.includes('catch') ||
    addedText.includes('error') ||
    addedText.includes('undefined') ||
    addedText.includes('null') ||
    addedText.includes('if (!')
  ) {
    return `fix: add edge case handling and validation to ${snippetTitle}`;
  }

  // Check for refactoring / type updates
  if (
    addedText.includes('interface') ||
    addedText.includes('type ') ||
    addedText.includes('const ') ||
    removedText.includes('deprecated') ||
    (removedLines.length > 0 && Math.abs(addedLines.length - removedLines.length) <= 2)
  ) {
    return `refactor: improve code structure in ${snippetTitle}`;
  }

  // Feature / new logic addition
  if (addedLines.length > removedLines.length) {
    return `feat: implement additional logic in ${snippetTitle}`;
  }

  // Code removal / simplification
  if (removedLines.length > addedLines.length) {
    return `refactor: simplify implementation in ${snippetTitle}`;
  }

  return `update: modernize ${snippetTitle} implementation`;
}
