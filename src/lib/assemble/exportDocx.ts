import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import { labelDepth } from './numbering';
import { renderDocument } from './render';
import type { ContractTemplate, DealState } from './types';

const INDENT_PER_LEVEL_TWIPS = 360;

/**
 * Build the Word document for an assembled deal. Clause numbers are baked in
 * as literal text from the computed labels — deterministic output with no
 * reliance on Word's auto-numbering.
 */
export function buildDocxDocument(template: ContractTemplate, deal: DealState): Document {
  const { paragraphs } = renderDocument(template, deal);
  return new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: template.name, bold: true, size: 32 })],
          }),
          ...paragraphs.map(
            (paragraph) =>
              new Paragraph({
                indent: { left: labelDepth(paragraph.label) * INDENT_PER_LEVEL_TWIPS },
                spacing: { after: 200 },
                children: [new TextRun(paragraph.text)],
              }),
          ),
        ],
      },
    ],
  });
}

/** Browser entry point: the assembled deal as a downloadable .docx blob. */
export function exportDocxBlob(template: ContractTemplate, deal: DealState): Promise<Blob> {
  return Packer.toBlob(buildDocxDocument(template, deal));
}
