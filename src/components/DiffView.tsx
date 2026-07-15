import { useEffect, useMemo, useState } from 'react';
import type { DocumentDiff } from '../lib/diff/types';
import { buildBlocks } from './buildBlocks';
import { DiffRowView } from './DiffRowView';

interface DiffViewProps {
  diff: DocumentDiff;
  originalName: string;
  changeName: string;
  activeHunk?: number;
}

export function DiffView({ diff, originalName, changeName, activeHunk }: DiffViewProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    setExpanded(new Set());
  }, [diff]);

  const blocks = useMemo(() => buildBlocks(diff), [diff]);

  useEffect(() => {
    if (activeHunk === undefined) return;
    const hunk = diff.hunks[activeHunk];
    if (!hunk) return;
    document
      .getElementById(`row-${hunk.rowStart}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeHunk, diff]);

  const renderRows = (start: number, end: number) =>
    diff.rows
      .slice(start, end + 1)
      .map((row, offset) => (
        <DiffRowView
          key={start + offset}
          row={row}
          rowIndex={start + offset}
          active={row.hunkIndex !== undefined && row.hunkIndex === activeHunk}
        />
      ));

  return (
    <div data-testid="diff-view">
      <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="truncate border-r border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Original — {originalName}
        </div>
        <div className="truncate px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Change — {changeName}
        </div>
      </div>
      {blocks.map((block) =>
        block.kind === 'rows' || expanded.has(block.start) ? (
          renderRows(block.start, block.end)
        ) : (
          <button
            key={`collapsed-${block.start}`}
            type="button"
            onClick={() => setExpanded(new Set([...expanded, block.start]))}
            className="block w-full border-y border-slate-200 bg-slate-100 px-4 py-1.5 text-center text-xs font-medium text-slate-500 hover:bg-slate-200"
          >
            ⋯ {block.end - block.start + 1} unchanged paragraphs — click to expand ⋯
          </button>
        ),
      )}
    </div>
  );
}
