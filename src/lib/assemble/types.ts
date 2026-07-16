/** A deal-specific value the user fills in (party name, notional, date…). */
export interface FieldDef {
  id: string;
  label: string;
  type: 'text' | 'party' | 'date' | 'currency' | 'number';
  required: boolean;
}

/** Inline content of a block body. Numbers and references are computed, never stored. */
export type Inline =
  | { t: 'text'; text: string }
  | { t: 'field'; fieldId: string }
  /** `word` overrides the template's reference word for this one reference. */
  | { t: 'ref'; targetId: string; word?: string };

export type LevelStyle = 'decimal' | 'alpha' | 'roman';

/** How a template numbers its blocks and speaks about them. */
export interface NumberingScheme {
  /** Style per nesting depth; the last entry repeats for deeper levels. */
  levels: LevelStyle[];
  /** 'parenthetical' → 1. / (a) / (i), full "1(a)(i)". 'dotted' → 4. / 4.1 / 4.1.1. */
  compose: 'parenthetical' | 'dotted';
  /** The word references render with: Clause, Section, Condition, Article… */
  refWord: string;
}

export interface Block {
  /** Stable identity — numbering may change, the id never does. */
  id: string;
  kind: 'preamble' | 'clause' | 'definition';
  title?: string;
  body: Inline[];
  children: Block[];
  /** Optional blocks can be toggled in/out by the user. */
  optional?: boolean;
  /** Initial toggle state for optional blocks (default: excluded). */
  includedByDefault?: boolean;
}

export interface ContractTemplate {
  id: string;
  name: string;
  fields: FieldDef[];
  blocks: Block[];
  /** Defaults to parenthetical 1./(a)/(i) with "Clause" when omitted. */
  numbering?: NumberingScheme;
}

/** Everything deal-specific, serialisable as a local deal file. */
export interface DealState {
  templateId: string;
  fieldValues: Record<string, string>;
  /** Toggle overrides for optional blocks, keyed by block id. */
  included: Record<string, boolean>;
}

/** One numbered label, e.g. own "(a)" within full "3(a)". */
export interface BlockLabel {
  own: string;
  full: string;
}

/** One styled run within a rendered paragraph, for the live preview. */
export interface ParagraphSegment {
  kind: 'text' | 'field' | 'field-missing' | 'ref' | 'ref-broken';
  text: string;
}

export interface RenderedParagraph {
  blockId: string;
  /** Full label like "3(a)(i)"; empty for unnumbered blocks (preamble). */
  label: string;
  text: string;
  segments: ParagraphSegment[];
}

export interface RenderWarnings {
  /** References whose target is excluded or unknown. */
  brokenRefs: Array<{ fromId: string; targetId: string }>;
  /** Required fields without a value, referenced by included blocks. */
  missingFields: string[];
}

export interface RenderedDocument {
  paragraphs: RenderedParagraph[];
  warnings: RenderWarnings;
}
