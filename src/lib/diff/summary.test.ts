import { describe, it, expect } from 'vitest';
import { amendmentSummary } from './summary';
import { diffDocuments } from './diffDocuments';

describe('amendmentSummary', () => {
  it('produces a numbered plain-text summary of every amendment', () => {
    const diff = diffDocuments(
      ['Intro.', 'The fee is 10 dollars.', 'Middle unchanged.', 'Tail.'],
      ['Intro.', 'The fee is 20 dollars.', 'Middle unchanged.', 'A brand new clause.', 'Tail.'],
    );
    const text = amendmentSummary(diff.hunks, 'v1.docx', 'v2.docx');
    expect(text).toContain('Redline: v1.docx → v2.docx');
    expect(text).toContain('2 amendments');
    expect(text).toMatch(/1\. \(¶ 2\)/);
    expect(text).toContain('The fee is 20 dollars.');
    expect(text).toContain('A brand new clause.');
  });

  it('reports zero amendments for identical documents', () => {
    const diff = diffDocuments(['Same.'], ['Same.']);
    expect(amendmentSummary(diff.hunks, 'a', 'b')).toContain('No amendments');
  });

  it('shows paragraph ranges for multi-paragraph amendments', () => {
    const diff = diffDocuments(
      ['One.', 'Alpha bravo charlie delta.', 'Echo foxtrot golf hotel.', 'Four.'],
      ['One.', 'Alpha bravo charlie modified.', 'Echo foxtrot golf changed.', 'Four.'],
    );
    const text = amendmentSummary(diff.hunks, 'a', 'b');
    expect(text).toMatch(/\(¶ 2–3\)/);
  });
});
