import { describe, it, expect } from 'vitest';
import { documentTitle, importContract } from './index';
import { renderDocument } from '../render';
import { sampleMsa } from '../templates/sampleMsa';
import type { DealState } from '../types';

const emptyDeal = (templateId: string): DealState => ({
  templateId,
  fieldValues: {},
  included: {},
});

describe('importContract — cross-reference linking', () => {
  it('links textual references to their target blocks', () => {
    const { template, notes } = importContract(
      [
        '1. Definitions. Terms are defined here.',
        '2. Payments. Payments are subject to Clause 3(a).',
        '3. Termination. The following apply:',
        '(a) close-out netting under Clause 2;',
        '(b) unresolved references like Clause 99 are flagged.',
      ],
      'Test Agreement',
    );
    const payments = template.blocks[1];
    expect(payments.body).toContainEqual({ t: 'ref', targetId: template.blocks[2].children[0].id });

    const netting = template.blocks[2].children[0];
    expect(netting.body).toContainEqual({ t: 'ref', targetId: template.blocks[1].id });

    expect(notes.some((n) => n.kind === 'unresolved-ref' && n.message.includes('Clause 99'))).toBe(
      true,
    );
  });

  it('re-rendering the linked template reproduces the reference text', () => {
    const { template } = importContract(
      ['1. One. See Clause 2.', '2. Two. See Clause 1.'],
      'Refs',
    );
    const { paragraphs } = renderDocument(template, emptyDeal(template.id));
    expect(paragraphs[0].text).toBe('1. One. See Clause 2.');
    expect(paragraphs[1].text).toBe('2. Two. See Clause 1.');
  });
});

describe('importContract — round trip with the sample agreement', () => {
  it('re-imports its own rendered output and reproduces every paragraph', () => {
    const source = renderDocument(sampleMsa, emptyDeal(sampleMsa.id)).paragraphs.map(
      (p) => p.text,
    );
    const { template } = importContract(source, 'Reimported MSA');
    const roundTripped = renderDocument(template, emptyDeal(template.id)).paragraphs.map(
      (p) => p.text,
    );
    expect(roundTripped).toEqual(source);
  });
});

describe('documentTitle', () => {
  it("takes the agreement's own title from its opening line", () => {
    expect(documentTitle(['SHARE SALE AGREEMENT — Corran Holdings Pty Ltd (Seller) and others.'])).toBe(
      'SHARE SALE AGREEMENT',
    );
    expect(documentTitle(['Master Services Agreement', '1. Definitions.'])).toBe('Master Services Agreement');
  });

  it('declines numbered or overlong opening lines', () => {
    expect(documentTitle(['1. Definitions. In this agreement…'])).toBeUndefined();
    expect(documentTitle(['(a) the Buyer must pay'])).toBeUndefined();
    expect(documentTitle(['x'.repeat(120)])).toBeUndefined();
    expect(documentTitle([])).toBeUndefined();
  });
});
