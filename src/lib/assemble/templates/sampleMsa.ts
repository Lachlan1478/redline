import type { Block, ContractTemplate, Inline } from '../types';

// Fictional sample agreement. Any resemblance to real ISDA documentation is
// intentional only in *shape* — the text is invented for demonstration.

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

const sub = (id: string, body: Inline[], extra: Partial<Block> = {}): Block => ({
  id,
  kind: 'clause',
  body,
  children: [],
  ...extra,
});

export const sampleMsa: ContractTemplate = {
  id: 'sample-msa',
  name: 'Master Equity Swap Agreement (Sample)',
  numbering: { levels: ['decimal', 'alpha', 'roman'], compose: 'parenthetical', refWord: 'Clause' },
  fields: [
    { id: 'party_a', label: 'Party A', type: 'party', required: true },
    { id: 'party_b', label: 'Party B', type: 'party', required: true },
    { id: 'trade_date', label: 'Trade Date', type: 'date', required: true },
    { id: 'effective_date', label: 'Effective Date', type: 'date', required: true },
    { id: 'termination_date', label: 'Termination Date', type: 'date', required: true },
    { id: 'underlying', label: 'Underlying', type: 'text', required: true },
    { id: 'notional', label: 'Notional Amount', type: 'currency', required: true },
    { id: 'initial_price', label: 'Initial Price', type: 'currency', required: true },
    { id: 'floating_rate', label: 'Floating Rate Option', type: 'text', required: true },
    { id: 'spread', label: 'Spread', type: 'number', required: true },
    { id: 'calc_agent', label: 'Calculation Agent', type: 'party', required: true },
    { id: 'gov_law', label: 'Governing Law', type: 'text', required: false },
  ],
  blocks: [
    {
      id: 'preamble',
      kind: 'preamble',
      body: [
        text('This Master Equity Swap Agreement is dated as of '),
        field('trade_date'),
        text(' and entered into between '),
        field('party_a'),
        text(' ("Party A") and '),
        field('party_b'),
        text(' ("Party B"), together the "Parties".'),
      ],
      children: [],
    },
    clause('definitions', 'Definitions', [text('In this Agreement:')], [
      sub('def-underlying', [
        text('"Underlying" means '),
        field('underlying'),
        text(', as adjusted under '),
        ref('adjustments'),
        text('.'),
      ]),
      sub('def-notional', [
        text('"Notional Amount" means '),
        field('notional'),
        text(' or such other amount agreed in writing.'),
      ]),
      sub('def-valuation', [
        text('"Valuation Time" means the scheduled close of trading on the relevant exchange.'),
      ]),
    ]),
    clause('term', 'Term', [
      text('This Agreement takes effect on '),
      field('effective_date'),
      text(' and, unless terminated earlier under '),
      ref('termination'),
      text(', continues to '),
      field('termination_date'),
      text('.'),
    ]),
    clause('payments', 'Payments', [text('The Parties shall make the following payments:')], [
      sub('pay-equity', [
        text('Party A shall pay the Equity Amount, determined by reference to the performance of the Underlying from the Initial Price of '),
        field('initial_price'),
        text('.'),
      ]),
      sub('pay-floating', [
        text('Party B shall pay the Floating Amount at '),
        field('floating_rate'),
        text(' plus a spread of '),
        field('spread'),
        text(' basis points on the Notional Amount.'),
      ]),
      sub('pay-netting', [
        text('Amounts payable on the same date and in the same currency shall be netted.'),
      ]),
    ]),
    clause('dividends', 'Dividend Equivalents', [
      text('Party A shall pay dividend equivalent amounts in respect of the Underlying, subject to the withholding provisions in '),
      ref('taxes'),
      text('.'),
    ]),
    clause('adjustments', 'Adjustments', [
      text('The Calculation Agent, being '),
      field('calc_agent'),
      text(', shall determine adjustments for corporate actions affecting the Underlying in a commercially reasonable manner.'),
    ]),
    clause('taxes', 'Taxes', [
      text('Each Party shall make payments free of withholding unless required by law.'),
    ]),
    clause('rofr', 'Right of First Refusal', [
      text('Before entering into any replacement or substantially similar transaction on the Underlying with a third party, Party B shall first offer the transaction to '),
      field('party_a'),
      text(' on the same terms, in accordance with the notice provisions of '),
      ref('notices'),
      text('.'),
    ], [], { optional: true }),
    clause('keyperson', 'Key Person', [
      text('If any Key Person ceases to devote substantially all business time to the management of Party B, Party A may terminate under '),
      ref('termination'),
      text(' on five Business Days’ notice.'),
    ], [], { optional: true }),
    clause('substitution', 'Substitution of Underlying', [
      text('Party B may request substitution of the Underlying; any substitution takes effect only upon written consent of Party A and confirmation by the Calculation Agent under '),
      ref('adjustments'),
      text('.'),
    ], [], { optional: true }),
    clause('etf', 'Early Termination Fee', [
      text('If Party B designates an Early Termination Date other than following an Event of Default, Party B shall pay a fee equal to 0.25 per cent of the Notional Amount in addition to amounts due under '),
      ref('termination'),
      text('.'),
    ], [], { optional: true }),
    clause('termination', 'Termination', [text('The following termination provisions apply:')], [
      sub('term-events', [
        text('Events of Default include failure to pay within three Business Days of notice, breach of agreement, and insolvency.'),
      ]),
      sub('term-payments', [
        text('On early termination, the Calculation Agent shall determine the close-out amount consistently with '),
        ref('pay-netting'),
        text('.'),
      ]),
    ]),
    clause('notices', 'Notices', [
      text('Notices shall be delivered in writing to the addresses specified by each Party and are effective on receipt.'),
    ]),
    clause('law', 'Governing Law', [
      text('This Agreement is governed by '),
      field('gov_law'),
      text('.'),
    ]),
  ],
};
