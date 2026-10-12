/** A run of text inside one paragraph cell. */
export type SegmentType = 'unchanged' | 'added' | 'removed';

export interface Segment {
  type: SegmentType;
  text: string;
}

/** One aligned row of the side-by-side view. */
export type RowType = 'unchanged' | 'modified' | 'added' | 'removed';

export interface DiffRow {
  type: RowType;
  /** Original-document cell. Absent when the row is a pure addition. */
  left?: Segment[];
  /** Change-document cell. Absent when the row is a pure removal. */
  right?: Segment[];
  /** Index of the change hunk this row belongs to. Absent on unchanged rows. */
  hunkIndex?: number;
}

/** One contiguous edit: the text removed and the text that replaced it (either may be empty). */
export interface WordEdit {
  removed: string;
  added: string;
  /** True when a whole paragraph was added or deleted. */
  paragraph?: boolean;
}

/** A contiguous run of changed rows within one clause — one navigable "change". */
export interface ChangeHunk {
  index: number;
  rowStart: number;
  /** Inclusive end row. */
  rowEnd: number;
  /** Clause reference, e.g. "cl 11(a)" or "Schedule 1", when the document is numbered. */
  clause?: string;
  edits: WordEdit[];
  /** Clause reference and the changed words, e.g. `cl 5: "five" → "three"`. */
  summary: string;
}

export interface DocumentDiff {
  rows: DiffRow[];
  hunks: ChangeHunk[];
}
