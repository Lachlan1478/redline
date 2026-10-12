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
    <div data-testid="diff-view" className="bg-card pb-16">
      <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-line bg-card/95 backdrop-blur-sm">
        <div className="eyebrow truncate border-r border-line px-7 py-2.5">
          Original <span className="ml-1 font-mono font-normal normal-case tracking-normal">{originalName}</span>
        </div>
        <div className="eyebrow truncate px-7 py-2.5">
          Change <span className="ml-1 font-mono font-normal normal-case tracking-normal">{changeName}</span>
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
            className="block w-full border-y border-line bg-page px-4 py-1.5 text-center font-mono text-xs text-ink-soft hover:bg-line/60"
          >
            —&ensp;{block.end - block.start + 1} unchanged paragraphs · expand&ensp;—
          </button>
        ),
      )}
    </div>
  );
}
