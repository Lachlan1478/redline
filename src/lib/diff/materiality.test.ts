import { describe, it, expect } from 'vitest';
import { figureTokens, materialityFlags } from './materiality';

describe('materialityFlags', () => {
  it('flags changed figures, obligation words and risk terms', () => {
    expect(materialityFlags([{ removed: 'three', added: 'five' }])).toEqual(['figure']);
    expect(materialityFlags([{ removed: 'may', added: 'must' }])).toEqual(['obligation']);
    expect(materialityFlags([{ removed: 'or wilful concealment', added: '' }])).toEqual(['risk']);
    expect(materialityFlags([{ removed: '10%', added: '30%' }, { removed: '', added: 'liability' }])).toEqual([
      'figure',
      'risk',
    ]);
  });

  it('leaves cosmetic edits unflagged', () => {
    expect(materialityFlags([{ removed: 'Buyer', added: 'Purchaser' }])).toEqual([]);
  });
});

describe('figureTokens', () => {
  it('normalises number words and thousands separators', () => {
    expect(figureTokens('five Business Days and AUD 4,000,000 at 30%')).toEqual(['5', '4000000', '30']);
  });
});
