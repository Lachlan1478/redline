import { describe, it, expect } from 'vitest';
import { diffParagraph, orderedParts, wordEdits } from './wordDiff';

describe('diffParagraph', () => {
  it('returns a single unchanged segment on both sides for identical text', () => {
    const { left, right } = diffParagraph('Same text.', 'Same text.');
    expect(left).toEqual([{ type: 'unchanged', text: 'Same text.' }]);
    expect(right).toEqual([{ type: 'unchanged', text: 'Same text.' }]);
  });

  it('marks a substituted word as removed on the left and added on the right', () => {
    const { left, right } = diffParagraph(
      'Notify APRA within 10 days.',
      'Notify APRA within 5 days.',
    );
    expect(left).toEqual([
      { type: 'unchanged', text: 'Notify APRA within ' },
      { type: 'removed', text: '10' },
      { type: 'unchanged', text: ' days.' },
    ]);
    expect(right).toEqual([
      { type: 'unchanged', text: 'Notify APRA within ' },
      { type: 'added', text: '5' },
      { type: 'unchanged', text: ' days.' },
    ]);
  });

  it('shows appended words only on the right', () => {
    const { left, right } = diffParagraph('The insurer must comply.', 'The insurer must comply immediately.');
    expect(left.every((s) => s.type !== 'added')).toBe(true);
    expect(right.some((s) => s.type === 'added' && s.text.includes('immediately'))).toBe(true);
  });

  it('shows deleted words only on the left', () => {
    const { left, right } = diffParagraph('The insurer must promptly comply.', 'The insurer must comply.');
    expect(left.some((s) => s.type === 'removed' && s.text.includes('promptly'))).toBe(true);
    expect(right.every((s) => s.type !== 'removed')).toBe(true);
  });

  it('joins a rewritten phrase into one removed run and one added run', () => {
    const { left, right } = diffParagraph(
      'Interest accrues to the Escrow Amount and follows the principal.',
      'Interest accrues to the Seller for its benefit.',
    );
    expect(left.filter((s) => s.type === 'removed')).toHaveLength(1);
    expect(right.filter((s) => s.type === 'added')).toHaveLength(1);
  });

  it('shows a mostly rewritten span as one replacement', () => {
    const { left, right } = diffParagraph(
      '6. Escrow. Interest accrues to the Escrow Amount and follows the principal on release.',
      '6. Escrow. Interest accrues for the benefit of the Seller.',
    );
    expect(left).toEqual([
      { type: 'unchanged', text: '6. Escrow. Interest accrues ' },
      { type: 'removed', text: 'to the Escrow Amount and follows the principal on release' },
      { type: 'unchanged', text: '.' },
    ]);
    expect(right[1]).toEqual({ type: 'added', text: 'for the benefit of the Seller' });
  });

  it('keeps separate small edits apart', () => {
    expect(wordEdits('pay within ten days of the notice by the buyer', 'pay within five days of the notice by the purchaser')).toEqual([
      { removed: 'ten', added: 'five' },
      { removed: 'buyer', added: 'purchaser' },
    ]);
  });
});

describe('orderedParts', () => {
  it('reconstructs both texts in document order', () => {
    const left = 'The cap is 10% of the price, excluding fraud or wilful concealment.';
    const right = 'The cap is 20% of the price, excluding fraud of the Seller.';
    const parts = orderedParts(left, right);
    expect(parts.filter((p) => p.type !== 'added').map((p) => p.text).join('')).toBe(left);
    expect(parts.filter((p) => p.type !== 'removed').map((p) => p.text).join('')).toBe(right);
  });
});
