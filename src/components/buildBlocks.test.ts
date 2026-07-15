import { describe, it, expect } from 'vitest';
import { buildBlocks } from './buildBlocks';
import { diffDocuments } from '../lib/diff/diffDocuments';

function paragraphs(count: number, prefix: string): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix} paragraph number ${i} with content.`);
}

describe('buildBlocks', () => {
  it('collapses a long unchanged run, keeping context around the change', () => {
    const base = paragraphs(20, 'Same');
    const changed = [...base];
    changed[15] = 'Same paragraph number 15 with amended content.';
    const diff = diffDocuments(base, changed);

    const blocks = buildBlocks(diff);
    const collapsed = blocks.filter((b) => b.kind === 'collapsed');
    // Leading run: rows 0-14 unchanged — no context needed at the document
    // start, 2 context rows kept before the change at row 15. The short
    // trailing run (rows 16-19) stays visible: hiding 2 rows isn't worth a bar.
    expect(collapsed).toEqual([{ kind: 'collapsed', start: 0, end: 12 }]);
  });

  it('does not collapse short unchanged runs', () => {
    const left = ['a b c', 'd e f', 'g h i', 'totally different clause x'];
    const right = ['a b c', 'd e f', 'g h i', 'unrelated new clause zz yy'];
    const diff = diffDocuments(left, right);
    const blocks = buildBlocks(diff);
    expect(blocks.every((b) => b.kind === 'rows')).toBe(true);
  });

  it('covers every row exactly once, in order', () => {
    const base = paragraphs(30, 'Base');
    const changed = [...base.slice(0, 10), 'Inserted new clause.', ...base.slice(10)];
    const diff = diffDocuments(base, changed);
    const blocks = buildBlocks(diff);
    let expected = 0;
    for (const block of blocks) {
      expect(block.start).toBe(expected);
      expected = block.end + 1;
    }
    expect(expected).toBe(diff.rows.length);
  });
});
