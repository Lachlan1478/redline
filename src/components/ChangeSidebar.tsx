import { useEffect, useState } from 'react';
import { amendmentSummary } from '../lib/diff/summary';
import type { ChangeHunk } from '../lib/diff/types';

interface ChangeSidebarProps {
  hunks: ChangeHunk[];
  activeHunk?: number;
  onSelect: (index: number) => void;
  /** Document names used in the copyable amendment summary. */
  leftName?: string;
  rightName?: string;
}

export function ChangeSidebar({
  hunks,
  activeHunk,
  onSelect,
  leftName = 'Original',
  rightName = 'Change',
}: ChangeSidebarProps) {
  const current = activeHunk ?? 0;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(amendmentSummary(hunks, leftName, rightName));
      setCopied(true);
    } catch {
      // Clipboard unavailable — leave the button state unchanged.
    }
  };
  return (
    <aside className="flex shrink-0 flex-col border-b border-line bg-page md:w-72 md:border-b-0 md:border-r">
      <div className="flex items-center gap-3 px-4 py-2 md:block md:border-b md:border-line md:pb-3 md:pt-4">
        <h2 className="eyebrow hidden md:block">Index of amendments</h2>
        <div className="flex flex-1 items-center gap-2 md:mt-2">
          <span className="flex-1 font-mono text-sm text-ink" data-testid="change-counter">
            {hunks.length === 0 ? 'No changes' : `Change ${current + 1} of ${hunks.length}`}
          </span>
          <button
            type="button"
            aria-label="Previous change"
            disabled={hunks.length === 0 || current === 0}
            onClick={() => onSelect(current - 1)}
            className="btn h-7 w-7 p-0"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Next change"
            disabled={hunks.length === 0 || current >= hunks.length - 1}
            onClick={() => onSelect(current + 1)}
            className="btn h-7 w-7 p-0"
          >
            ↓
          </button>
        </div>
      </div>
      <ol className="hidden flex-1 overflow-y-auto py-1 md:block">
        {hunks.map((hunk) => {
          const active = hunk.index === activeHunk;
          return (
            <li key={hunk.index}>
              <button
                type="button"
                onClick={() => onSelect(hunk.index)}
                className={`block w-full px-4 py-2.5 text-left ${
                  active
                    ? 'bg-card shadow-[inset_3px_0_0_var(--color-dawn)]'
                    : 'hover:bg-hover'
                }`}
              >
                <span className="flex items-baseline justify-between font-mono text-[11px] text-ink-soft">
                  <span className={active ? 'font-medium text-dawn' : ''}>
                    Amdt {String(hunk.index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    ¶ {hunk.rowStart + 1}
                    {hunk.rowEnd > hunk.rowStart ? `–${hunk.rowEnd + 1}` : ''}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[13px] leading-snug text-ink">
                  {hunk.summary}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="px-4 pb-2 md:border-t md:border-line md:py-3">
        <button
          type="button"
          data-testid="copy-summary"
          onClick={() => void handleCopySummary()}
          disabled={hunks.length === 0}
          className="btn w-full md:mb-2"
        >
          {copied ? 'Copied ✓' : 'Copy amendment summary'}
        </button>
        <p className="hidden text-[11px] leading-snug text-ink-soft md:block">
          Documents are parsed and compared entirely in your browser — nothing is uploaded.
        </p>
      </div>
    </aside>
  );
}
