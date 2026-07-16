import { computeNumbering } from '../numbering';
import type { Block, ContractTemplate, Inline } from '../types';
import { parseStructure } from './structure';
import type { ImportNote } from './structure';

export type { ImportNote } from './structure';

export interface ImportedContract {
  template: ContractTemplate;
  notes: ImportNote[];
}

const REF_PATTERN = /\b(Clause|Section|Condition|Article|Paragraph)s?\s+(\d+(?:\.\d+)*(?:\([a-z0-9]{1,4}\))*)/g;

/**
 * Turn a flat document (paragraph texts from any parser) into a live
 * ContractTemplate: structure cut into blocks, literal numbers stripped, and
 * textual cross-references linked to their target blocks so they follow any
 * future renumbering. Fields are not auto-created — marking deal-specific
 * values is a review-the-cut step.
 */
export function importContract(paragraphs: string[], name: string): ImportedContract {
  const { blocks, numbering, notes } = parseStructure(paragraphs);
  const labels = computeNumbering(blocks, {}, numbering);
  const idByLabel = new Map<string, string>();
  for (const [blockId, label] of labels) idByLabel.set(label.full, blockId);

  const linkBody = (block: Block): Inline[] =>
    block.body.flatMap((inline): Inline[] => {
      if (inline.t !== 'text') return [inline];
      const out: Inline[] = [];
      let cursor = 0;
      for (const match of inline.text.matchAll(REF_PATTERN)) {
        const [whole, word, label] = match;
        const targetId = idByLabel.get(label);
        if (!targetId) {
          notes.push({
            kind: 'unresolved-ref',
            blockId: block.id,
            message: `Reference "${whole}" does not match any clause in the document.`,
          });
          continue;
        }
        if (match.index > cursor) out.push({ t: 'text', text: inline.text.slice(cursor, match.index) });
        out.push({
          t: 'ref',
          targetId,
          ...(word !== numbering.refWord ? { word } : {}),
        });
        cursor = match.index + whole.length;
      }
      if (cursor < inline.text.length) out.push({ t: 'text', text: inline.text.slice(cursor) });
      return out;
    });

  const linkBlocks = (group: Block[]): Block[] =>
    group.map((block) => ({ ...block, body: linkBody(block), children: linkBlocks(block.children) }));

  const template: ContractTemplate = {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'imported',
    name,
    fields: [],
    blocks: linkBlocks(blocks),
    numbering,
  };
  return { template, notes };
}
