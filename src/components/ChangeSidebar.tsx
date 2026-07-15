import type { ChangeHunk } from '../lib/diff/types';

interface ChangeSidebarProps {
  hunks: ChangeHunk[];
  activeHunk?: number;
  onSelect: (index: number) => void;
}

export function ChangeSidebar({ hunks, activeHunk, onSelect }: ChangeSidebarProps) {
  const current = activeHunk ?? 0;
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-desk-line/60 bg-desk md:flex">
      <div className="border-b border-desk-line/60 px-4 pb-3 pt-4">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-desk-muted">
          Index of amendments
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex-1 font-mono text-sm text-desk-text" data-testid="change-counter">
            {hunks.length === 0 ? 'No changes' : `Change ${current + 1} of ${hunks.length}`}
          </span>
          <button
            type="button"
            aria-label="Previous change"
            disabled={hunks.length === 0 || current === 0}
            onClick={() => onSelect(current - 1)}
            className="h-7 w-7 rounded-sm border border-desk-line font-mono text-sm text-desk-text hover:bg-desk-deep disabled:opacity-35"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Next change"
            disabled={hunks.length === 0 || current >= hunks.length - 1}
            onClick={() => onSelect(current + 1)}
            className="h-7 w-7 rounded-sm border border-desk-line font-mono text-sm text-desk-text hover:bg-desk-deep disabled:opacity-35"
          >
            ↓
          </button>
        </div>
      </div>
      <ol className="flex-1 overflow-y-auto py-1">
        {hunks.map((hunk) => {
          const active = hunk.index === activeHunk;
          return (
            <li key={hunk.index}>
              <button
                type="button"
                onClick={() => onSelect(hunk.index)}
                className={`block w-full px-4 py-2.5 text-left ${
                  active
                    ? 'bg-desk-deep shadow-[inset_3px_0_0_var(--color-stamp)]'
                    : 'hover:bg-desk-deep/60'
                }`}
              >
                <span className="flex items-baseline gap-1 font-mono text-[11px] tracking-wide text-desk-muted">
                  <span className={active ? 'text-highlighter' : ''}>
                    Amdt {String(hunk.index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 overflow-hidden whitespace-nowrap text-desk-line">
                    ································
                  </span>
                  <span>
                    ¶ {hunk.rowStart + 1}
                    {hunk.rowEnd > hunk.rowStart ? `–${hunk.rowEnd + 1}` : ''}
                  </span>
                </span>
                <span className="mt-1 block truncate font-serif text-[13px] italic leading-snug text-desk-text">
                  {hunk.summary}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="border-t border-desk-line/60 px-4 py-3 text-[11px] leading-snug text-desk-muted">
        Documents are parsed and compared entirely in your browser — nothing is uploaded.
      </p>
    </aside>
  );
}
