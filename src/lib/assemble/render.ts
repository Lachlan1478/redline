import { computeNumbering, isIncluded } from './numbering';
import type {
  Block,
  ContractTemplate,
  DealState,
  FieldDef,
  RenderedDocument,
  RenderedParagraph,
  RenderWarnings,
} from './types';

/**
 * Render a template plus deal state into the flat paragraph stream shown in
 * the preview, exported to Word, and fed to the diff engine for the deviation
 * redline. All numbering and cross-references are resolved here, at render
 * time; broken references and missing required fields are surfaced as
 * warnings, never silently dropped.
 */
export function renderDocument(template: ContractTemplate, deal: DealState): RenderedDocument {
  const labels = computeNumbering(template.blocks, deal.included);
  const fieldsById = new Map<string, FieldDef>(template.fields.map((f) => [f.id, f]));
  const paragraphs: RenderedParagraph[] = [];
  const warnings: RenderWarnings = { brokenRefs: [], missingFields: [] };
  const missingSeen = new Set<string>();

  const renderBody = (block: Block): string =>
    block.body
      .map((inline) => {
        switch (inline.t) {
          case 'text':
            return inline.text;
          case 'field': {
            const value = deal.fieldValues[inline.fieldId]?.trim();
            if (value) return value;
            const field = fieldsById.get(inline.fieldId);
            if (field && !missingSeen.has(field.id)) {
              missingSeen.add(field.id);
              warnings.missingFields.push(field.id);
            }
            return `[● ${field?.label ?? inline.fieldId}]`;
          }
          case 'ref': {
            const target = labels.get(inline.targetId);
            if (!target) {
              warnings.brokenRefs.push({ fromId: block.id, targetId: inline.targetId });
              return '[missing clause]';
            }
            return `Clause ${target.full}`;
          }
        }
      })
      .join('');

  const walk = (blocks: Block[]) => {
    for (const block of blocks) {
      if (!isIncluded(block, deal.included)) continue;
      const label = labels.get(block.id);
      const title = block.title ? `${block.title}. ` : '';
      const prefix = label ? `${label.own} ` : '';
      const text = `${prefix}${title}${renderBody(block)}`.trim();
      if (text) {
        paragraphs.push({ blockId: block.id, label: label?.full ?? '', text });
      }
      walk(block.children);
    }
  };

  walk(template.blocks);
  return { paragraphs, warnings };
}
