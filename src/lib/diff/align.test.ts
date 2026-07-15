import { describe, it, expect } from 'vitest';
import { alignParagraphs, similarity } from './align';

describe('similarity', () => {
  it('returns 1 for identical text', () => {
    expect(similarity('the quick brown fox', 'the quick brown fox')).toBe(1);
  });

  it('returns 0 for completely different text', () => {
    expect(similarity('alpha beta gamma', 'one two three')).toBe(0);
  });

  it('returns a high score for a paragraph with a small edit', () => {
    const a = 'The insurer must notify APRA within 10 business days of the event.';
    const b = 'The insurer must notify APRA within 5 business days of the event.';
    expect(similarity(a, b)).toBeGreaterThan(0.7);
  });
});

describe('alignParagraphs', () => {
  it('marks identical documents as fully unchanged', () => {
    const paras = ['First paragraph.', 'Second paragraph.'];
    const result = alignParagraphs(paras, paras);
    expect(result).toEqual([
      { type: 'unchanged', left: 'First paragraph.', right: 'First paragraph.' },
      { type: 'unchanged', left: 'Second paragraph.', right: 'Second paragraph.' },
    ]);
  });

  it('pairs an edited paragraph as modified', () => {
    const left = ['Intro.', 'The fee is 10 dollars per month.', 'Outro.'];
    const right = ['Intro.', 'The fee is 20 dollars per month.', 'Outro.'];
    const result = alignParagraphs(left, right);
    expect(result.map((r) => r.type)).toEqual(['unchanged', 'modified', 'unchanged']);
  });

  it('reports an inserted paragraph as added without disturbing surrounding alignment', () => {
    const left = ['One.', 'Two.'];
    const right = ['One.', 'Brand new clause inserted here.', 'Two.'];
    const result = alignParagraphs(left, right);
    expect(result).toEqual([
      { type: 'unchanged', left: 'One.', right: 'One.' },
      { type: 'added', right: 'Brand new clause inserted here.' },
      { type: 'unchanged', left: 'Two.', right: 'Two.' },
    ]);
  });

  it('reports a deleted paragraph as removed', () => {
    const left = ['One.', 'Clause to be deleted entirely.', 'Two.'];
    const right = ['One.', 'Two.'];
    const result = alignParagraphs(left, right);
    expect(result).toEqual([
      { type: 'unchanged', left: 'One.', right: 'One.' },
      { type: 'removed', left: 'Clause to be deleted entirely.' },
      { type: 'unchanged', left: 'Two.', right: 'Two.' },
    ]);
  });

  it('does not pair a deleted paragraph with an unrelated inserted one', () => {
    const left = ['One.', 'The quick brown fox jumps over the lazy dog.', 'Two.'];
    const right = ['One.', 'Completely unrelated replacement text about penguins.', 'Two.'];
    const result = alignParagraphs(left, right);
    expect(result.map((r) => r.type)).toEqual(['unchanged', 'removed', 'added', 'unchanged']);
  });

  it('pairs multiple consecutive edited paragraphs in order', () => {
    const left = [
      'Clause 1: the rate is 5 percent per annum.',
      'Clause 2: notice must be given within 30 days.',
    ];
    const right = [
      'Clause 1: the rate is 6 percent per annum.',
      'Clause 2: notice must be given within 14 days.',
    ];
    const result = alignParagraphs(left, right);
    expect(result.map((r) => r.type)).toEqual(['modified', 'modified']);
    expect(result[0]).toMatchObject({ left: left[0], right: right[0] });
    expect(result[1]).toMatchObject({ left: left[1], right: right[1] });
  });

  it('falls back to index-wise pairing for very large change runs', () => {
    // 500 × 510 candidate pairs exceeds MAX_PAIRING_CELLS, forcing pairByIndex.
    const left = Array.from(
      { length: 500 },
      (_, i) => `Clause ${i} requires alpha beta gamma delta compliance.`,
    );
    const right = Array.from(
      { length: 510 },
      (_, i) => `Clause ${i} requires alpha beta gamma epsilon compliance.`,
    );
    const result = alignParagraphs(left, right);
    expect(result).toHaveLength(510);
    expect(result.slice(0, 500).every((r) => r.type === 'modified')).toBe(true);
    expect(result.slice(500).every((r) => r.type === 'added')).toBe(true);
    expect(result[0]).toMatchObject({ left: left[0], right: right[0] });
    expect(result[499]).toMatchObject({ left: left[499], right: right[499] });
  });

  it('handles empty documents', () => {
    expect(alignParagraphs([], [])).toEqual([]);
    expect(alignParagraphs(['Only left.'], [])).toEqual([{ type: 'removed', left: 'Only left.' }]);
    expect(alignParagraphs([], ['Only right.'])).toEqual([{ type: 'added', right: 'Only right.' }]);
  });
});
