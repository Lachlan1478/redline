import { describe, it, expect } from 'vitest';
import { parseStructure } from './structure';
import type { Block } from '../types';

function shape(blocks: Block[]): unknown[] {
  return blocks.map((b) => ({
    kind: b.kind,
    ...(b.title ? { title: b.title } : {}),
    ...(b.children.length ? { children: shape(b.children) } : {}),
  }));
}

describe('parseStructure — parenthetical documents', () => {
  it('builds a tree from numbered clauses with alpha and roman sub-levels', () => {
    const { blocks } = parseStructure([
      'This agreement is made between the parties.',
      '1. Definitions. In this Agreement the following terms apply:',
      '(a) "Notes" means the securities described herein.',
      '(b) "Issuer" means the party issuing the Notes.',
      '(i) including any successor issuer;',
      '(ii) and any substitute issuer.',
      '(c) "Holder" means a registered holder.',
      '2. Payments. All amounts are payable in full.',
    ]);
    expect(shape(blocks)).toEqual([
      { kind: 'preamble' },
      {
        kind: 'clause',
        title: 'Definitions',
        children: [
          { kind: 'clause' },
          { kind: 'clause', children: [{ kind: 'clause' }, { kind: 'clause' }] },
          { kind: 'clause' },
        ],
      },
      { kind: 'clause', title: 'Payments' },
    ]);
  });

  it('treats (i) after (h) as alpha continuation, not a new roman level', () => {
    const paragraphs = [
      '1. List. The following apply:',
      ...'abcdefgh'.split('').map((letter) => `(${letter}) item ${letter};`),
      '(i) item i;',
      '(j) item j.',
    ];
    const { blocks } = parseStructure(paragraphs);
    expect(blocks[0].children).toHaveLength(10);
    expect(blocks[0].children.every((c) => c.children.length === 0)).toBe(true);
  });

  it('strips the literal numbers so numbering is recomputed', () => {
    const { blocks } = parseStructure(['5. Payments. Pay promptly.', '(a) In cash only.']);
    expect(blocks[0].body.map((s) => (s.t === 'text' ? s.text : '')).join('')).toBe(
      'Pay promptly.',
    );
    expect(blocks[0].children[0].body).toEqual([{ t: 'text', text: 'In cash only.' }]);
  });

  it('flags clauses whose literal number disagrees with the recomputed sequence', () => {
    const { notes } = parseStructure([
      '1. First. Alpha.',
      '3. Third. The document skips clause two.',
    ]);
    expect(notes.some((n) => n.kind === 'renumbered')).toBe(true);
  });

  it('recognises ALL-CAPS lines as unnumbered part headings', () => {
    const { blocks } = parseStructure([
      'PART 1 — GENERAL PROVISIONS',
      '1. Status. The Notes are senior.',
      'PART 2 — PAYMENTS',
      '2. Interest. Interest accrues daily.',
    ]);
    expect(shape(blocks)).toEqual([
      { kind: 'preamble', title: 'PART 1 — GENERAL PROVISIONS' },
      { kind: 'clause', title: 'Status' },
      { kind: 'preamble', title: 'PART 2 — PAYMENTS' },
      { kind: 'clause', title: 'Interest' },
    ]);
  });
});

describe('parseStructure — dotted documents', () => {
  it('builds nesting from dotted paths and detects the dotted scheme', () => {
    const { blocks, numbering } = parseStructure([
      '1. Interpretation. Definitions follow.',
      '2. Conditions Precedent. Completion is conditional on:',
      '2.1 receipt of regulatory approvals;',
      '2.2 no material adverse change, including:',
      '2.2.1 any insolvency event;',
      '2.2.2 any market disruption.',
      '3. Completion. Completion occurs at the offices of the Seller.',
    ]);
    expect(numbering.compose).toBe('dotted');
    expect(shape(blocks)).toEqual([
      { kind: 'clause', title: 'Interpretation' },
      {
        kind: 'clause',
        title: 'Conditions Precedent',
        children: [{ kind: 'clause' }, { kind: 'clause', children: [{ kind: 'clause' }, { kind: 'clause' }] }],
      },
      { kind: 'clause', title: 'Completion' },
    ]);
  });

  it('detects the dominant reference word', () => {
    const { numbering } = parseStructure([
      '1. Interest. Interest accrues as set out in Condition 2.',
      '2. Payments. Payments follow Condition 1 and Condition 3.',
      '3. Notices. See Condition 1.',
    ]);
    expect(numbering.refWord).toBe('Condition');
  });

  it('does not mistake ordinary prose sentences for clause titles', () => {
    const { blocks } = parseStructure(['1. Payments are subject to netting. More text.']);
    expect(blocks[0].title).toBeUndefined();
    expect(blocks[0].body[0]).toEqual({
      t: 'text',
      text: 'Payments are subject to netting. More text.',
    });
  });
});
