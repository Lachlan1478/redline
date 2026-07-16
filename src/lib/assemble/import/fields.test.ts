import { describe, it, expect } from 'vitest';
import { detectPlaceholderFields, markField } from './fields';
import type { Block, ContractTemplate } from '../types';

const block = (id: string, text: string, children: Block[] = []): Block => ({
  id,
  kind: 'clause',
  body: [{ t: 'text', text }],
  children,
});

const template = (blocks: Block[]): ContractTemplate => ({
  id: 't',
  name: 'T',
  fields: [],
  blocks,
});

describe('detectPlaceholderFields', () => {
  it('turns bullet placeholders into fields, one per distinct label', () => {
    const result = detectPlaceholderFields(
      template([
        block('a', 'This agreement is between [● Party A] and [● Party B].'),
        block('b', 'Notices go to [● Party A] at its registered office.'),
      ]),
    );
    expect(result.template.fields.map((f) => f.label)).toEqual(['Party A', 'Party B']);
    const bodyA = result.template.blocks[0].body;
    expect(bodyA.filter((s) => s.t === 'field')).toHaveLength(2);
    const bodyB = result.template.blocks[1].body;
    expect(bodyB[1]).toMatchObject({ t: 'field' });
    // Same label in two places → same field id.
    const idInA = bodyA.find((s) => s.t === 'field');
    const idInB = bodyB.find((s) => s.t === 'field');
    expect(idInA).toEqual(idInB);
  });

  it('detects underscore blanks and bracketed labels', () => {
    const result = detectPlaceholderFields(
      template([block('a', 'Dated ______ between [Purchaser] and the Seller.')]),
    );
    const labels = result.template.fields.map((f) => f.label);
    expect(labels).toContain('Purchaser');
    expect(labels.some((l) => l.startsWith('Blank'))).toBe(true);
  });

  it('guesses field types from the label', () => {
    const result = detectPlaceholderFields(
      template([
        block('a', 'Trade Date: [● Trade Date]. Notional: [● Notional Amount]. Seller: [● Seller Name].'),
      ]),
    );
    const byLabel = Object.fromEntries(result.template.fields.map((f) => [f.label, f.type]));
    expect(byLabel['Trade Date']).toBe('date');
    expect(byLabel['Notional Amount']).toBe('currency');
    expect(byLabel['Seller Name']).toBe('party');
  });

  it('does not treat citation-style brackets as placeholders', () => {
    const result = detectPlaceholderFields(
      template([block('a', 'As held in Smith v Jones [2019] UKSC 1, the rule applies.')]),
    );
    expect(result.template.fields).toEqual([]);
  });
});

describe('markField', () => {
  const base = template([
    block('a', 'Alpha Bank plc shall pay Beta Fund LP.', [
      block('a1', 'Alpha Bank plc may assign this agreement.'),
    ]),
    block('b', 'Notices to Alpha Bank plc must be in writing.'),
  ]);

  it('replaces every occurrence across the tree with a field token', () => {
    const { template: marked, occurrences } = markField(base, 'Alpha Bank plc', {
      id: 'party_a',
      label: 'Party A',
      type: 'party',
      required: true,
    });
    expect(occurrences).toBe(3);
    expect(marked.fields).toHaveLength(1);
    expect(marked.blocks[0].body[0]).toEqual({ t: 'field', fieldId: 'party_a' });
    expect(marked.blocks[0].children[0].body[0]).toEqual({ t: 'field', fieldId: 'party_a' });
    expect(marked.blocks[1].body[1]).toEqual({ t: 'field', fieldId: 'party_a' });
  });

  it('does not mutate the input template', () => {
    markField(base, 'Alpha Bank plc', { id: 'x', label: 'X', type: 'text', required: false });
    expect(base.fields).toEqual([]);
    expect(base.blocks[0].body[0]).toEqual({
      t: 'text',
      text: 'Alpha Bank plc shall pay Beta Fund LP.',
    });
  });

  it('reports zero occurrences without adding a field', () => {
    const { template: marked, occurrences } = markField(base, 'Nonexistent text', {
      id: 'x',
      label: 'X',
      type: 'text',
      required: false,
    });
    expect(occurrences).toBe(0);
    expect(marked).toBe(base);
  });
});
