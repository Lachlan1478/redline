import { describe, it, expect } from 'vitest';
import { renderDocument } from './render';
import type { ContractTemplate, DealState } from './types';

const template: ContractTemplate = {
  id: 'sample',
  name: 'Sample Agreement',
  fields: [
    { id: 'party_a', label: 'Party A', type: 'party', required: true },
    { id: 'party_b', label: 'Party B', type: 'party', required: true },
    { id: 'gov_law', label: 'Governing Law', type: 'text', required: false },
  ],
  blocks: [
    {
      id: 'pre',
      kind: 'preamble',
      body: [
        { t: 'text', text: 'Agreement between ' },
        { t: 'field', fieldId: 'party_a' },
        { t: 'text', text: ' and ' },
        { t: 'field', fieldId: 'party_b' },
        { t: 'text', text: '.' },
      ],
      children: [],
    },
    {
      id: 'payments',
      kind: 'clause',
      title: 'Payments',
      body: [
        { t: 'text', text: 'Payments are subject to ' },
        { t: 'ref', targetId: 'termination' },
        { t: 'text', text: '.' },
      ],
      children: [],
    },
    {
      id: 'rofr',
      kind: 'clause',
      title: 'Right of First Refusal',
      optional: true,
      body: [
        { t: 'field', fieldId: 'party_a' },
        { t: 'text', text: ' has a right of first refusal.' },
      ],
      children: [],
    },
    {
      id: 'termination',
      kind: 'clause',
      title: 'Termination',
      body: [{ t: 'text', text: 'Either party may terminate.' }],
      children: [],
    },
  ],
};

const deal = (over: Partial<DealState> = {}): DealState => ({
  templateId: 'sample',
  fieldValues: { party_a: 'Alpha Bank plc', party_b: 'Beta Fund LP' },
  included: {},
  ...over,
});

describe('renderDocument', () => {
  it('substitutes field values throughout', () => {
    const { paragraphs } = renderDocument(template, deal());
    expect(paragraphs[0].text).toBe('Agreement between Alpha Bank plc and Beta Fund LP.');
  });

  it('renders unfilled fields as bullet placeholders and reports them once', () => {
    const { paragraphs, warnings } = renderDocument(template, deal({ fieldValues: {} }));
    expect(paragraphs[0].text).toBe('Agreement between [● Party A] and [● Party B].');
    expect(warnings.missingFields).toEqual(['party_a', 'party_b']);
  });

  it('does not report missing fields used only by excluded blocks', () => {
    const { warnings } = renderDocument(template, deal({ fieldValues: { party_b: 'B' } }));
    // party_a appears in the preamble (included) so it is still reported —
    // but only once, despite also appearing in the excluded ROFR clause.
    expect(warnings.missingFields).toEqual(['party_a']);
  });

  it('resolves references to computed labels that follow toggling', () => {
    const excluded = renderDocument(template, deal());
    expect(excluded.paragraphs.find((p) => p.blockId === 'payments')?.text).toBe(
      '1. Payments. Payments are subject to Clause 2.',
    );

    const included = renderDocument(template, deal({ included: { rofr: true } }));
    expect(included.paragraphs.find((p) => p.blockId === 'payments')?.text).toBe(
      '1. Payments. Payments are subject to Clause 3.',
    );
    expect(included.paragraphs.find((p) => p.blockId === 'rofr')?.text).toBe(
      '2. Right of First Refusal. Alpha Bank plc has a right of first refusal.',
    );
  });

  it('marks references to excluded blocks as broken and warns', () => {
    const broken: ContractTemplate = {
      ...template,
      blocks: template.blocks.map((b) =>
        b.id === 'payments'
          ? { ...b, body: [{ t: 'text' as const, text: 'See ' }, { t: 'ref' as const, targetId: 'rofr' }] }
          : b,
      ),
    };
    const { paragraphs, warnings } = renderDocument(broken, deal());
    expect(paragraphs.find((p) => p.blockId === 'payments')?.text).toBe(
      '1. Payments. See [missing clause]',
    );
    expect(warnings.brokenRefs).toEqual([{ fromId: 'payments', targetId: 'rofr' }]);
  });

  it('omits excluded blocks from the paragraph stream', () => {
    const { paragraphs } = renderDocument(template, deal());
    expect(paragraphs.map((p) => p.blockId)).toEqual(['pre', 'payments', 'termination']);
  });

  it('emits styled segments matching the joined text', () => {
    const { paragraphs } = renderDocument(template, deal({ fieldValues: { party_a: 'Alpha' } }));
    const pre = paragraphs.find((p) => p.blockId === 'pre')!;
    expect(pre.segments.map((s) => s.kind)).toEqual([
      'text',
      'field',
      'text',
      'field-missing',
      'text',
    ]);
    expect(pre.segments.map((s) => s.text).join('').trim()).toBe(pre.text);

    const payments = paragraphs.find((p) => p.blockId === 'payments')!;
    expect(payments.segments.some((s) => s.kind === 'ref' && s.text === 'Clause 2')).toBe(true);
  });

  it('exposes labels for anchors and the deviation redline', () => {
    const { paragraphs } = renderDocument(template, deal());
    expect(paragraphs.find((p) => p.blockId === 'pre')?.label).toBe('');
    expect(paragraphs.find((p) => p.blockId === 'termination')?.label).toBe('2');
  });
});
