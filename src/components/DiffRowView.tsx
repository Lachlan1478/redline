import type { DiffRow, Segment } from '../lib/diff/types';

function SegmentSpan({ segment }: { segment: Segment }) {
  if (segment.type === 'added') {
    return <span className="rounded-[2px] bg-added-bg text-added-ink">{segment.text}</span>;
  }
  if (segment.type === 'removed') {
    return (
      <span className="rounded-[2px] bg-removed-bg text-removed-ink line-through decoration-removed-edge/80">
        {segment.text}
      </span>
    );
  }
  return <span>{segment.text}</span>;
}

function Cell({ segments, className }: { segments?: Segment[]; className: string }) {
  return (
    <div
      className={`min-w-0 whitespace-pre-wrap px-7 py-2 font-serif text-[15px] leading-relaxed text-ink ${className}`}
    >
      {segments?.map((segment, i) => <SegmentSpan key={i} segment={segment} />)}
    </div>
  );
}

const LEFT_STYLES: Record<DiffRow['type'], string> = {
  unchanged: '',
  modified: 'bg-removed-bg/25',
  removed: 'bg-removed-bg/40 shadow-[inset_3px_0_0_var(--color-removed-edge)]',
  added: 'placeholder-stripes',
};

const RIGHT_STYLES: Record<DiffRow['type'], string> = {
  unchanged: '',
  modified: 'bg-added-bg/25',
  removed: 'placeholder-stripes-removed',
  added: 'bg-added-bg/40 shadow-[inset_3px_0_0_var(--color-added-edge)]',
};

interface DiffRowViewProps {
  row: DiffRow;
  rowIndex: number;
  active: boolean;
}

export function DiffRowView({ row, rowIndex, active }: DiffRowViewProps) {
  return (
    <div
      id={`row-${rowIndex}`}
      data-row-type={row.type}
      className={`grid grid-cols-2 ${active ? 'flash-highlight shadow-[inset_0_0_0_2px_var(--color-highlighter)]' : ''}`}
    >
      <Cell
        segments={row.left}
        className={`border-r border-rule/70 shadow-[inset_-6px_0_8px_-8px_rgb(35_39_32/0.5)] ${LEFT_STYLES[row.type]}`}
      />
      <Cell
        segments={row.right}
        className={`shadow-[inset_6px_0_8px_-8px_rgb(35_39_32/0.5)] ${RIGHT_STYLES[row.type]}`}
      />
    </div>
  );
}
