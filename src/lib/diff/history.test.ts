import { describe, it, expect } from 'vitest';
import { diffDocuments } from './diffDocuments';
import { clauseTexts, revertedHunks } from './history';

describe('clauseTexts', () => {
  it('collects each clause with its sub-paragraphs', () => {
    expect(clauseTexts(['Preamble.', '3. Payments.', '(a) Party A pays.', '4. Taxes.'])).toEqual(
      new Map([
        ['3', '3. Payments.'],
        ['3(a)', '(a) Party A pays.'],
        ['4', '4. Taxes.'],
      ]),
    );
  });
});

describe('revertedHunks', () => {
  const v1 = ['6. Escrow. Held 12 months. Interest accrues for the benefit of the Seller.', '7. Release.', '(a) After three Business Days.'];
  const v2 = ['6. Escrow. Held 18 months. Interest follows the principal.', '7. Release.', '(a) After five Business Days.'];
  const v3 = ['6. Escrow. Held 15 months. Interest accrues for the benefit of the Seller.', '7. Release.', '(a) After three Business Days.'];

  it('flags a restored phrase and a sub-paragraph put back word for word', () => {
    const { hunks } = diffDocuments(v2, v3);
    expect(hunks.map((h) => h.clause)).toEqual(['cl 6', 'cl 7(a)']);
    expect(revertedHunks(hunks, v1, v2, v3)).toEqual(new Set([0, 1]));
  });

  it('ignores genuinely new wording', () => {
    const v3b = ['6. Escrow. Held 15 months. Interest is split equally.', '7. Release.', '(a) After ten Business Days.'];
    expect(revertedHunks(diffDocuments(v2, v3b).hunks, v1, v2, v3b)).toEqual(new Set());
  });
});
