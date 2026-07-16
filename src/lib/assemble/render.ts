import { computeNumbering, DEFAULT_SCHEME, isIncluded } from './numbering';
import type {
  Block,
  ContractTemplate,
  DealState,
  FieldDef,
  ParagraphSegment,
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
  const scheme = template.numbering ?? DEFAULT_SCHEME;
  const labels = computeNumbering(template.blocks, deal.included, scheme);
  const fieldsById = new Map<string, FieldDef>(template.fields.map((f) => [f.id, f]));
  const paragraphs: RenderedParagraph[] = [];
  const warnings: RenderWarnings = { brokenRefs: [], missingFields: [] };
  const missingSeen = new Set<string>();

  const renderBody = (block: Block): ParagraphSegment[] =>
    block.body.map((inline): ParagraphSegment => {
      switch (inline.t) {
        case 'text':
          return { kind: 'text', text: inline.text };
        case 'field': {
          const value = deal.fieldValues[inline.fieldId]?.trim();
          if (value) return { kind: 'field', text: value };
          const field = fieldsById.get(inline.fieldId);
          if (field && !missingSeen.has(field.id)) {
            missingSeen.add(field.id);
            warnings.missingFields.push(field.id);
          }
          return { kind: 'field-missing', text: `[● ${field?.label ?? inline.fieldId}]` };
        }
        case 'ref': {
          const target = labels.get(inline.targetId);
          if (!target) {
            warnings.brokenRefs.push({ fromId: block.id, targetId: inline.targetId });
            return { kind: 'ref-broken', text: '[missing clause]' };
          }
          return { kind: 'ref', text: `${inline.word ?? scheme.refWord} ${target.full}` };
        }
      }
    });

  const walk = (blocks: Block[]) => {
    for (const block of blocks) {
      if (!isIncluded(block, deal.included)) continue;
      const label = labels.get(block.id);
      const title = block.title ? `${block.title}. ` : '';
      const prefix = label ? `${label.own} ` : '';
      const lead = `${prefix}${title}`;
      const segments: ParagraphSegment[] = [
        ...(lead ? [{ kind: 'text' as const, text: lead }] : []),
        ...renderBody(block),
      ];
      const text = segments.map((s) => s.text).join('').trim();
      if (text) {
        paragraphs.push({ blockId: block.id, label: label?.full ?? '', text, segments });
      }
      walk(block.children);
    }
  };

  walk(template.blocks);
  return { paragraphs, warnings };
}
