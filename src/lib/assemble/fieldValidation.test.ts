import { describe, it, expect } from 'vitest';
import { fieldProblems, parseDate } from './fieldValidation';
import type { FieldDef } from './types';

const fields: FieldDef[] = [
  { id: 'trade', label: 'Trade Date', type: 'date', required: true },
  { id: 'effective', label: 'Effective Date', type: 'date', required: true },
  { id: 'notional', label: 'Notional Amount', type: 'currency', required: true },
  { id: 'spread', label: 'Spread (basis points)', type: 'number', required: true },
];

describe('fieldProblems', () => {
  it('accepts well-formed values', () => {
    expect(
      fieldProblems(fields, { trade: '3 November 2026', effective: '2026-11-05', notional: 'AUD 250,000,000', spread: '65' }),
    ).toEqual(new Map());
  });

  it('reports values that do not fit their type', () => {
    expect(fieldProblems(fields, { trade: 'next Tuesday', notional: 'TBC', spread: '65 basis points' })).toEqual(
      new Map([
        ['trade', 'Expected a date like 16 July 2026'],
        ['notional', 'Expected an amount like AUD 10,000,000'],
        ['spread', 'Expected a number only, e.g. 85'],
      ]),
    );
  });

  it('reports dates out of order', () => {
    expect(fieldProblems(fields, { trade: '5 November 2026', effective: '3 November 2026' })).toEqual(
      new Map([['effective', 'Falls before Trade Date']]),
    );
  });

  it('rejects unknown month names', () => {
    expect(parseDate('3 Novembre 2026')).toBeUndefined();
  });
});
