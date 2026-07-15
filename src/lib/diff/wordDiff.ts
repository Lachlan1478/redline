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
  const left: Segment[] = [];
  const right: Segment[] = [];
  for (const part of parts) {
    if (part.added) {
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
