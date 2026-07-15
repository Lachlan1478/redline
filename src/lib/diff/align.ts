import { diffArrays } from 'diff';

/** Result of pass 1: each entry aligns a left paragraph, a right paragraph, or both. */
export type AlignedPair =
  | { type: 'unchanged'; left: string; right: string }
  | { type: 'modified'; left: string; right: string }
  | { type: 'removed'; left: string }
  | { type: 'added'; right: string };

/** Minimum similarity for a removed/added paragraph pair to count as an edit of the same paragraph. */
const SIMILARITY_THRESHOLD = 0.3;

/** Above this many candidate comparisons, fall back to cheap index-wise pairing. */
const MAX_PAIRING_CELLS = 250_000;

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

/**
 * Dice coefficient over word multisets: 2·|A∩B| / (|A|+|B|), in [0, 1].
 */
export function similarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const token of tokensA) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  let intersection = 0;
  for (const token of tokensB) {
    const remaining = counts.get(token) ?? 0;
    if (remaining > 0) {
      intersection += 1;
      counts.set(token, remaining - 1);
    }
  }
  return (2 * intersection) / (tokensA.length + tokensB.length);
}

/**
 * Pair up a run of removed paragraphs with the adjacent run of added paragraphs.
 *
 * Uses an order-preserving alignment (Needleman–Wunsch style) that maximises the
 * total similarity of matched pairs, so a deletion followed by an edit pairs the
 * edit with the right counterpart instead of blindly matching by index.
 */
function pairRuns(removed: string[], added: string[]): AlignedPair[] {
  if (removed.length * added.length > MAX_PAIRING_CELLS) {
    return pairByIndex(removed, added);
  }

  const n = removed.length;
  const m = added.length;
  const sim: number[][] = removed.map((r) => added.map((a) => similarity(r, a)));

  // dp[i][j] = best total similarity aligning removed[0..i) with added[0..j).
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const skipRemoved = dp[i - 1][j];
      const skipAdded = dp[i][j - 1];
      const match = sim[i - 1][j - 1] >= SIMILARITY_THRESHOLD ? dp[i - 1][j - 1] + sim[i - 1][j - 1] : -1;
      dp[i][j] = Math.max(skipRemoved, skipAdded, match);
    }
  }

  // Traceback to collect matched index pairs in ascending order.
  const matches: Array<[number, number]> = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const score = dp[i][j];
    if (
      sim[i - 1][j - 1] >= SIMILARITY_THRESHOLD &&
      score === dp[i - 1][j - 1] + sim[i - 1][j - 1]
    ) {
      matches.push([i - 1, j - 1]);
      i -= 1;
      j -= 1;
    } else if (score === dp[i - 1][j]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  matches.reverse();

  // Emit in document order: unmatched removals, then unmatched additions, then each match.
  const result: AlignedPair[] = [];
  let nextRemoved = 0;
  let nextAdded = 0;
  for (const [ri, ai] of matches) {
    while (nextRemoved < ri) result.push({ type: 'removed', left: removed[nextRemoved++] });
    while (nextAdded < ai) result.push({ type: 'added', right: added[nextAdded++] });
    result.push({ type: 'modified', left: removed[ri], right: added[ai] });
    nextRemoved = ri + 1;
    nextAdded = ai + 1;
  }
  while (nextRemoved < n) result.push({ type: 'removed', left: removed[nextRemoved++] });
  while (nextAdded < m) result.push({ type: 'added', right: added[nextAdded++] });
  return result;
}

/** Cheap fallback for pathologically large change runs. */
function pairByIndex(removed: string[], added: string[]): AlignedPair[] {
  const result: AlignedPair[] = [];
  const shared = Math.min(removed.length, added.length);
  for (let k = 0; k < shared; k++) {
    if (similarity(removed[k], added[k]) >= SIMILARITY_THRESHOLD) {
      result.push({ type: 'modified', left: removed[k], right: added[k] });
    } else {
      result.push({ type: 'removed', left: removed[k] });
      result.push({ type: 'added', right: added[k] });
    }
  }
  for (let k = shared; k < removed.length; k++) result.push({ type: 'removed', left: removed[k] });
  for (let k = shared; k < added.length; k++) result.push({ type: 'added', right: added[k] });
  return result;
}

/**
 * Pass 1 of the diff: align two paragraph lists.
 *
 * Runs an LCS diff over whole paragraphs, then pairs adjacent removed/added runs
 * into `modified` entries when the paragraphs are similar enough to be edits of
 * the same clause.
 */
export function alignParagraphs(left: string[], right: string[]): AlignedPair[] {
  const parts = diffArrays(left, right);
  const result: AlignedPair[] = [];

  let index = 0;
  while (index < parts.length) {
    const part = parts[index];
    const next = parts[index + 1];
    if (part.removed && next?.added) {
      result.push(...pairRuns(part.value, next.value));
      index += 2;
    } else if (part.removed) {
      for (const paragraph of part.value) result.push({ type: 'removed', left: paragraph });
      index += 1;
    } else if (part.added) {
      for (const paragraph of part.value) result.push({ type: 'added', right: paragraph });
      index += 1;
    } else {
      for (const paragraph of part.value) {
        result.push({ type: 'unchanged', left: paragraph, right: paragraph });
      }
      index += 1;
    }
  }
  return result;
}
