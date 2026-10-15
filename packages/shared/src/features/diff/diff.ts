
export type DiffLineType = "added" | "removed" | "unchanged";

export interface DiffLine {
  type: DiffLineType;
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffMetrics {
  added: number;
  removed: number;
  unchanged: number;
  total: number;
  changed: number;
  editDistance: number;
}

export interface DiffOptions {
  /**
   * Use compact-trace Myers when n + m is at most this value.
   */
  compactThreshold?: number;

  /**
   * Maximum approximate number of diagonal states explored.
   * If exceeded, the remaining region is emitted as removals
   * followed by additions. This fallback is not necessarily minimal.
   */
  maxWork?: number;
}

interface Budget {
  work: number;
  maxWork: number;
}

interface Snapshot {
  d: number;
  values: Int32Array;
}

interface DiffBuffers {
  forward: Int32Array;
  reverse: Int32Array;
}

const DEFAULT_COMPACT_THRESHOLD = 128;
const DEFAULT_MAX_WORK = 10_000_000;

/**
 * Public entry point. Produces a line-level shortest edit script
 * unless the work budget triggers the documented fallback.
 */
export function myersDiff(
  oldLines: string[],
  newLines: string[],
  options: DiffOptions = {},
): DiffLine[] {
  const compactThreshold =
    options.compactThreshold ?? DEFAULT_COMPACT_THRESHOLD;
  const maxWork = options.maxWork ?? DEFAULT_MAX_WORK;

  if (
    !Number.isSafeInteger(compactThreshold) ||
    compactThreshold < 0
  ) {
    throw new RangeError("compactThreshold must be a non-negative integer");
  }

  if (!Number.isSafeInteger(maxWork) || maxWork < 0) {
    throw new RangeError("maxWork must be a non-negative integer");
  }

  // Empty input arrays are handled naturally by diffRange.
  const result: DiffLine[] = [];
  const budget: Budget = { work: 0, maxWork };

  const n = oldLines.length;
  const m = newLines.length;

  // 1. Integer Line Interning (String Comparison to Int32)
  const lineMap = new Map<string, number>();
  const aIds = new Int32Array(n);
  const bIds = new Int32Array(m);

  let nextId = 0;
  for (let i = 0; i < n; i++) {
    const line = oldLines[i] ?? "";
    let id = lineMap.get(line);
    if (id === undefined) {
      id = nextId++;
      lineMap.set(line, id);
    }
    aIds[i] = id;
  }

  for (let j = 0; j < m; j++) {
    const line = newLines[j] ?? "";
    let id = lineMap.get(line);
    if (id === undefined) {
      id = nextId++;
      lineMap.set(line, id);
    }
    bIds[j] = id;
  }

  // 3. Scratch Buffer Reuse in Bidirectional Bisect
  const maxTotal = n + m;
  const buffers: DiffBuffers = {
    forward: new Int32Array(2 * maxTotal + 3),
    reverse: new Int32Array(2 * maxTotal + 3),
  };

  diffRange(
    oldLines,
    aIds,
    0,
    n,
    newLines,
    bIds,
    0,
    m,
    result,
    budget,
    compactThreshold,
    buffers,
  );

  return result;
}

/**
 * Recursively diffs a pair of half-open ranges.
 * Common prefixes and suffixes are emitted without searching.
 */
function diffRange(
  a: string[],
  aIds: Int32Array,
  a0: number,
  a1: number,
  b: string[],
  bIds: Int32Array,
  b0: number,
  b1: number,
  out: DiffLine[],
  budget: Budget,
  threshold: number,
  buffers: DiffBuffers,
): void {
  // Emit common prefix using fast integer ID comparisons.
  while (a0 < a1 && b0 < b1 && aIds[a0] === bIds[b0]) {
    out.push({
      type: "unchanged",
      text: a[a0] ?? "",
      oldLineNumber: a0 + 1,
      newLineNumber: b0 + 1,
    });
    a0++;
    b0++;
  }

  // Collect common suffix for later, preserving output order.
  let suffix = 0;
  while (
    a0 < a1 &&
    b0 < b1 &&
    aIds[a1 - 1] === bIds[b1 - 1]
  ) {
    a1--;
    b1--;
    suffix++;
  }

  const n = a1 - a0;
  const m = b1 - b0;

  if (n === 0) {
    for (let j = b0; j < b1; j++) {
      out.push({
        type: "added",
        text: b[j] ?? "",
        newLineNumber: j + 1,
      });
    }
  } else if (m === 0) {
    for (let i = a0; i < a1; i++) {
      out.push({
        type: "removed",
        text: a[i] ?? "",
        oldLineNumber: i + 1,
      });
    }
  } else if (budget.work >= budget.maxWork) {
    // Explicit bounded-work fallback. It is valid as a transformation,
    // but may not be a shortest edit script.
    emitReplacement(a, a0, a1, b, b0, b1, out);
  } else if (n + m <= threshold) {
    compactMyers(a, aIds, a0, a1, b, bIds, b0, b1, out, budget);
  } else {
    const split = bisect(aIds, a0, a1, bIds, b0, b1, budget, buffers);

    if (
      split === null ||
      (split.x === 0 && split.y === 0) ||
      (split.x === n && split.y === m)
    ) {
      // Avoid non-progressing recursion. A bounded fallback is safer
      // than repeatedly recursing on the same ranges.
      emitReplacement(a, a0, a1, b, b0, b1, out);
    } else {
      const midA = a0 + split.x;
      const midB = b0 + split.y;

      diffRange(
        a, aIds, a0, midA,
        b, bIds, b0, midB,
        out, budget, threshold,
        buffers,
      );

      diffRange(
        a, aIds, midA, a1,
        b, bIds, midB, b1,
        out, budget, threshold,
        buffers,
      );
    }
  }

  // Append the previously trimmed common suffix in forward order.
  for (let i = 0; i < suffix; i++) {
    out.push({
      type: "unchanged",
      text: a[a1 + i] ?? "",
      oldLineNumber: a1 + i + 1,
      newLineNumber: b1 + i + 1,
    });
  }
}

/**
 * Compact-trace Myers.
 *
 * Each snapshot stores only the active diagonal range [-d, d],
 * rather than the entire global frontier.
 */
function compactMyers(
  a: string[],
  aIds: Int32Array,
  a0: number,
  a1: number,
  b: string[],
  bIds: Int32Array,
  b0: number,
  b1: number,
  out: DiffLine[],
  budget: Budget,
): void {
  const n = a1 - a0;
  const m = b1 - b0;
  const max = n + m;

  // A full working frontier is reused; only compact snapshots persist.
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  v[offset + 1] = 0;

  const trace: Snapshot[] = [];
  let finalD = 0;
  let finished = false;

  for (let d = 0; d <= max; d++) {
    for (let k = -d; k <= d; k += 2) {
      if (!consumeWork(budget)) {
        emitReplacement(a, a0, a1, b, b0, b1, out);
        return;
      }

      let x: number;

      const vPrev = v[offset + k - 1] ?? 0;
      const vNext = v[offset + k + 1] ?? 0;

      if (
        k === -d ||
        (k !== d && vPrev < vNext)
      ) {
        x = vNext;
      } else {
        x = vPrev + 1;
      }

      let y = x - k;

      // Hot loop: compare integer IDs directly and hoist work budget check outside
      while (x < n && y < m && aIds[a0 + x] === bIds[b0 + y]) {
        x++;
        y++;
      }

      v[offset + k] = x;

      if (x >= n && y >= m) {
        finalD = d;
        finished = true;
        break;
      }
    }

    // Save only diagonals that are active at this edit distance.
    const values = new Int32Array(2 * d + 1);
    for (let k = -d; k <= d; k += 2) {
      values[k + d] = v[offset + k] ?? 0;
    }

    trace.push({ d, values });

    if (finished) break;
  }

  let x = n;
  let y = m;
  const reversed: DiffLine[] = [];

  const get = (snapshot: Snapshot, k: number): number => {
    if (k < -snapshot.d || k > snapshot.d) return 0;
    return snapshot.values[k + snapshot.d] ?? 0;
  };

  for (let d = finalD; d > 0; d--) {
    const prev = trace[d - 1];
    if (!prev) continue;
    const k = x - y;

    let prevK: number;

    if (
      k === -d ||
      (k !== d &&
        get(prev, k - 1) < get(prev, k + 1))
    ) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = get(prev, prevK);
    const prevY = prevX - prevK;

    while (
      x > prevX &&
      y > prevY &&
      aIds[a0 + x - 1] === bIds[b0 + y - 1]
    ) {
      reversed.push({
        type: "unchanged",
        text: a[a0 + x - 1] ?? "",
        oldLineNumber: a0 + x,
        newLineNumber: b0 + y,
      });
      x--;
      y--;
    }

    if (x === prevX) {
      reversed.push({
        type: "added",
        text: b[b0 + y - 1] ?? "",
        newLineNumber: b0 + y,
      });
      y--;
    } else {
      reversed.push({
        type: "removed",
        text: a[a0 + x - 1] ?? "",
        oldLineNumber: a0 + x,
      });
      x--;
    }
  }

  while (
    x > 0 &&
    y > 0 &&
    aIds[a0 + x - 1] === bIds[b0 + y - 1]
  ) {
    reversed.push({
      type: "unchanged",
      text: a[a0 + x - 1] ?? "",
      oldLineNumber: a0 + x,
      newLineNumber: b0 + y,
    });
    x--;
    y--;
  }

  // Remaining leading edits, if any.
  while (x > 0) {
    reversed.push({
      type: "removed",
      text: a[a0 + x - 1] ?? "",
      oldLineNumber: a0 + x,
    });
    x--;
  }

  while (y > 0) {
    reversed.push({
      type: "added",
      text: b[b0 + y - 1] ?? "",
      newLineNumber: b0 + y,
    });
    y--;
  }

  reversed.reverse();
  out.push(...reversed);
}

interface Split {
  x: number;
  y: number;
}

/**
 * Bidirectional Myers search.
 *
 * Searches from both ends and returns an overlap point.
 * Reuses pre-allocated scratch buffers across recursive calls.
 */
function bisect(
  aIds: Int32Array,
  a0: number,
  a1: number,
  bIds: Int32Array,
  b0: number,
  b1: number,
  budget: Budget,
  buffers: DiffBuffers,
): Split | null {
  const n = a1 - a0;
  const m = b1 - b0;
  const maxD = Math.ceil((n + m) / 2);
  const offset = maxD + 1;
  const length = 2 * maxD + 3;

  const forward = buffers.forward;
  const reverse = buffers.reverse;

  // Wipe only the active slice [-maxD - 1, maxD + 1] per invocation
  forward.fill(-1, 0, length);
  reverse.fill(-1, 0, length);
  forward[offset + 1] = 0;
  reverse[offset + 1] = 0;

  const delta = n - m;
  const odd = delta % 2 !== 0;

  let forwardStart = 0;
  let forwardEnd = 0;
  let reverseStart = 0;
  let reverseEnd = 0;

  for (let d = 0; d <= maxD; d++) {
    // Forward search.
    for (
      let k = -d + forwardStart;
      k <= d - forwardEnd;
      k += 2
    ) {
      if (!consumeWork(budget)) return null;

      const index = offset + k;
      let x: number;

      const fPrev = forward[index - 1] ?? -1;
      const fNext = forward[index + 1] ?? -1;

      if (
        k === -d ||
        (k !== d && fPrev < fNext)
      ) {
        x = fNext;
      } else {
        x = fPrev + 1;
      }

      let y = x - k;

      // Hot loop: compare integer IDs directly and hoist work budget check outside
      while (x < n && y < m && aIds[a0 + x] === bIds[b0 + y]) {
        x++;
        y++;
      }

      forward[index] = x;

      if (x > n) {
        forwardEnd += 2;
      } else if (y > m) {
        forwardStart += 2;
      } else if (odd) {
        const reverseK = delta - k;
        const reverseIndex = offset + reverseK;

        if (
          reverseIndex >= 0 &&
          reverseIndex < length &&
          reverse[reverseIndex] !== undefined &&
          reverse[reverseIndex] !== -1
        ) {
          const revVal = reverse[reverseIndex] ?? 0;
          const reverseX = n - revVal;

          if (x >= reverseX) return { x, y };
        }
      }
    }

    // Reverse search, measuring coordinates from the end.
    for (
      let k = -d + reverseStart;
      k <= d - reverseEnd;
      k += 2
    ) {
      if (!consumeWork(budget)) return null;

      const index = offset + k;
      let x: number;

      const rPrev = reverse[index - 1] ?? -1;
      const rNext = reverse[index + 1] ?? -1;

      if (
        k === -d ||
        (k !== d && rPrev < rNext)
      ) {
        x = rNext;
      } else {
        x = rPrev + 1;
      }

      let y = x - k;

      // Hot loop: compare integer IDs directly and hoist work budget check outside
      while (
        x < n &&
        y < m &&
        aIds[a1 - x - 1] === bIds[b1 - y - 1]
      ) {
        x++;
        y++;
      }

      reverse[index] = x;

      if (x > n) {
        reverseEnd += 2;
      } else if (y > m) {
        reverseStart += 2;
      } else if (!odd) {
        const forwardK = delta - k;
        const forwardIndex = offset + forwardK;

        if (
          forwardIndex >= 0 &&
          forwardIndex < length &&
          forward[forwardIndex] !== undefined &&
          forward[forwardIndex] !== -1
        ) {
          const forwardX = forward[forwardIndex] ?? 0;
          const forwardY = forwardX - forwardK;
          const reverseX = n - x;

          if (forwardX >= reverseX) {
            return { x: forwardX, y: forwardY };
          }
        }
      }
    }
  }

  return null;
}

function consumeWork(budget: Budget): boolean {
  if (budget.work >= budget.maxWork) return false;
  budget.work++;
  return true;
}

function emitReplacement(
  a: string[],
  a0: number,
  a1: number,
  b: string[],
  b0: number,
  b1: number,
  out: DiffLine[],
): void {
  for (let i = a0; i < a1; i++) {
    out.push({
      type: "removed",
      text: a[i] ?? "",
      oldLineNumber: i + 1,
    });
  }

  for (let j = b0; j < b1; j++) {
    out.push({
      type: "added",
      text: b[j] ?? "",
      newLineNumber: j + 1,
    });
  }
}

/**
 * Computes a line-by-line diff between two text strings.
 */
export function computeLineDiff(
  oldText: string,
  newText: string,
  options: DiffOptions = {},
): DiffLine[] {
  const oldLines = oldText === "" ? [] : oldText.split(/\r?\n/);
  const newLines = newText === "" ? [] : newText.split(/\r?\n/);

  return myersDiff(oldLines, newLines, options);
}

/**
 * Calculates line counts and insertion/deletion edit distance.
 */
export function computeDiffMetrics(
  diffLines: DiffLine[],
): DiffMetrics {
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const line of diffLines) {
    switch (line.type) {
      case "added":
        added++;
        break;
      case "removed":
        removed++;
        break;
      case "unchanged":
        unchanged++;
        break;
    }
  }

  return {
    added,
    removed,
    unchanged,
    total: diffLines.length,
    changed: added + removed,
    editDistance: added + removed,
  };
}
