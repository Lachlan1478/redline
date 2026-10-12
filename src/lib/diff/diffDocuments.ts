import { headingLabel } from '../clauses';
import { alignParagraphs } from './align';
import { materialityFlags } from './materiality';
import { diffParagraph, wordEdits } from './wordDiff';
import type { ChangeHunk, DiffRow, DocumentDiff, Segment, WordEdit } from './types';

const EDIT_MAX_LENGTH = 40;
const PARAGRAPH_MAX_LENGTH = 80;
const MAX_EDITS_SHOWN = 3;

const SUB_PARAGRAPH = /^\s*(\([a-z0-9]+\))/i;

function segmentsText(segments: Segment[] | undefined): string {
  return (segments ?? []).map((s) => s.text).join('');
}

function rowText(row: DiffRow): string {
  return segmentsText(row.right) || segmentsText(row.left);
}

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max).trimEnd()}…`;
}

function rowEdits(row: DiffRow): WordEdit[] {
  if (row.type === 'added') return [{ removed: '', added: rowText(row), paragraph: true }];
  if (row.type === 'removed') return [{ removed: rowText(row), added: '', paragraph: true }];
  return wordEdits(segmentsText(row.left), segmentsText(row.right));
}

export function describeEdit({ removed, added, paragraph }: WordEdit): string {
  if (paragraph) {
    return added
      ? `Added "${clip(added, PARAGRAPH_MAX_LENGTH)}"`
      : `Deleted "${clip(removed, PARAGRAPH_MAX_LENGTH)}"`;
  }
  if (!added) return `deleted "${clip(removed, EDIT_MAX_LENGTH)}"`;
  if (!removed) return `inserted "${clip(added, EDIT_MAX_LENGTH)}"`;
  return `"${clip(removed, EDIT_MAX_LENGTH)}" → "${clip(added, EDIT_MAX_LENGTH)}"`;
}

/** Clause reference for a hunk: the nearest heading at or above its first row, plus any sub-paragraph. */
function hunkLocation(rows: DiffRow[], start: number): string | undefined {
  for (let i = start; i >= 0; i--) {
    const heading = headingLabel(rowText(rows[i]));
    if (!heading) continue;
    const sub = i === start ? undefined : SUB_PARAGRAPH.exec(rowText(rows[start]))?.[1];
    return sub ? `${heading}${sub}` : heading;
  }
  return undefined;
}

function summarize(clause: string | undefined, edits: WordEdit[]): string {
  const shown = edits.slice(0, MAX_EDITS_SHOWN).map(describeEdit).join('; ');
  const more = edits.length > MAX_EDITS_SHOWN ? `; +${edits.length - MAX_EDITS_SHOWN} more` : '';
  return `${clause ? `${clause}: ` : ''}${shown}${more}`;
}

/** Groups contiguous changed rows into hunks, never letting one hunk span two numbered clauses or sub-paragraphs. */
function buildHunks(rows: DiffRow[]): ChangeHunk[] {
  const hunks: ChangeHunk[] = [];
  let start = -1;
  const closeHunk = (end: number) => {
    if (start === -1) return;
    const index = hunks.length;
    for (let i = start; i <= end; i++) rows[i].hunkIndex = index;
    const clause = hunkLocation(rows, start);
    const edits = rows.slice(start, end + 1).flatMap(rowEdits);
    hunks.push({
      index,
      rowStart: start,
      rowEnd: end,
      clause,
      edits,
      flags: materialityFlags(edits),
      summary: summarize(clause, edits),
    });
    start = -1;
  };
  rows.forEach((row, i) => {
    if (row.type === 'unchanged') {
      closeHunk(i - 1);
      return;
    }
    const text = rowText(row);
    if (start !== -1 && (headingLabel(text) || SUB_PARAGRAPH.test(text))) closeHunk(i - 1);
    if (start === -1) start = i;
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
