import { DeletedTextRun, Document, InsertedTextRun, Packer, Paragraph, TextRun } from 'docx';
import { orderedParts } from './wordDiff';
import type { DiffRow, Segment, SegmentType } from './types';

const joined = (segments?: Segment[]) => (segments ?? []).map((s) => s.text).join('');

/** The Change document as a Word file whose differences are real tracked changes the recipient can accept or reject. */
export function buildRedlineDocument(rows: DiffRow[], author = 'Redline', date = new Date().toISOString()): Document {
  let id = 0;
  const run = (type: SegmentType, text: string) => {
    if (type === 'added') return new InsertedTextRun({ text, id: ++id, author, date });
    if (type === 'removed') return new DeletedTextRun({ text, id: ++id, author, date });
    return new TextRun(text);
  };
  const children = rows.map((row) => {
    if (row.type === 'modified') {
      const parts = orderedParts(joined(row.left), joined(row.right));
      return new Paragraph({ children: parts.map((p) => run(p.type, p.text)) });
    }
    const type: SegmentType = row.type === 'unchanged' ? 'unchanged' : row.type;
    return new Paragraph({ children: [run(type, joined(row.right ?? row.left))] });
  });
  return new Document({ sections: [{ children }] });
}

export function exportRedlineBlob(rows: DiffRow[]): Promise<Blob> {
  return Packer.toBlob(buildRedlineDocument(rows));
}
