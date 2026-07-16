import { describe, it, expect } from 'vitest';
import { collectOptionalBlocks, blockTitles } from './optionalBlocks';
import type { Block } from './types';

const block = (id: string, title: string, children: Block[] = [], optional = false): Block => ({
  id,
  kind: 'clause',
  title,
  body: [{ t: 'text', text: 'Body.' }],
  children,
  optional,
});

const tree: Block[] = [
  block('a', 'Alpha'),
  block('b', 'Beta', [block('b1', 'Beta One', [], true), block('b2', 'Beta Two')]),
  block('c', 'Gamma', [], true),
];

describe('collectOptionalBlocks', () => {
  it('finds optional blocks at any depth, in document order', () => {
    expect(collectOptionalBlocks(tree).map((b) => b.id)).toEqual(['b1', 'c']);
  });

  it('returns empty for a tree with no optional blocks', () => {
    expect(collectOptionalBlocks([block('x', 'X')])).toEqual([]);
  });
});

describe('blockTitles', () => {
  it('maps every block id to its title, falling back to the id', () => {
    const titles = blockTitles(tree);
    expect(titles.get('b1')).toBe('Beta One');
    expect(titles.get('c')).toBe('Gamma');
    const untitled: Block = { id: 'u', kind: 'clause', body: [], children: [] };
    expect(blockTitles([untitled]).get('u')).toBe('u');
  });
});
