import type { DocumentDiff } from '../lib/diff/types';

function hunkTone(diff: DocumentDiff, index: number): string {
  const hunk = diff.hunks[index];
  const rows = diff.rows.slice(hunk.rowStart, hunk.rowEnd + 1);
  if (rows.every((r) => r.type === 'added')) return 'bg-added-edge';
  if (rows.every((r) => r.type === 'removed')) return 'bg-removed-edge';
  return 'bg-stamp';
}

interface AmendmentRailProps {
  diff: DocumentDiff;
  activeHunk?: number;
  onSelect: (index: number) => void;
}

/**
 * The margin rule: a legal-pad-style vertical rule representing the whole
 * document, with one tick per amendment. Clicking a tick jumps to it.
 */
export function AmendmentRail({ diff, activeHunk, onSelect }: AmendmentRailProps) {
  const total = Math.max(diff.rows.length, 1);
  return (
    <div
      className="relative hidden w-10 shrink-0 border-r border-rule bg-paper sm:block"
      role="navigation"
      aria-label="Amendment overview"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-stamp/40" />
      {diff.hunks.map((hunk) => {
        const active = hunk.index === activeHunk;
        return (
          <button
            key={hunk.index}
            type="button"
            aria-label={`Go to amendment ${hunk.index + 1}`}
            title={`Amendment ${hunk.index + 1}: ${hunk.summary}`}
            onClick={() => onSelect(hunk.index)}
            style={{ top: `${4 + (hunk.rowStart / total) * 92}%` }}
            className={`absolute -translate-y-1/2 rounded-[1px] transition-all ${hunkTone(diff, hunk.index)} ${
              active
                ? 'left-0.5 right-0.5 h-1.5 shadow-[0_0_0_3px_var(--color-highlighter)]'
                : 'left-2 right-2 h-1 opacity-80 hover:left-1 hover:right-1 hover:opacity-100'
            }`}
          />
        );
      })}
    </div>
  );
}
