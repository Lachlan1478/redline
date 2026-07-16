import { describe, it, expect } from 'vitest';
import { computeNumbering, isIncluded } from './numbering';
import type { Block } from './types';

const clause = (id: string, children: Block[] = [], extra: Partial<Block> = {}): Block => ({
  id,
  kind: 'clause',
  body: [{ t: 'text', text: `Body of ${id}.` }],
  children,
  ...extra,
});

const blocks: Block[] = [
  { id: 'pre', kind: 'preamble', body: [{ t: 'text', text: 'This agreement…' }], children: [] },
  clause('c1', [clause('c1a'), clause('c1b', [clause('c1b1'), clause('c1b2')])]),
  clause('c2'),
  clause('rofr', [], { optional: true }),
  clause('c3'),
];

describe('isIncluded', () => {
  it('always includes mandatory blocks', () => {
    expect(isIncluded(blocks[1], {})).toBe(true);
    expect(isIncluded(blocks[1], { c1: false })).toBe(true);
  });

  it('excludes optional blocks by default', () => {
    expect(isIncluded(blocks[3], {})).toBe(false);
  });

  it('respects includedByDefault and explicit overrides', () => {
    const onByDefault = clause('x', [], { optional: true, includedByDefault: true });
    expect(isIncluded(onByDefault, {})).toBe(true);
    expect(isIncluded(onByDefault, { x: false })).toBe(false);
    expect(isIncluded(blocks[3], { rofr: true })).toBe(true);
  });
});

describe('computeNumbering', () => {
  it('numbers top-level clauses decimally, skipping unnumbered preamble', () => {
    const labels = computeNumbering(blocks, {});
    expect(labels.get('pre')).toBeUndefined();
    expect(labels.get('c1')).toEqual({ own: '1.', full: '1' });
    expect(labels.get('c2')).toEqual({ own: '2.', full: '2' });
  });

  it('numbers nested levels as (a) then (i), building full path labels', () => {
    const labels = computeNumbering(blocks, {});
    expect(labels.get('c1a')).toEqual({ own: '(a)', full: '1(a)' });
    expect(labels.get('c1b')).toEqual({ own: '(b)', full: '1(b)' });
    expect(labels.get('c1b1')).toEqual({ own: '(i)', full: '1(b)(i)' });
    expect(labels.get('c1b2')).toEqual({ own: '(ii)', full: '1(b)(ii)' });
  });

  it('renumbers later clauses when an optional clause is toggled in', () => {
    const excluded = computeNumbering(blocks, {});
    expect(excluded.get('rofr')).toBeUndefined();
    expect(excluded.get('c3')).toEqual({ own: '3.', full: '3' });

    const included = computeNumbering(blocks, { rofr: true });
    expect(included.get('rofr')).toEqual({ own: '3.', full: '3' });
    expect(included.get('c3')).toEqual({ own: '4.', full: '4' });
  });

  it('does not number children of an excluded block', () => {
    const withChild: Block[] = [
      clause('a'),
      clause('opt', [clause('optChild')], { optional: true }),
    ];
    const labels = computeNumbering(withChild, {});
    expect(labels.get('optChild')).toBeUndefined();
  });

  it('renders roman numerals beyond (x)', () => {
    const many = clause('top', Array.from({ length: 1 }, () =>
      clause('mid', Array.from({ length: 14 }, (_, i) => clause(`leaf${i}`))),
    ));
    const labels = computeNumbering([many], {});
    expect(labels.get('leaf3')).toEqual({ own: '(iv)', full: '1(a)(iv)' });
    expect(labels.get('leaf13')).toEqual({ own: '(xiv)', full: '1(a)(xiv)' });
  });
});
