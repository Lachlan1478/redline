// Generates edge-case documents for brute-force testing.
// Run with: node scripts/make-edge-cases.mjs [output-dir]
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  Document,
  Footer,
  FootnoteReferenceRun,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from 'docx';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

const outputDir = process.argv[2] ?? 'e2e/edge-cases';

function clause(n, extra = '') {
  return (
    `Clause ${n}. An APRA-regulated entity must maintain policies and procedures that are ` +
    `approved by the Board, reviewed at least annually, and commensurate with the size, ` +
    `business mix and complexity of the entity${extra}. Evidence of compliance must be retained for 7 years.`
  );
}

/** N paragraphs with 3 edits scattered through the changed copy. */
function sizePair(count) {
  const original = Array.from({ length: count }, (_, i) => clause(i + 1));
  const changed = [...original];
  const midpoints = [Math.floor(count * 0.25), Math.floor(count * 0.5), Math.floor(count * 0.75)];
  for (const i of midpoints) {
    changed[i] = changed[i].replace('reviewed at least annually', 'reviewed at least quarterly');
  }
  return { original, changed };
}

/** Worst case: every single paragraph edited (one giant removed run + added run). */
function fullRewritePair(count) {
  const original = Array.from({ length: count }, (_, i) => clause(i + 1));
  const changed = original.map((p) => p.replace('7 years', '10 years'));
  return { original, changed };
}

async function writeDocx(paragraphs, path, options = {}) {
  const children = paragraphs.map((text, i) => {
    if (options.footnoteEvery && i % options.footnoteEvery === 1) {
      const id = Math.floor(i / options.footnoteEvery) + 1;
      return new Paragraph({
        children: [new TextRun(text), new FootnoteReferenceRun(id)],
      });
    }
    return new Paragraph({ children: [new TextRun(text)] });
  });

  const footnotes = {};
  if (options.footnoteEvery) {
    const count = Math.ceil(paragraphs.length / options.footnoteEvery);
    for (let id = 1; id <= count; id++) {
      footnotes[id] = {
        children: [
          new Paragraph(`Footnote ${id}: see Prudential Practice Guide CPG 999 for guidance.`),
        ],
      };
    }
  }

  const section = { children };
  if (options.headerFooter) {
    section.headers = {
      default: new Header({
        children: [new Paragraph('CPS 999 SAMPLE — CONFIDENTIAL DRAFT — NOT FOR DISTRIBUTION')],
      }),
    };
    section.footers = {
      default: new Footer({
        children: [
          new Paragraph({
            children: [new TextRun('Page '), new TextRun({ children: [PageNumber.CURRENT] })],
          }),
        ],
      }),
    };
  }

  const doc = new Document({
    ...(options.footnoteEvery ? { footnotes } : {}),
    sections: [section],
  });
  await writeFile(path, await Packer.toBuffer(doc));
}

async function writePdf(paragraphs, path, options = {}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 11;
  const margin = 60;
  let pageNumber = 0;
  let page;
  let y = 0;

  const decoratePage = () => {
    pageNumber += 1;
    if (options.headerFooter) {
      page.drawText('CPS 999 SAMPLE — CONFIDENTIAL DRAFT — NOT FOR DISTRIBUTION', {
        x: margin,
        y: page.getHeight() - 30,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText(`Page ${pageNumber}`, {
        x: page.getWidth() / 2 - 15,
        y: 20,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
    if (options.watermark) {
      page.drawText('DRAFT', {
        x: 130,
        y: 220,
        size: 110,
        font: bold,
        color: rgb(0.75, 0.75, 0.75),
        opacity: 0.35,
        rotate: degrees(45),
      });
    }
  };

  const newPage = () => {
    page = pdf.addPage();
    y = page.getHeight() - margin;
    decoratePage();
  };
  newPage();

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
      if (y < margin) newPage();
      page.drawText(textLine, { x: margin, y, size: fontSize, font });
      y -= fontSize * 1.3;
    }
    y -= fontSize * 1.2;
  }
  await writeFile(path, await pdf.save());
}

await mkdir(outputDir, { recursive: true });

// 1. Size series: 1k, 5k, 20k paragraphs.
for (const count of [1000, 5000, 20000]) {
  const { original, changed } = sizePair(count);
  await writeDocx(original, join(outputDir, `size-${count}-original.docx`));
  await writeDocx(changed, join(outputDir, `size-${count}-change.docx`));
  console.log(`size-${count}: ${original.length} paragraphs`);
}

// 2. Full rewrite: every paragraph edited.
{
  const { original, changed } = fullRewritePair(2000);
  await writeDocx(original, join(outputDir, 'rewrite-2000-original.docx'));
  await writeDocx(changed, join(outputDir, 'rewrite-2000-change.docx'));
  console.log('rewrite-2000: every paragraph edited');
}

// 3. Footnotes (.docx): footnote on every third paragraph.
{
  const { original, changed } = sizePair(30);
  await writeDocx(original, join(outputDir, 'footnotes-original.docx'), { footnoteEvery: 3 });
  await writeDocx(changed, join(outputDir, 'footnotes-change.docx'), { footnoteEvery: 3 });
  console.log('footnotes: 30 paragraphs, 10 footnotes each');
}

// 4. Word headers/footers (.docx).
{
  const { original, changed } = sizePair(30);
  await writeDocx(original, join(outputDir, 'headers-original.docx'), { headerFooter: true });
  await writeDocx(changed, join(outputDir, 'headers-change.docx'), { headerFooter: true });
  console.log('headers: 30 paragraphs with page header/footer');
}

// 5. PDF with running headers, page numbers, and a diagonal DRAFT watermark.
{
  const { original, changed } = sizePair(60);
  await writePdf(original, join(outputDir, 'watermark-original.pdf'), {
    headerFooter: true,
    watermark: true,
  });
  await writePdf(changed, join(outputDir, 'watermark-change.pdf'), {
    headerFooter: true,
    watermark: true,
  });
  console.log('watermark: 60-paragraph PDFs with header, page numbers, DRAFT watermark');
}

console.log(`Edge cases written to ${outputDir}`);
