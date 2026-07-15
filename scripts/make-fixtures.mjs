// Generates sample documents in e2e/fixtures for manual and Playwright testing.
// Run with: node scripts/make-fixtures.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const FIXTURES_DIR = new URL('../e2e/fixtures/', import.meta.url);

const originalParagraphs = [
  'PRUDENTIAL STANDARD CPS 900 — RESOLUTION PLANNING (SAMPLE)',
  'This sample document exists only for testing Redline. It is not a real prudential standard.',
  'Clause 1. An APRA-regulated entity must maintain an information security capability commensurate with the size and extent of threats to its information assets.',
  'Clause 2. The Board of an APRA-regulated entity is ultimately responsible for the information security of the entity.',
  'Clause 3. Where a material information security incident occurs, the entity must notify APRA within 72 hours of becoming aware of the incident.',
  'Clause 4. An entity must test the effectiveness of its information security controls through a systematic testing program.',
  'Clause 5. Internal audit must review the design and operating effectiveness of information security controls at least annually.',
  'Clause 6. This standard applies to all authorised deposit-taking institutions.',
  'Clause 7. Definitions used in this standard take their meaning from the relevant Act.',
  'Clause 8. This standard commences on 1 July 2019.',
];

const changeParagraphs = [
  'PRUDENTIAL STANDARD CPS 900 — RESOLUTION PLANNING (SAMPLE)',
  'This sample document exists only for testing Redline. It is not a real prudential standard.',
  'Clause 1. An APRA-regulated entity must maintain a robust information security capability commensurate with the size and extent of threats to its information assets.',
  'Clause 2. The Board of an APRA-regulated entity is ultimately responsible for the information security of the entity.',
  'Clause 2A. The Board must review the entity’s information security policy at least annually.',
  'Clause 3. Where a material information security incident occurs, the entity must notify APRA within 24 hours of becoming aware of the incident.',
  'Clause 4. An entity must test the effectiveness of its information security controls through a systematic testing program.',
  'Clause 6. This standard applies to all authorised deposit-taking institutions.',
  'Clause 7. Definitions used in this standard take their meaning from the relevant Act.',
  'Clause 8. This standard commences on 1 July 2019.',
];

async function makeDocx(paragraphs, path) {
  const doc = new Document({
    sections: [
      {
        children: paragraphs.map(
          (text) => new Paragraph({ children: [new TextRun(text)] }),
        ),
      },
    ],
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
    y -= fontSize * 1.2; // paragraph gap
  }
  await writeFile(path, await pdf.save());
}

await mkdir(FIXTURES_DIR, { recursive: true });
await makeDocx(originalParagraphs, new URL('original.docx', FIXTURES_DIR));
await makeDocx(changeParagraphs, new URL('change.docx', FIXTURES_DIR));
await makePdf(originalParagraphs, new URL('original.pdf', FIXTURES_DIR));
await makePdf(changeParagraphs, new URL('change.pdf', FIXTURES_DIR));
console.log('Fixtures written to e2e/fixtures/');
