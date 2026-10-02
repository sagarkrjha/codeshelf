export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Computes a line-by-line diff between two arrays of strings using
 * Eugene W. Myers' O((N+M)D) Difference Algorithm (1986).
 *
 * Myers' algorithm discovers the Shortest Edit Script (SES) by traversing the edit
 * graph along diagonals k = x - y, progressing through increasing edit distance D.
 * This is the same minimal diff algorithm utilized by Git.
 */
export function myersDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const n = oldLines.length;
  const m = newLines.length;

  if (n === 0 && m === 0) {
    return [];
  }

  if (n === 0) {
    return newLines.map((text, idx) => ({
      type: 'added',
      text,
      newLineNumber: idx + 1,
    }));
  }

  if (m === 0) {
    return oldLines.map((text, idx) => ({
      type: 'removed',
      text,
      oldLineNumber: idx + 1,
    }));
  }

  const max = n + m;
  // v array: k ranges from -max to +max, offset by max.
  // v[k + max] stores the furthest-reaching x along diagonal k = x - y.
  const v = new Int32Array(2 * max + 1);
  const trace: Int32Array[] = [];

  v[1 + max] = 0;

  let finalD = max;

  for (let d = 0; d <= max; d++) {
    const vCopy = new Int32Array(v);
    trace.push(vCopy);

    let reached = false;

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && (vCopy[k - 1 + max] ?? 0) < (vCopy[k + 1 + max] ?? 0))) {
        x = vCopy[k + 1 + max] ?? 0; // Down step (insertion)
      } else {
        x = (vCopy[k - 1 + max] ?? 0) + 1; // Right step (deletion)
      }

      let y = x - k;

      // Follow diagonal snake (matching lines)
      while (x < n && y < m && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }

      v[k + max] = x;

      if (x >= n && y >= m) {
        finalD = d;
        reached = true;
        break;
      }
    }

    if (reached) {
      break;
    }
  }

  // Backtrack through trace to construct the minimal diff script
  const diff: DiffLine[] = [];
  let x = n;
  let y = m;

  for (let d = finalD; d > 0; d--) {
    const vPrev = trace[d]!;
    const k = x - y;

    let prevK: number;
    if (k === -d || (k !== d && (vPrev[k - 1 + max] ?? 0) < (vPrev[k + 1 + max] ?? 0))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = vPrev[prevK + max] ?? 0;
    const prevY = prevX - prevK;

    // Collect matched snake lines
    while (x > prevX && y > prevY && oldLines[x - 1] === newLines[y - 1]) {
      diff.push({
        type: 'unchanged',
        text: oldLines[x - 1]!,
        oldLineNumber: x,
        newLineNumber: y,
      });
      x--;
      y--;
    }

    if (x === prevX) {
      // Insertion into B
      diff.push({
        type: 'added',
        text: newLines[y - 1]!,
        newLineNumber: y,
      });
      y--;
    } else if (y === prevY) {
      // Deletion from A
      diff.push({
        type: 'removed',
        text: oldLines[x - 1]!,
        oldLineNumber: x,
      });
      x--;
    }
  }

  // Collect initial matching snake lines before any edit
  while (x > 0 && y > 0 && oldLines[x - 1] === newLines[y - 1]) {
    diff.push({
      type: 'unchanged',
      text: oldLines[x - 1]!,
      oldLineNumber: x,
      newLineNumber: y,
    });
    x--;
    y--;
  }

  diff.reverse();
  return diff;
}

/**
 * Computes a line-by-line diff between two text strings using Eugene Myers' Algorithm.
 */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText ? oldText.split(/\r?\n/) : [];
  const newLines = newText ? newText.split(/\r?\n/) : [];
  return myersDiff(oldLines, newLines);
}
