import { diffWordsWithSpace } from 'diff';
import type { Segment } from './types';

function mergeAdjacent(segments: Segment[]): Segment[] {
  const merged: Segment[] = [];
  for (const segment of segments) {
    const last = merged[merged.length - 1];
    if (last && last.type === segment.type) {
      merged[merged.length - 1] = { type: last.type, text: last.text + segment.text };
    } else {
      merged.push(segment);
    }
  }
  return merged;
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
  const parts = diffWordsWithSpace(leftText, rightText);
  const changed = (i: number) => Boolean(parts[i]?.added || parts[i]?.removed);
  const near = (i: number, side: 'added' | 'removed') => Boolean(parts[i - 1]?.[side] || parts[i + 1]?.[side]);
  const left: Segment[] = [];
  const right: Segment[] = [];
  for (const [i, part] of parts.entries()) {
    // A lone space between two changes joins them, so a rewritten phrase reads as one run.
    if (!part.value.trim() && !part.added && !part.removed && changed(i - 1) && changed(i + 1)) {
      left.push({ type: near(i, 'removed') ? 'removed' : 'unchanged', text: part.value });
      right.push({ type: near(i, 'added') ? 'added' : 'unchanged', text: part.value });
    } else if (part.added) {
      right.push({ type: 'added', text: part.value });
    } else if (part.removed) {
      left.push({ type: 'removed', text: part.value });
    } else {
      left.push({ type: 'unchanged', text: part.value });
      right.push({ type: 'unchanged', text: part.value });
    }
  }
  return { left: mergeAdjacent(left), right: mergeAdjacent(right) };
}

/** One contiguous edit inside a paragraph: what was removed and what replaced it. */
export interface WordEdit {
  removed: string;
  added: string;
}

/**
 * The edits that turn leftText into rightText, for labelling. Whitespace-only
 * unchanged runs between changes are absorbed so a rewritten phrase reads as one edit.
 */
export function wordEdits(leftText: string, rightText: string): WordEdit[] {
  const edits: WordEdit[] = [];
  let current: WordEdit | undefined;
  let gap = '';
  for (const part of diffWordsWithSpace(leftText, rightText)) {
    if (!part.added && !part.removed) {
      if (current && !part.value.trim()) {
        gap += part.value;
        continue;
      }
      current = undefined;
      gap = '';
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
    if (part.added) current.added += part.value;
    else current.removed += part.value;
  }
  return edits.map((e) => ({ removed: e.removed.trim(), added: e.added.trim() }));
}
