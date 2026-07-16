import type { Block, ContractTemplate, FieldDef, Inline } from '../types';

/**
 * Explicit placeholder shapes found in circulated drafts:
 * `[● Party A]`, bare `[●]`, runs of underscores, and `[Bracketed Label]`.
 * Citation-style brackets (`[2019] UKSC 1`) are digits-led and excluded.
 */
const PLACEHOLDER = /\[●\s*([^\]]*)\]|(_{3,})|\[([A-Za-z][A-Za-z ]{1,40})\]/g;

function guessType(label: string): FieldDef['type'] {
  const lower = label.toLowerCase();
  if (/\bdate\b/.test(lower)) return 'date';
  if (/\b(amount|price|notional|fee|premium|consideration)\b/.test(lower)) return 'currency';
  if (/\b(rate|spread|percentage|number)\b/.test(lower)) return 'number';
  if (/\b(party|purchaser|seller|issuer|lessor|lessee|guarantor|borrower|lender|agent|bank|name)\b/.test(lower)) {
    return 'party';
  }
  return 'text';
}

function fieldIdFor(label: string): string {
  return `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
}

interface SplitResult {
  inlines: Inline[];
  changed: boolean;
}

function splitTextByPlaceholders(
  text: string,
  ensureField: (label: string) => FieldDef,
  nextBlankLabel: () => string,
): SplitResult {
  const inlines: Inline[] = [];
  let cursor = 0;
  let changed = false;
  for (const match of text.matchAll(PLACEHOLDER)) {
    const label = (match[1] ?? '').trim() || (match[3] ?? '').trim() || nextBlankLabel();
    const field = ensureField(label);
    if (match.index > cursor) inlines.push({ t: 'text', text: text.slice(cursor, match.index) });
    inlines.push({ t: 'field', fieldId: field.id });
    cursor = match.index + match[0].length;
    changed = true;
  }
  if (cursor < text.length) inlines.push({ t: 'text', text: text.slice(cursor) });
  return { inlines, changed };
}

/**
 * Auto-detect explicit placeholders across an imported template and convert
 * them into fields. Distinct labels share one field wherever they recur.
 */
export function detectPlaceholderFields(template: ContractTemplate): {
  template: ContractTemplate;
  detected: FieldDef[];
} {
  const fields = new Map<string, FieldDef>(template.fields.map((f) => [f.id, f]));
  const detected: FieldDef[] = [];
  let blankCount = 0;

  const ensureField = (label: string): FieldDef => {
    const id = fieldIdFor(label);
    const existing = fields.get(id);
    if (existing) return existing;
    const field: FieldDef = { id, label, type: guessType(label), required: true };
    fields.set(id, field);
    detected.push(field);
    return field;
  };
  const nextBlankLabel = () => `Blank ${++blankCount}`;

  const walk = (blocks: Block[]): Block[] =>
    blocks.map((block) => ({
      ...block,
      body: block.body.flatMap((inline) => {
        if (inline.t !== 'text') return [inline];
        return splitTextByPlaceholders(inline.text, ensureField, nextBlankLabel).inlines;
      }),
      children: walk(block.children),
    }));

  const blocks = walk(template.blocks);
  return {
    template: { ...template, blocks, fields: [...fields.values()] },
    detected,
  };
}

/** Build a FieldDef for a user-marked label, with the type guessed from it. */
export function makeFieldDef(label: string): FieldDef {
  return { id: fieldIdFor(label), label, type: guessType(label), required: true };
}

/**
 * "Make this a field": replace every exact occurrence of `text` across the
 * template with a field token. Returns the input template untouched when the
 * text is not found.
 */
export function markField(
  template: ContractTemplate,
  text: string,
  field: FieldDef,
): { template: ContractTemplate; occurrences: number } {
  const needle = text.trim();
  if (!needle) return { template, occurrences: 0 };
  let occurrences = 0;

  const splitText = (value: string): Inline[] => {
    const inlines: Inline[] = [];
    let cursor = 0;
    let at = value.indexOf(needle);
    while (at !== -1) {
      if (at > cursor) inlines.push({ t: 'text', text: value.slice(cursor, at) });
      inlines.push({ t: 'field', fieldId: field.id });
      occurrences += 1;
      cursor = at + needle.length;
      at = value.indexOf(needle, cursor);
    }
    if (cursor < value.length) inlines.push({ t: 'text', text: value.slice(cursor) });
    return inlines;
  };

  const walk = (blocks: Block[]): Block[] =>
    blocks.map((block) => ({
      ...block,
      body: block.body.flatMap((inline) => (inline.t === 'text' ? splitText(inline.text) : [inline])),
      children: walk(block.children),
    }));

  const blocks = walk(template.blocks);
  if (occurrences === 0) return { template, occurrences: 0 };
  const fields = template.fields.some((f) => f.id === field.id)
    ? template.fields
    : [...template.fields, field];
  return { template: { ...template, blocks, fields }, occurrences };
}
