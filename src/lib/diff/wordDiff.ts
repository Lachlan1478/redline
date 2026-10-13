import { diffWordsWithSpace } from 'diff';
import type { Segment, SegmentType, WordEdit } from './types';

/**
 * A span is shown as one replacement when the unchanged words inside it are
 * less than this share of the changed text, so rewrites don't render as confetti.
 */
const REWRITE_RATIO = 0.5;

export interface Part {
  type: SegmentType;
  text: string;
}

function mergeAdjacent<T extends Part>(parts: T[]): T[] {
  const merged: T[] = [];
  for (const part of parts) {
    const last = merged[merged.length - 1];
    if (last && last.type === part.type) {
      merged[merged.length - 1] = { ...last, text: last.text + part.text };
    } else {
      merged.push(part);
    }
  }
  return merged;
}

const isChange = (part: Part | undefined) => part !== undefined && part.type !== 'unchanged';

/**
 * Word-level changes from leftText to rightText in document order. A heavily
 * rewritten span between the first and last change collapses into one
 * removal followed by one addition.
 */
export function orderedParts(leftText: string, rightText: string): Part[] {
  const parts: Part[] = diffWordsWithSpace(leftText, rightText).map((p) => ({
    type: p.added ? 'added' : p.removed ? 'removed' : 'unchanged',
    text: p.value,
  }));
  const first = parts.findIndex(isChange);
  if (first === -1) return mergeAdjacent(parts);
  const last = parts.findLastIndex(isChange);
  const middle = parts.slice(first, last + 1);
  const length = (type: SegmentType) =>
    middle.filter((p) => p.type === type).reduce((n, p) => n + p.text.trim().length, 0);
  const changed = length('removed') + length('added');
  if (length('unchanged') >= changed * REWRITE_RATIO) return mergeAdjacent(parts);
  const side = (skip: SegmentType) =>
    middle.filter((p) => p.type !== skip).map((p) => p.text).join('');
  const collapsed: Part[] = [
    { type: 'removed', text: side('added') },
    { type: 'added', text: side('removed') },
  ].filter((p) => p.text) as Part[];
  return mergeAdjacent([...parts.slice(0, first), ...collapsed, ...parts.slice(last + 1)]);
}

/**
 * Pass 2 of the diff: word-level diff of one modified paragraph pair.
 *
 * Returns the segments to render in each pane: removals appear only on the
 * left (Original), additions only on the right (Change).
 */
export function diffParagraph(
  leftText: string,
  rightText: string,
): { left: Segment[]; right: Segment[] } {
  const parts = orderedParts(leftText, rightText);
  const near = (i: number, type: SegmentType) =>
    parts[i - 1]?.type === type || parts[i + 1]?.type === type;
  const left: Segment[] = [];
  const right: Segment[] = [];
  for (const [i, part] of parts.entries()) {
    if (part.type === 'added') {
      right.push(part);
    } else if (part.type === 'removed') {
      left.push(part);
    } else if (!part.text.trim() && isChange(parts[i - 1]) && isChange(parts[i + 1])) {
      // A lone space between two changes joins them, so a rewritten phrase reads as one run.
      left.push({ type: near(i, 'removed') ? 'removed' : 'unchanged', text: part.text });
      right.push({ type: near(i, 'added') ? 'added' : 'unchanged', text: part.text });
    } else {
      left.push(part);
      right.push(part);
    }
  }
  return { left: mergeAdjacent(left), right: mergeAdjacent(right) };
}

/**
 * The edits that turn leftText into rightText, for labelling. Whitespace-only
 * unchanged runs between changes are absorbed so a rewritten phrase reads as one edit.
 */
export function wordEdits(leftText: string, rightText: string): WordEdit[] {
  const edits: WordEdit[] = [];
  let current: WordEdit | undefined;
  let gap = '';
  for (const part of orderedParts(leftText, rightText)) {
    if (part.type === 'unchanged') {
      if (current && !part.text.trim()) {
        gap += part.text;
      } else {
        current = undefined;
        gap = '';
      }
      continue;
    }
    if (!current) {
      current = { removed: '', added: '' };
      edits.push(current);
    } else if (gap) {
      if (current.removed) current.removed += gap;
      if (current.added) current.added += gap;
    }
    gap = '';
    current[part.type] += part.text;
  }
  return edits.map((e) => ({ removed: e.removed.trim(), added: e.added.trim() }));
}
