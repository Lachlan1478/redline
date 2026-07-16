// Convert a plain-text document (one paragraph per non-empty line) to .docx.
// Usage: node scripts/txt-to-docx.mjs input.txt output.docx
import { readFile, writeFile } from 'node:fs/promises';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const [input, output] = process.argv.slice(2);
const text = await readFile(input, 'utf8');
const paragraphs = text
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const doc = new Document({
  sections: [
    {
      children: paragraphs.map((p) => new Paragraph({ children: [new TextRun(p)] })),
    },
  ],
});
await writeFile(output, await Packer.toBuffer(doc));
console.log(`${output}: ${paragraphs.length} paragraphs`);
