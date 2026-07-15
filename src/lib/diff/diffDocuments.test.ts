import { describe, it, expect } from 'vitest';
import { diffDocuments } from './diffDocuments';

const original = [
  'PRUDENTIAL STANDARD CPS 234',
  'Objectives and key requirements.',
  'An APRA-regulated entity must maintain information security capability.',
  'The Board is ultimately responsible for information security.',
  'Notification must occur within 72 hours.',
  'This standard commences on 1 July 2019.',
];

const changed = [
  'PRUDENTIAL STANDARD CPS 234',
  'Objectives and key requirements.',
  'An APRA-regulated entity must maintain robust information security capability.',
  'The Board is ultimately responsible for information security.',
  'A new clause about third-party service providers.',
  'Notification must occur within 24 hours.',
  'This standard commences on 1 July 2019.',
];

describe('diffDocuments', () => {
  it('produces one aligned row per paragraph pair', () => {
    const { rows } = diffDocuments(original, changed);
    expect(rows.map((r) => r.type)).toEqual([
      'unchanged',
      'unchanged',
      'modified',
      'unchanged',
      'added',
      'modified',
      'unchanged',
    ]);
  });

  it('numbers contiguous changed rows into hunks', () => {
    const { rows, hunks } = diffDocuments(original, changed);
    // Row 2 is its own hunk; rows 4-5 (added + modified, contiguous) form one hunk.
    expect(hunks).toHaveLength(2);
    expect(hunks[0]).toMatchObject({ index: 0, rowStart: 2, rowEnd: 2 });
    expect(hunks[1]).toMatchObject({ index: 1, rowStart: 4, rowEnd: 5 });
    expect(rows[2].hunkIndex).toBe(0);
    expect(rows[4].hunkIndex).toBe(1);
    expect(rows[5].hunkIndex).toBe(1);
    expect(rows[0].hunkIndex).toBeUndefined();
  });

  it('gives each hunk a non-empty summary', () => {
    const { hunks } = diffDocuments(original, changed);
    for (const hunk of hunks) {
      expect(hunk.summary.length).toBeGreaterThan(0);
    }
  });

  it('word-diffs modified rows', () => {
    const { rows } = diffDocuments(original, changed);
    const modified = rows[2];
    expect(modified.right?.some((s) => s.type === 'added' && s.text.includes('robust'))).toBe(true);
    expect(modified.left?.every((s) => s.type !== 'added')).toBe(true);
  });

  it('renders added rows with right-only segments and removed rows with left-only segments', () => {
    const { rows } = diffDocuments(['keep', 'remove me'], ['keep', 'unrelated addition xyz']);
    const removed = rows.find((r) => r.type === 'removed');
    const added = rows.find((r) => r.type === 'added');
    expect(removed?.left).toEqual([{ type: 'removed', text: 'remove me' }]);
    expect(removed?.right).toBeUndefined();
    expect(added?.right).toEqual([{ type: 'added', text: 'unrelated addition xyz' }]);
    expect(added?.left).toBeUndefined();
  });

  it('handles empty and one-sided documents', () => {
    expect(diffDocuments([], [])).toEqual({ rows: [], hunks: [] });

    const allAdded = diffDocuments([], ['brand new clause']);
    expect(allAdded.rows.map((r) => r.type)).toEqual(['added']);
    expect(allAdded.hunks).toHaveLength(1);
    expect(allAdded.hunks[0]).toMatchObject({ rowStart: 0, rowEnd: 0 });

    const allRemoved = diffDocuments(['old clause gone'], []);
    expect(allRemoved.rows.map((r) => r.type)).toEqual(['removed']);
    expect(allRemoved.hunks).toHaveLength(1);
    expect(allRemoved.hunks[0].summary).toBe('old clause gone');
  });

  it('returns no hunks for identical documents', () => {
    const { rows, hunks } = diffDocuments(original, original);
    expect(hunks).toEqual([]);
    expect(rows.every((r) => r.type === 'unchanged')).toBe(true);
  });
});
