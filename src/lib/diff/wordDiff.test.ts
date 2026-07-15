import { describe, it, expect } from 'vitest';
import { diffParagraph } from './wordDiff';

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
});
