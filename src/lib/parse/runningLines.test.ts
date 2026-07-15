import { describe, it, expect } from 'vitest';
import { filterRunningLines } from './runningLines';
import type { PageLine } from './runningLines';

function line(text: string): PageLine {
  return { text };
}

const TOPICS = ['capital adequacy', 'liquidity coverage', 'operational risk', 'outsourcing', 'governance'];

function makePages(count: number, decorate: (topic: string, pageNumber: number) => PageLine[]): PageLine[][] {
  return Array.from({ length: count }, (_, i) => decorate(TOPICS[i % TOPICS.length], i + 1));
}

describe('filterRunningLines', () => {
  it('drops a header line repeated on every page', () => {
    const pages = makePages(5, (topic) => [
      line('CPS 999 SAMPLE — CONFIDENTIAL DRAFT'),
      line(`The requirements concerning ${topic} apply to every regulated entity.`),
    ]);
    const filtered = filterRunningLines(pages);
    for (const page of filtered) {
      expect(page.some((l) => l.text.includes('CONFIDENTIAL'))).toBe(false);
      expect(page.some((l) => l.text.includes('requirements concerning'))).toBe(true);
    }
  });

  it('drops page numbers even though the digits differ per page', () => {
    const pages = makePages(4, (topic, n) => [
      line(`Substantive discussion of ${topic} unique to this part of the standard.`),
      line(`Page ${n} of 4`),
    ]);
    const filtered = filterRunningLines(pages);
    for (const page of filtered) {
      expect(page.some((l) => /^Page \d+/.test(l.text))).toBe(false);
      expect(page).toHaveLength(1);
    }
  });

  it('drops a short watermark repeated mid-page', () => {
    const pages = makePages(4, (topic) => [
      line(`Opening paragraph on ${topic} with substantive obligations for the entity.`),
      line('DRAFT'),
      line(`Closing paragraph noting how ${topic} interacts with the reporting framework.`),
    ]);
    const filtered = filterRunningLines(pages);
    for (const page of filtered) {
      expect(page.some((l) => l.text === 'DRAFT')).toBe(false);
      expect(page).toHaveLength(2);
    }
  });

  it('keeps everything except page numbers on short documents where repetition is weak evidence', () => {
    const pages = [
      [line('CONFIDENTIAL'), line('Body text of page one.')],
      [line('CONFIDENTIAL'), line('Body text of page two.')],
    ];
    const filtered = filterRunningLines(pages);
    expect(filtered[0]).toHaveLength(2);
  });

  it('keeps long body lines that repeat mid-page (boilerplate clauses are content)', () => {
    const repeatedClause =
      'The entity must maintain policies and procedures approved by the Board annually.';
    const pages = makePages(4, (topic) => [
      line(`Part heading concerning ${topic} for this section of the standard.`),
      line(`First obligation about ${topic} with specific substantive detail.`),
      line(repeatedClause),
      line(`Second obligation about ${topic} covering monitoring and review.`),
      line(`Final paragraph on ${topic} addressing transitional arrangements.`),
    ]);
    const filtered = filterRunningLines(pages);
    for (const page of filtered) {
      expect(page.some((l) => l.text === repeatedClause)).toBe(true);
    }
  });
});
