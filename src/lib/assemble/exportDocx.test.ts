import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import * as mammoth from 'mammoth';
import { buildDocxDocument } from './exportDocx';
import { sampleMsa } from './templates/sampleMsa';
import type { DealState } from './types';

const deal: DealState = {
  templateId: sampleMsa.id,
  fieldValues: {
    party_a: 'Alpha Bank plc',
    party_b: 'Beta Fund LP',
    trade_date: '16 July 2026',
    effective_date: '20 July 2026',
    termination_date: '20 July 2031',
    underlying: 'S&P 500 Index',
    notional: 'USD 25,000,000',
    initial_price: 'USD 5,600.00',
    floating_rate: 'SOFR',
    spread: '85',
    calc_agent: 'Alpha Bank plc',
    gov_law: 'English law',
  },
  included: { rofr: true },
};

async function exportedText(state: DealState): Promise<string> {
  const doc = buildDocxDocument(sampleMsa, state);
  const buffer = await Packer.toBuffer(doc);
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return value;
}

describe('buildDocxDocument', () => {
  it('exports a Word document that round-trips with numbering and field values intact', async () => {
    const text = await exportedText(deal);
    expect(text).toContain('Master Equity Swap Agreement (Sample)');
    expect(text).toContain('between Alpha Bank plc ("Party A") and Beta Fund LP ("Party B")');
    // ROFR toggled in: it takes Clause 7 and Termination shifts to 8.
    expect(text).toContain('7. Right of First Refusal.');
    expect(text).toContain('8. Termination.');
    expect(text).toContain('unless terminated earlier under Clause 8');
    // Nested definitions keep their computed sub-labels.
    expect(text).toContain('(a) "Underlying" means S&P 500 Index');
  });

  it('renders unfilled fields as bullet placeholders when exported with an override', async () => {
    const text = await exportedText({ ...deal, fieldValues: {} });
    expect(text).toContain('[● Party A]');
  });
});
