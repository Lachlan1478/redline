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
  | { t: 'ref'; targetId: string };

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

export interface RenderedParagraph {
  blockId: string;
  /** Full label like "3(a)(i)"; empty for unnumbered blocks (preamble). */
  label: string;
  text: string;
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
