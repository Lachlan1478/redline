import type { DocumentDiff } from '../lib/diff/types';

/** Unchanged paragraphs kept visible on each side of a change. */
const CONTEXT_ROWS = 2;
/** Only collapse an unchanged run when more than this many rows would be hidden. */
const MIN_HIDDEN_ROWS = 3;

export type Block =
  | { kind: 'rows'; start: number; end: number }
  | { kind: 'collapsed'; start: number; end: number };

/** Split rows into visible blocks and collapsible runs of unchanged paragraphs. */
export function buildBlocks(diff: DocumentDiff): Block[] {
  const { rows } = diff;
  const blocks: Block[] = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i].type !== 'unchanged') {
      const start = i;
      while (i < rows.length && rows[i].type !== 'unchanged') i++;
      blocks.push({ kind: 'rows', start, end: i - 1 });
      continue;
    }
    const runStart = i;
    while (i < rows.length && rows[i].type === 'unchanged') i++;
    const runEnd = i - 1;
    const leadingContext = runStart === 0 ? 0 : CONTEXT_ROWS;
    const trailingContext = runEnd === rows.length - 1 ? 0 : CONTEXT_ROWS;
    const hiddenStart = runStart + leadingContext;
    const hiddenEnd = runEnd - trailingContext;
    if (hiddenEnd - hiddenStart + 1 > MIN_HIDDEN_ROWS) {
      if (leadingContext > 0) blocks.push({ kind: 'rows', start: runStart, end: hiddenStart - 1 });
      blocks.push({ kind: 'collapsed', start: hiddenStart, end: hiddenEnd });
      if (trailingContext > 0) blocks.push({ kind: 'rows', start: hiddenEnd + 1, end: runEnd });
    } else {
      blocks.push({ kind: 'rows', start: runStart, end: runEnd });
    }
  }
  return blocks;
}
