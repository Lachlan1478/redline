import { describe, it, expect } from 'vitest';
import { draftingChecks } from './drafting';

const messages = (paragraphs: string[]) => draftingChecks(paragraphs).map((n) => n.message);

describe('draftingChecks', () => {
  it('lists capitalised terms used as defined terms but never defined', () => {
    const notes = messages([
      'This agreement is between Alpha Bank plc ("Party A") and Harbour Super Pty Ltd (Party B).',
      '1. Definitions. "Notional Amount" means AUD 250,000,000.',
      '2. Payments. Party A pays the Equity Amount on the Notional Amount each Business Day.',
      '3. Key Person. If any Key Person leaves, the Corporations Act applies in New South Wales.',
    ]);
    expect(notes).toEqual(['Possibly undefined terms: Equity Amount, Business Day, Key Person.']);
  });

  it('lists quoted definitions that are never used', () => {
    expect(messages(['1. "Escrow Agent" means a bank. "Purchase Price" means AUD 1.', '2. The Purchase Price is paid.'])).toContain(
      'Defined but never used: Escrow Agent.',
    );
  });

  it('flags references to missing and deleted clauses', () => {
    expect(
      messages([
        '7. Right of First Refusal. [Not used.]',
        '8. Notices. Subject to clause 7 and Clause 12(b), notices are in writing.',
        '9. Termination. Clauses 8 to 9 survive.',
      ]),
    ).toEqual(['References to clauses that do not exist: clause 12.', 'References to clauses marked deleted: clause 7.']);
  });

  it('stays quiet on a clean, unnumbered document', () => {
    expect(draftingChecks(['The parties agree to meet.', 'Signed in Melbourne on 1 May 2026.'])).toEqual([]);
  });
});
