import { describe, it, expect } from 'vitest';
import { renderDocument } from './render';
import type { Block, ContractTemplate, DealState, Inline } from './types';

/**
 * Integration tests: four realistic document shapes, one per user persona.
 * Each exercises the engine the way that desk's documents actually work.
 */

const text = (t: string): Inline => ({ t: 'text', text: t });
const field = (fieldId: string): Inline => ({ t: 'field', fieldId });
const ref = (targetId: string, word?: string): Inline => ({ t: 'ref', targetId, word });

const clause = (
  id: string,
  title: string,
  body: Inline[],
  children: Block[] = [],
  extra: Partial<Block> = {},
): Block => ({ id, kind: 'clause', title, body, children, ...extra });

const deal = (templateId: string, over: Partial<DealState> = {}): DealState => ({
  templateId,
  fieldValues: {},
  included: {},
  ...over,
});

const textOf = (docParas: { blockId: string; text: string }[], blockId: string) =>
  docParas.find((p) => p.blockId === blockId)?.text ?? '';

// ── Corporate Law: share purchase agreement ─────────────────────────────────
// Dotted multi-level numbering (4.1, 4.1.1), recitals, a conditions-precedent
// section where optional conditions slot in, and cross-references that must
// track dotted labels.

const spa: ContractTemplate = {
  id: 'spa',
  name: 'Share Purchase Agreement (Sample)',
  numbering: { levels: ['decimal', 'decimal', 'decimal'], compose: 'dotted', refWord: 'Clause' },
  fields: [
    { id: 'purchaser', label: 'Purchaser', type: 'party', required: true },
    { id: 'seller', label: 'Seller', type: 'party', required: true },
    { id: 'price', label: 'Purchase Price', type: 'currency', required: true },
  ],
  blocks: [
    {
      id: 'recitals',
      kind: 'preamble',
      body: [text('WHEREAS '), field('seller'), text(' wishes to sell the Shares to '), field('purchaser'), text('.')],
      children: [],
    },
    clause('definitions', 'Definitions', [text('In this Agreement:')], [
      clause('def-shares', '', [text('"Shares" means the entire issued share capital of the Target.')]),
      clause('def-accounts', '', [text('"Accounts" means the audited accounts of the Target.')]),
    ]),
    clause('sale', 'Sale and Purchase', [
      field('seller'),
      text(' shall sell and '),
      field('purchaser'),
      text(' shall purchase the Shares for '),
      field('price'),
      text('.'),
    ]),
    clause('cp', 'Conditions Precedent', [text('Completion is conditional on:')], [
      clause('cp-reg', '', [text('receipt of all regulatory approvals;')]),
      clause('cp-fin', '', [text('the Purchaser obtaining committed financing;')], [], {
        optional: true,
      }),
      clause('cp-mac', '', [text('no Material Adverse Change having occurred.')]),
    ]),
    clause('warranties', 'Warranties', [
      text('The Seller warrants as at Completion, subject to satisfaction of '),
      ref('cp-reg'),
      text('.'),
    ]),
    clause('completion', 'Completion', [
      text('Completion occurs five Business Days after the last condition in '),
      ref('cp'),
      text(' is satisfied, subject to '),
      ref('cp-mac'),
      text('.'),
    ]),
  ],
};

describe('Corporate Law — share purchase agreement', () => {
  it('numbers with dotted multi-level labels', () => {
    const { paragraphs } = renderDocument(spa, deal('spa'));
    expect(textOf(paragraphs, 'cp')).toMatch(/^3\. Conditions Precedent\./);
    expect(textOf(paragraphs, 'cp-reg')).toMatch(/^3\.1 /);
    expect(textOf(paragraphs, 'cp-mac')).toMatch(/^3\.2 /);
  });

  it('tracks dotted cross-references when an optional condition is toggled in', () => {
    const excluded = renderDocument(spa, deal('spa'));
    expect(textOf(excluded.paragraphs, 'completion')).toContain('subject to Clause 3.2');

    const included = renderDocument(spa, deal('spa', { included: { 'cp-fin': true } }));
    expect(textOf(included.paragraphs, 'cp-fin')).toMatch(/^3\.2 /);
    expect(textOf(included.paragraphs, 'cp-mac')).toMatch(/^3\.3 /);
    expect(textOf(included.paragraphs, 'completion')).toContain('subject to Clause 3.3');
    // The reference to an unmoved condition is untouched.
    expect(textOf(included.paragraphs, 'warranties')).toContain('Clause 3.1');
  });

  it('substitutes party and price fields through recitals and operative clauses', () => {
    const values = { purchaser: 'Project Falcon Bidco Ltd', seller: 'Holdings SA', price: 'EUR 250,000,000' };
    const { paragraphs, warnings } = renderDocument(spa, deal('spa', { fieldValues: values }));
    expect(textOf(paragraphs, 'recitals')).toContain('Holdings SA wishes to sell');
    expect(textOf(paragraphs, 'sale')).toContain('for EUR 250,000,000');
    expect(warnings.missingFields).toEqual([]);
  });
});

// ── Structurer, trading desk: equity swap confirmation ─────────────────────
// Field-dense (a dozen deal terms), 'Section' as the reference word, optional
// dealer-protective clauses (ROFR, substitution) toggled per deal.

const confirmationFields = [
  ['party_a', 'Party A'],
  ['party_b', 'Party B'],
  ['trade_date', 'Trade Date'],
  ['effective_date', 'Effective Date'],
  ['termination_date', 'Termination Date'],
  ['underlying', 'Underlying'],
  ['notional', 'Notional Amount'],
  ['initial_price', 'Initial Price'],
  ['floating_rate', 'Floating Rate Option'],
  ['spread', 'Spread'],
  ['calc_agent', 'Calculation Agent'],
  ['gov_law', 'Governing Law'],
] as const;

const confirmation: ContractTemplate = {
  id: 'eq-conf',
  name: 'Equity Swap Confirmation (Sample)',
  numbering: { levels: ['decimal', 'alpha', 'roman'], compose: 'parenthetical', refWord: 'Section' },
  fields: confirmationFields.map(([id, label]) => ({
    id,
    label,
    type: 'text',
    required: true,
  })),
  blocks: [
    {
      id: 'header',
      kind: 'preamble',
      body: [
        text('This Confirmation between '),
        field('party_a'),
        text(' and '),
        field('party_b'),
        text(' evidences an equity swap on '),
        field('underlying'),
        text(', Trade Date '),
        field('trade_date'),
        text('.'),
      ],
      children: [],
    },
    clause('general', 'General Terms', [
      text('Effective Date: '),
      field('effective_date'),
      text('; Termination Date: '),
      field('termination_date'),
      text('; Notional: '),
      field('notional'),
      text('; Initial Price: '),
      field('initial_price'),
      text('.'),
    ]),
    clause('floating', 'Floating Amounts', [
      text('Floating Rate Option: '),
      field('floating_rate'),
      text(' plus '),
      field('spread'),
      text(', payable per '),
      ref('general'),
      text('.'),
    ]),
    clause('calc', 'Calculation Agent', [field('calc_agent'), text(' shall be Calculation Agent.')]),
    clause('rofr', 'Right of First Refusal', [
      field('party_a'),
      text(' has a right of first refusal over any replacement transaction.'),
    ], [], { optional: true }),
    clause('sub', 'Substitution', [
      text('The Underlying may be substituted subject to '),
      ref('calc'),
      text('.'),
    ], [], { optional: true }),
    clause('law', 'Governing Law', [text('This Confirmation is governed by '), field('gov_law'), text('.')]),
  ],
};

describe('Structurer — equity swap confirmation', () => {
  const values = Object.fromEntries(
    confirmationFields.map(([id, label]) => [id, `«${label}»`]),
  );

  it('populates all twelve deal terms across the document', () => {
    const { paragraphs, warnings } = renderDocument(
      confirmation,
      deal('eq-conf', { fieldValues: values }),
    );
    const whole = paragraphs.map((p) => p.text).join('\n');
    for (const [, label] of confirmationFields) {
      expect(whole).toContain(`«${label}»`);
    }
    expect(warnings.missingFields).toEqual([]);
  });

  it('reports every unfilled term exactly once for export gating', () => {
    const { warnings } = renderDocument(confirmation, deal('eq-conf'));
    expect(warnings.missingFields).toHaveLength(confirmationFields.length);
    expect(new Set(warnings.missingFields).size).toBe(confirmationFields.length);
  });

  it('uses the Section reference word and renumbers when dealer clauses toggle in', () => {
    const base = renderDocument(confirmation, deal('eq-conf', { fieldValues: values }));
    expect(textOf(base.paragraphs, 'floating')).toContain('per Section 1');
    expect(textOf(base.paragraphs, 'law')).toMatch(/^4\./);

    const withBoth = renderDocument(
      confirmation,
      deal('eq-conf', { fieldValues: values, included: { rofr: true, sub: true } }),
    );
    expect(textOf(withBoth.paragraphs, 'rofr')).toMatch(/^4\./);
    expect(textOf(withBoth.paragraphs, 'sub')).toMatch(/^5\./);
    expect(textOf(withBoth.paragraphs, 'sub')).toContain('subject to Section 3');
    expect(textOf(withBoth.paragraphs, 'law')).toMatch(/^6\./);
  });
});

// ── Fixed Income: bond terms & conditions ───────────────────────────────────
// 'Condition' as the reference word, PART headings that group conditions
// without owning a number (numbering runs continuously across parts), and an
// optional issuer call that shifts every later Condition.

const bond: ContractTemplate = {
  id: 'bond-tc',
  name: 'Notes — Terms and Conditions (Sample)',
  numbering: { levels: ['decimal', 'alpha', 'roman'], compose: 'parenthetical', refWord: 'Condition' },
  fields: [
    { id: 'issuer', label: 'Issuer', type: 'party', required: true },
    { id: 'rate', label: 'Rate of Interest', type: 'number', required: true },
  ],
  blocks: [
    {
      id: 'part-general',
      kind: 'preamble',
      title: 'PART 1 — GENERAL',
      body: [],
      children: [
        clause('form', 'Form and Denomination', [text('The Notes are issued by '), field('issuer'), text(' in registered form.')]),
        clause('status', 'Status', [text('The Notes are senior unsecured obligations.')]),
      ],
    },
    {
      id: 'part-payments',
      kind: 'preamble',
      title: 'PART 2 — PAYMENTS',
      body: [],
      children: [
        clause('interest', 'Interest', [
          text('The Notes bear interest at '),
          field('rate'),
          text(' per annum.'),
        ]),
        clause('call', 'Issuer Call', [
          text('The Issuer may redeem the Notes early at par plus accrued interest under '),
          ref('interest'),
          text('.'),
        ], [], { optional: true }),
        clause('events', 'Events of Default', [
          text('Failure to pay amounts due under '),
          ref('interest'),
          text(' or to comply with '),
          ref('call'),
          text(' is an Event of Default.'),
        ]),
      ],
    },
  ],
};

describe('Fixed Income — bond terms and conditions', () => {
  it('numbers continuously across PART headings', () => {
    const { paragraphs } = renderDocument(bond, deal('bond-tc'));
    expect(textOf(paragraphs, 'form')).toMatch(/^1\./);
    expect(textOf(paragraphs, 'status')).toMatch(/^2\./);
    // Part 2's first condition continues the sequence — no restart.
    expect(textOf(paragraphs, 'interest')).toMatch(/^3\./);
  });

  it('references read as Conditions and follow the optional call being added', () => {
    const withCall = renderDocument(bond, deal('bond-tc', { included: { call: true } }));
    expect(textOf(withCall.paragraphs, 'call')).toMatch(/^4\./);
    expect(textOf(withCall.paragraphs, 'events')).toMatch(/^5\./);
    expect(textOf(withCall.paragraphs, 'events')).toContain('under Condition 3');
    expect(textOf(withCall.paragraphs, 'events')).toContain('comply with Condition 4');
  });

  it('flags the dangling reference when the call is excluded', () => {
    const { paragraphs, warnings } = renderDocument(bond, deal('bond-tc'));
    expect(textOf(paragraphs, 'events')).toContain('[missing clause]');
    expect(warnings.brokenRefs).toEqual([{ fromId: 'events', targetId: 'call' }]);
  });
});

// ── Asset Finance: aircraft operating lease ─────────────────────────────────
// Per-asset sections built as unnumbered group headings, cross-asset
// references, and a per-reference word override.

const lease: ContractTemplate = {
  id: 'lease',
  name: 'Aircraft Operating Lease (Sample)',
  fields: [
    { id: 'lessor', label: 'Lessor', type: 'party', required: true },
    { id: 'lessee', label: 'Lessee', type: 'party', required: true },
    { id: 'msn_1', label: 'Aircraft 1 MSN', type: 'text', required: true },
    { id: 'msn_2', label: 'Aircraft 2 MSN', type: 'text', required: true },
  ],
  blocks: [
    {
      id: 'aircraft-1',
      kind: 'preamble',
      title: 'AIRCRAFT 1',
      body: [],
      children: [
        clause('ac1-delivery', 'Delivery', [text('Lessor shall deliver MSN '), field('msn_1'), text(' at the Delivery Location.')]),
        clause('ac1-redelivery', 'Redelivery', [text('Redelivery conditions for MSN '), field('msn_1'), text(' apply.')]),
      ],
    },
    {
      id: 'aircraft-2',
      kind: 'preamble',
      title: 'AIRCRAFT 2',
      body: [],
      children: [
        clause('ac2-delivery', 'Delivery', [
          text('Delivery of MSN '),
          field('msn_2'),
          text(' follows the process in '),
          ref('ac1-delivery'),
          text('.'),
        ]),
        clause('ac2-redelivery', 'Redelivery', [
          text('As per '),
          ref('ac1-redelivery', 'Paragraph'),
          text(', mutatis mutandis.'),
        ]),
      ],
    },
    clause('quiet', 'Quiet Enjoyment', [
      text('So long as no Event of Default subsists, '),
      field('lessee'),
      text(' shall peaceably use the Aircraft.'),
    ]),
  ],
};

describe('Asset Finance — aircraft operating lease', () => {
  it('numbers per-asset sections continuously and resolves cross-asset references', () => {
    const { paragraphs } = renderDocument(lease, deal('lease'));
    expect(textOf(paragraphs, 'ac1-delivery')).toMatch(/^1\./);
    expect(textOf(paragraphs, 'ac2-delivery')).toMatch(/^3\./);
    expect(textOf(paragraphs, 'quiet')).toMatch(/^5\./);
    expect(textOf(paragraphs, 'ac2-delivery')).toContain('process in Clause 1');
  });

  it('supports a per-reference word override', () => {
    const { paragraphs } = renderDocument(lease, deal('lease'));
    expect(textOf(paragraphs, 'ac2-redelivery')).toContain('As per Paragraph 2');
  });
});
