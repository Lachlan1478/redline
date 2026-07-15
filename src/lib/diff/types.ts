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

/** A contiguous run of changed rows — one navigable "change". */
export interface ChangeHunk {
  index: number;
  rowStart: number;
  /** Inclusive end row. */
  rowEnd: number;
  /** Short excerpt used as a label in the sidebar. */
  summary: string;
}

export interface DocumentDiff {
  rows: DiffRow[];
  hunks: ChangeHunk[];
}
