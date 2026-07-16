import { describe, it, expect } from 'vitest';
import { parseDealFile, serializeDeal } from './dealFile';
import { sampleMsa } from './templates/sampleMsa';
import type { DealState } from './types';

const deal: DealState = {
  templateId: sampleMsa.id,
  fieldValues: { party_a: 'Alpha Bank plc', underlying: 'S&P 500 Index' },
  included: { rofr: true },
};

describe('deal files', () => {
  it('round-trips a deal', () => {
    const restored = parseDealFile(serializeDeal(deal), sampleMsa);
    expect(restored).toEqual(deal);
  });

  it('rejects files for a different template', () => {
    const other = serializeDeal({ ...deal, templateId: 'some-other-template' });
    expect(() => parseDealFile(other, sampleMsa)).toThrow(/different template/i);
  });

  it('rejects files that are not redline deal files', () => {
    expect(() => parseDealFile('{"hello":"world"}', sampleMsa)).toThrow(/deal file/i);
    expect(() => parseDealFile('not json at all', sampleMsa)).toThrow(/deal file/i);
  });

  it('strips unknown field ids and block ids, and non-string values', () => {
    const tampered = JSON.stringify({
      app: 'redline',
      kind: 'deal',
      version: 1,
      templateId: sampleMsa.id,
      fieldValues: { party_a: 'Alpha', bogus_field: 'x', notional: 42 },
      included: { rofr: true, 'not-a-block': true, keyperson: 'yes' },
    });
    const restored = parseDealFile(tampered, sampleMsa);
    expect(restored.fieldValues).toEqual({ party_a: 'Alpha' });
    expect(restored.included).toEqual({ rofr: true });
  });
});
