// One-off: a small contract with placeholders for import testing.
import { writeFile } from 'node:fs/promises';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const paragraphs = [
  'FACILITY AGREEMENT (TEST)',
  'This Agreement is made between [● Lender] and Alpha Corp Pty Ltd as borrower.',
  '1. Definitions. In this Agreement:',
  '(a) "Facility" means the loan facility described in Clause 2.',
  '(b) "Maturity Date" means [● Maturity Date].',
  '2. The Facility. The Lender makes available to Alpha Corp Pty Ltd a facility of [● Facility Amount].',
  '3. Repayment. Alpha Corp Pty Ltd shall repay the Facility on the Maturity Date in accordance with Clause 2 and Clause 4(a).',
  '4. Miscellaneous. The following apply:',
  '(a) notices must be in writing;',
  '(b) this Agreement is governed by the law specified in Clause 99.',
];

const doc = new Document({
  sections: [
    {
      children: paragraphs.map((text) => new Paragraph({ children: [new TextRun(text)] })),
    },
  ],
});
await writeFile('C:/Users/User/OneDrive/redline-edge/import-test.docx', await Packer.toBuffer(doc));
console.log('written');
