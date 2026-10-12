import { describe, it, expect } from 'vitest';
import { clauseTexts, revertedClauses } from './history';

describe('clauseTexts', () => {
  it('collects each clause with its sub-paragraphs', () => {
    expect(clauseTexts(['Preamble.', '3. Payments.', '(a) Party A pays.', '4. Taxes.'])).toEqual(
      new Map([
        ['3', '3. Payments. (a) Party A pays.'],
        ['4', '4. Taxes.'],
      ]),
    );
  });
});

describe('revertedClauses', () => {
  it('finds clauses put back to an earlier draft’s wording', () => {
    const v1 = ['6. Escrow. Interest accrues for the benefit of the Seller.', '7. Release. After 12 months.'];
    const v2 = ['6. Escrow. Interest follows the principal.', '7. Release. After 18 months.'];
    const v3 = ['6. Escrow. Interest accrues for the benefit of the Seller.', '7. Release. After 15 months.'];
    expect(revertedClauses(v1, v2, v3)).toEqual(new Set(['6']));
  });
});
