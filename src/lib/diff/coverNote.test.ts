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
  const statuses = (note: string) => checkCoverNote(hunks, note, v3.join('\n')).map((c) => c.status);

  it('splits sub-paragraphs into their own amendments', () => {
    expect(hunks.map((h) => h.clause)).toEqual(['cl 5', 'cl 6', 'cl 11(a)', 'cl 11(b)', 'cl 14']);
  });

  it('flags clauses the note never mentions', () => {
    const note = 'Clause 5: dispute window now three days.\nCl 6: interest now for the benefit of the Seller.\nClause 11(b): cure period of 30 days, down from 60.\nClause 14: deed of release added.';
    expect(statuses(note)).toEqual(['partly-described', 'mentioned', 'not-mentioned', 'mentioned', 'mentioned']);
  });

  it('flags an edit hidden inside a clause the note does discuss', () => {
    const note = 'Clause 5: dispute process accepted, with payments adjusted within three Business Days.\nCl 6–7: escrow position accepted.\nClause 11: cure period now 30 days, down from 60.';
    const checks = checkCoverNote(hunks, note, v3.join('\n'));
    expect(checks.map((c) => c.status).slice(0, 4)).toEqual(['partly-described', 'partly-described', 'undescribed-edit', 'mentioned']);
    expect(checks[2].gaps).toEqual([{ removed: 'three', added: 'five' }]);
  });

  it('matches unnumbered amendments by their changed words', () => {
    const plain = diffDocuments(['Draft v2 (Buyer).'], ['Draft v3 (Seller).']).hunks;
    expect(checkCoverNote(plain, 'Updated the draft number.')[0].status).toBe('not-mentioned');
    expect(checkCoverNote(plain, 'This is the Seller draft, v3.')[0].status).toBe('partly-described');
    expect(checkCoverNote(plain, 'This is the Seller draft, v3 (was v2).')[0].status).toBe('mentioned');
  });
});
