import type { DiffRow, Segment } from '../lib/diff/types';

function SegmentSpan({ segment }: { segment: Segment }) {
  if (segment.type === 'added') {
    return <span className="rounded-sm bg-green-200/80 text-green-950">{segment.text}</span>;
  }
  if (segment.type === 'removed') {
    return (
      <span className="rounded-sm bg-red-200/70 text-red-950 line-through decoration-red-700/60">
        {segment.text}
      </span>
    );
  }
  return <span>{segment.text}</span>;
}

function Cell({ segments, className }: { segments?: Segment[]; className: string }) {
  return (
    <div className={`min-w-0 whitespace-pre-wrap border-b border-slate-100 px-4 py-1.5 text-sm leading-relaxed ${className}`}>
      {segments?.map((segment, i) => <SegmentSpan key={i} segment={segment} />)}
    </div>
  );
}

const LEFT_STYLES: Record<DiffRow['type'], string> = {
  unchanged: 'text-slate-700',
  modified: 'bg-red-50/60 text-slate-800',
  removed: 'bg-red-50 text-slate-800 border-l-2 border-l-red-400',
  added: 'placeholder-stripes',
};

const RIGHT_STYLES: Record<DiffRow['type'], string> = {
  unchanged: 'text-slate-700',
  modified: 'bg-green-50/60 text-slate-800',
  removed: 'placeholder-stripes-removed',
  added: 'bg-green-50 text-slate-800 border-l-2 border-l-green-500',
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
      className={`grid grid-cols-2 ${active ? 'ring-2 ring-inset ring-amber-400' : ''}`}
    >
      <Cell segments={row.left} className={`border-r border-slate-200 ${LEFT_STYLES[row.type]}`} />
      <Cell segments={row.right} className={RIGHT_STYLES[row.type]} />
    </div>
  );
}
