// Generates a long (~110 paragraph) sample document pair with a small number
// of known edits scattered through it — realistic for a circular where most
// of the document is unchanged between iterations.
//
// Run with: node scripts/make-samples.mjs [output-dir]
// Default output: e2e/fixtures/
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const outputDir = process.argv[2] ?? new URL('../e2e/fixtures/', import.meta.url).pathname.slice(1);

const TOPICS = [
  'capital adequacy requirements',
  'liquidity coverage obligations',
  'operational risk controls',
  'outsourcing arrangements with third parties',
  'information security incident response',
  'board oversight and governance',
  'remuneration disclosure obligations',
  'credit risk concentration limits',
  'stress testing and scenario analysis',
  'recovery and resolution planning',
];

function buildOriginal() {
  const paragraphs = [
    'PRUDENTIAL STANDARD CPS 999 — SAMPLE CONSOLIDATED REQUIREMENTS (DUMMY DOCUMENT)',
    'This is a fictional document generated for testing Redline. It has no regulatory effect.',
    'Objectives: This Prudential Standard sets out sample requirements used to demonstrate side-by-side document comparison.',
  ];
  for (let part = 1; part <= 10; part++) {
    paragraphs.push(`Part ${part} — Requirements relating to ${TOPICS[part - 1]}.`);
    for (let clause = 1; clause <= 10; clause++) {
      const n = (part - 1) * 10 + clause;
      paragraphs.push(
        `Clause ${n}. An APRA-regulated entity must, in relation to ${TOPICS[part - 1]}, ` +
          `maintain policies and procedures that are approved by the Board, reviewed at least annually, ` +
          `and commensurate with the size, business mix and complexity of the entity. ` +
          `The entity must retain evidence of compliance with this clause for a period of 7 years.`,
      );
    }
  }
  paragraphs.push('Commencement: This standard commences on 1 January 2027.');
  return paragraphs;
}

/** Apply a small set of known edits — this is the "next iteration" of the circular. */
function buildChange(original) {
  const changed = [...original];

  // Edit 1: word substitution deep in Part 2 (clause 17).
  const c17 = changed.findIndex((p) => p.startsWith('Clause 17.'));
  changed[c17] = changed[c17].replace('reviewed at least annually', 'reviewed at least quarterly');

  // Edit 2: numeric change in Part 5 (clause 43).
  const c43 = changed.findIndex((p) => p.startsWith('Clause 43.'));
  changed[c43] = changed[c43].replace('for a period of 7 years', 'for a period of 10 years');

  // Edit 3: delete clause 61 entirely.
  const c61 = changed.findIndex((p) => p.startsWith('Clause 61.'));
  changed.splice(c61, 1);

  // Edit 4: insert a brand-new clause after clause 78.
  const c78 = changed.findIndex((p) => p.startsWith('Clause 78.'));
  changed.splice(
    c78 + 1,
    0,
    'Clause 78A. Where an entity relies on a material service provider, the entity must notify APRA of any change to that arrangement within 20 business days.',
  );

  // Edit 5: reword the commencement date.
  const last = changed.length - 1;
  changed[last] = 'Commencement: This standard commences on 1 July 2027.';

  return changed;
}

async function makeDocx(paragraphs, path) {
  const doc = new Document({
    sections: [{ children: paragraphs.map((text) => new Paragraph({ children: [new TextRun(text)] })) }],
  });
  await writeFile(path, await Packer.toBuffer(doc));
}

async function makePdf(paragraphs, path) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const margin = 50;
  let page = pdf.addPage();
  let y = page.getHeight() - margin;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    const maxWidth = page.getWidth() - margin * 2;
    let line = '';
    const lines = [];
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);

    for (const textLine of lines) {
      if (y < margin) {
        page = pdf.addPage();
        y = page.getHeight() - margin;
      }
      page.drawText(textLine, { x: margin, y, size: fontSize, font });
      y -= fontSize * 1.3;
    }
    y -= fontSize * 1.2;
  }
  await writeFile(path, await pdf.save());
}

const original = buildOriginal();
const change = buildChange(original);

await mkdir(outputDir, { recursive: true });
await makeDocx(original, join(outputDir, 'long-original.docx'));
await makeDocx(change, join(outputDir, 'long-change.docx'));
await makePdf(original, join(outputDir, 'long-original.pdf'));
await makePdf(change, join(outputDir, 'long-change.pdf'));
console.log(`Long samples (${original.length} paragraphs, 5 known edits) written to ${outputDir}`);
