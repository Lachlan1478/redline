import type { ChangeHunk } from '../lib/diff/types';

interface ChangeSidebarProps {
  hunks: ChangeHunk[];
  activeHunk?: number;
  onSelect: (index: number) => void;
}

export function ChangeSidebar({ hunks, activeHunk, onSelect }: ChangeSidebarProps) {
  const current = activeHunk ?? 0;
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <span className="flex-1 text-sm font-semibold text-slate-700" data-testid="change-counter">
          {hunks.length === 0 ? 'No changes' : `Change ${current + 1} of ${hunks.length}`}
        </span>
        <button
          type="button"
          aria-label="Previous change"
          disabled={hunks.length === 0 || current === 0}
          onClick={() => onSelect(current - 1)}
          className="rounded border border-slate-300 px-2 py-0.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Next change"
          disabled={hunks.length === 0 || current >= hunks.length - 1}
          onClick={() => onSelect(current + 1)}
          className="rounded border border-slate-300 px-2 py-0.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          ↓
        </button>
      </div>
      <ol className="flex-1 overflow-y-auto">
        {hunks.map((hunk) => (
          <li key={hunk.index}>
            <button
              type="button"
              onClick={() => onSelect(hunk.index)}
              className={`block w-full border-b border-slate-100 px-3 py-2 text-left text-xs leading-snug hover:bg-slate-50 ${
                hunk.index === activeHunk ? 'bg-amber-50 border-l-2 border-l-amber-400' : ''
              }`}
            >
              <span className="mb-0.5 block font-semibold text-slate-500">
                #{hunk.index + 1} · ¶ {hunk.rowStart + 1}
                {hunk.rowEnd > hunk.rowStart ? `–${hunk.rowEnd + 1}` : ''}
              </span>
              <span className="block truncate text-slate-700">{hunk.summary}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="border-t border-slate-200 px-3 py-2 text-[11px] leading-snug text-slate-400">
        Documents are parsed and compared entirely in your browser — nothing is uploaded.
      </p>
    </aside>
  );
}
