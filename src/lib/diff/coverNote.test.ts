import { describe, it, expect } from 'vitest';
import { checkCoverNote, coverNoteRefs } from './coverNote';
import { diffDocuments } from './diffDocuments';

const v2 = [
  '5. Disputes. Party B may dispute a determination within five Business Days.',
  '6. Escrow. Interest accrues to the Escrow Amount and follows the principal on release.',
  '11. Termination.',
  '(a) Events of Default include failure to pay within three Business Days of notice.',
  '(b) Party B has 60 days to cure.',
  '14. Completion. The Seller must deliver the share certificates.',
];
const v3 = [
  '5. Disputes. Party B may dispute a determination within three Business Days.',
  '6. Escrow. Interest accrues for the benefit of the Seller.',
  '11. Termination.',
  '(a) Events of Default include failure to pay within five Business Days of notice.',
  '(b) Party B has 30 days to cure.',
  '14. Completion. The Seller must deliver the share certificates and a deed of release.',
];

describe('coverNoteRefs', () => {
  it('reads clause lists, ranges, sub-paragraphs and Schedules', () => {
    expect(coverNoteRefs('See cl 6–7, clauses 18 to 20 and Clause 11(b); Schedule 1.')).toEqual([
      { top: '6' },
      { top: '7' },
      { top: '18' },
      { top: '19' },
      { top: '20' },
      { top: '11', sub: '(b)' },
      { top: 'schedule 1' },
    ]);
  });
});

describe('checkCoverNote', () => {
  const { hunks } = diffDocuments(v2, v3);

  it('flags amendments to clauses the note never mentions', () => {
    const note = 'We accept the escrow position in cl 6. Clause 11(b): cure period of 30 days. Clause 14: deed of release added.';
    expect(hunks.map((h) => h.clause)).toEqual(['cl 5', 'cl 6', 'cl 11(a)', 'cl 11(b)', 'cl 14']);
    expect(checkCoverNote(hunks, note)).toEqual([
      'not-mentioned',
      'mentioned',
      'not-mentioned',
      'mentioned',
      'mentioned',
    ]);
  });

  it('flags a mentioned clause whose changed figure the note leaves out', () => {
    const note = 'Clause 5: dispute process accepted. Clause 11: cure period now 30 days, grace period unchanged.';
    expect(checkCoverNote(hunks, note).slice(0, 4)).toEqual([
      'figure-missing',
      'not-mentioned',
      'figure-missing',
      'mentioned',
    ]);
  });

  it('matches unnumbered amendments by their changed words', () => {
    const plain = diffDocuments(['Draft v2 (Buyer).'], ['Draft v3 (Seller).']).hunks;
    expect(checkCoverNote(plain, 'Updated the draft number.')).toEqual(['not-mentioned']);
    expect(checkCoverNote(plain, 'This is the Seller draft.')).toEqual(['figure-missing']);
    expect(checkCoverNote(plain, 'This is the Seller draft, v3.')).toEqual(['mentioned']);
  });
});
