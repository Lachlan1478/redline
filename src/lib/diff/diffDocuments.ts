import { alignParagraphs } from './align';
import { diffParagraph } from './wordDiff';
import type { ChangeHunk, DiffRow, DocumentDiff, Segment } from './types';

const SUMMARY_MAX_LENGTH = 80;

function segmentsText(segments: Segment[] | undefined): string {
  return (segments ?? []).map((s) => s.text).join('');
}

function summarize(row: DiffRow): string {
  const text = (segmentsText(row.right) || segmentsText(row.left)).trim();
  if (text.length <= SUMMARY_MAX_LENGTH) return text;
  return `${text.slice(0, SUMMARY_MAX_LENGTH).trimEnd()}…`;
}

function buildHunks(rows: DiffRow[]): ChangeHunk[] {
  const hunks: ChangeHunk[] = [];
  let start = -1;
  const closeHunk = (end: number) => {
    if (start === -1) return;
    const index = hunks.length;
    for (let i = start; i <= end; i++) rows[i].hunkIndex = index;
    hunks.push({ index, rowStart: start, rowEnd: end, summary: summarize(rows[start]) });
    start = -1;
  };
  rows.forEach((row, i) => {
    if (row.type === 'unchanged') {
      closeHunk(i - 1);
    } else if (start === -1) {
      start = i;
    }
  });
  closeHunk(rows.length - 1);
  return hunks;
}

/**
 * Full document diff: paragraph alignment, then word-level diff of modified
 * pairs, then grouping of contiguous changed rows into navigable hunks.
 */
export function diffDocuments(leftParagraphs: string[], rightParagraphs: string[]): DocumentDiff {
  const aligned = alignParagraphs(leftParagraphs, rightParagraphs);
  const rows: DiffRow[] = aligned.map((pair): DiffRow => {
    switch (pair.type) {
      case 'unchanged':
        return {
          type: 'unchanged',
          left: [{ type: 'unchanged', text: pair.left }],
          right: [{ type: 'unchanged', text: pair.right }],
        };
      case 'modified': {
        const { left, right } = diffParagraph(pair.left, pair.right);
        return { type: 'modified', left, right };
      }
      case 'removed':
        return { type: 'removed', left: [{ type: 'removed', text: pair.left }] };
      case 'added':
        return { type: 'added', right: [{ type: 'added', text: pair.right }] };
    }
  });
  const hunks = buildHunks(rows);
  return { rows, hunks };
}
