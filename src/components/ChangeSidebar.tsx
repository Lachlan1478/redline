import { useEffect, useMemo, useState } from 'react';
import type { DraftingNote } from '../lib/drafting';
import { checkCoverNote } from '../lib/diff/coverNote';
import type { CoverStatus } from '../lib/diff/coverNote';
import { describeEdit } from '../lib/diff/diffDocuments';
import { isFigureEdit } from '../lib/diff/materiality';
import type { Flag } from '../lib/diff/materiality';
import { amendmentSummary } from '../lib/diff/summary';
import type { ChangeHunk } from '../lib/diff/types';

interface ChangeSidebarProps {
  hunks: ChangeHunk[];
  activeHunk?: number;
  onSelect: (index: number) => void;
  /** Document names used in the copyable amendment summary. */
  leftName?: string;
  rightName?: string;
  /** Hunk indices whose clause the Change draft reverted to an earlier draft's wording. */
  reverted: ReadonlySet<number>;
  draftingNotes: DraftingNote[];
  /** Full Change text, so the cover-note check can ignore words too common to identify an edit. */
  documentText: string;
  onExportRedline: () => void;
}

const FLAG_CHIPS: Record<Flag, { label: string; className: string }> = {
  figure: { label: 'Figure', className: 'bg-caution/10 text-caution' },
  obligation: { label: 'Obligation', className: 'bg-dawn/10 text-dawn' },
  risk: { label: 'Risk term', className: 'bg-signal/10 text-signal' },
};

const COVER_CHIPS: Record<CoverStatus, { label: string; className: string }> = {
  'not-mentioned': { label: 'Not in cover note', className: 'bg-signal text-white' },
  'undescribed-edit': { label: 'Edit not described', className: 'bg-caution text-white' },
  'partly-described': { label: 'Only partly described', className: 'bg-caution/15 text-caution' },
  mentioned: { label: '✓ In cover note', className: 'text-free' },
};

const chip = 'rounded px-1.5 py-px text-[10px] font-medium';

export function ChangeSidebar({
  hunks,
  activeHunk,
  onSelect,
  leftName = 'Original',
  rightName = 'Change',
  reverted,
  draftingNotes,
  documentText,
  onExportRedline,
}: ChangeSidebarProps) {
  const current = activeHunk ?? 0;
  const [copied, setCopied] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const checks = useMemo(
    () => (coverNote.trim() ? checkCoverNote(hunks, coverNote, documentText) : undefined),
    [hunks, coverNote, documentText],
  );
  const statuses = checks?.map((c) => c.status);
  const problems = hunks.filter((h) => statuses && statuses[h.index] !== 'mentioned');
  const count = (status: CoverStatus) => statuses?.filter((s) => s === status).length ?? 0;
  const nextProblem = problems.find((h) => h.index > current) ?? problems[0];
  const isFlagged = (h: ChangeHunk) =>
    h.flags.length > 0 || reverted.has(h.index) || (statuses !== undefined && statuses[h.index] !== 'mentioned');
  const shown = flaggedOnly ? hunks.filter(isFlagged) : hunks;
  const figures = hunks.flatMap((h) =>
    h.edits.filter(isFigureEdit).map((edit) => ({ hunk: h.index, clause: h.clause, text: describeEdit(edit) })),
  );

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(amendmentSummary(hunks, leftName, rightName));
      setCopied(true);
    } catch {
      // Clipboard unavailable — leave the button state unchanged.
    }
  };

  return (
    <aside className="flex shrink-0 flex-col border-b border-line bg-page md:w-80 md:border-b-0 md:border-r">
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
        <div className="mt-2 hidden gap-2 md:flex">
          <button
            type="button"
            aria-pressed={flaggedOnly}
            onClick={() => setFlaggedOnly(!flaggedOnly)}
            className="btn flex-1 px-2 text-xs"
          >
            Flagged only
          </button>
          <button
            type="button"
            data-testid="toggle-cover-note"
            aria-pressed={coverOpen}
            onClick={() => setCoverOpen(!coverOpen)}
            className="btn flex-1 px-2 text-xs"
          >
            Check cover note
          </button>
        </div>
        {coverOpen && (
          <div className="mt-2 hidden md:block">
            <textarea
              data-testid="cover-note"
              value={coverNote}
              onChange={(event) => setCoverNote(event.target.value)}
              rows={5}
              placeholder="Paste the cover email — theirs, or yours before you send — to see which amendments it doesn't mention."
              className="w-full resize-y rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink placeholder:text-ink-soft/70"
            />
            {statuses && (
              <div className="mt-1 flex items-center gap-2 text-xs" data-testid="cover-summary">
                {problems.length === 0 ? (
                  <span className="text-free">Every amendment is mentioned.</span>
                ) : (
                  <>
                    <span className="flex-1 leading-snug">
                      <span className="font-medium text-signal">{count('not-mentioned')} not mentioned</span>
                      {' · '}
                      <span className="font-medium text-caution">{count('undescribed-edit')} edits not described</span>
                      {' · '}
                      <span className="text-caution">{count('partly-described')} partly</span>
                    </span>
                    <button type="button" className="btn px-2 py-0.5 text-xs" onClick={() => nextProblem && onSelect(nextProblem.index)}>
                      Next issue
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <ol className="hidden flex-1 overflow-y-auto py-1 md:block" data-testid="amendment-list">
        {shown.map((hunk) => {
          const active = hunk.index === activeHunk;
          const status = statuses?.[hunk.index];
          return (
            <li key={hunk.index}>
              <button
                type="button"
                data-testid={`amendment-${hunk.index}`}
                onClick={() => onSelect(hunk.index)}
                className={`block w-full px-4 py-2.5 text-left ${
                  active ? 'bg-card shadow-[inset_3px_0_0_var(--color-dawn)]' : 'hover:bg-hover'
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
                <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink">{hunk.summary}</span>
                {(hunk.flags.length > 0 || status || reverted.has(hunk.index)) && (
                  <span className="mt-1 flex flex-wrap gap-1" data-testid="amendment-chips">
                    {status && (
                      <span
                        className={`${chip} ${COVER_CHIPS[status].className}`}
                        title={checks?.[hunk.index].gaps.map(describeEdit).join('\n')}
                      >
                        {COVER_CHIPS[status].label}
                      </span>
                    )}
                    {reverted.has(hunk.index) && (
                      <span className={`${chip} bg-signal/10 text-signal`}>Reverts to earlier draft</span>
                    )}
                    {hunk.flags.map((flag) => (
                      <span key={flag} className={`${chip} ${FLAG_CHIPS[flag].className}`}>
                        {FLAG_CHIPS[flag].label}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {shown.length === 0 && hunks.length > 0 && (
          <li className="px-4 py-3 text-xs text-ink-soft">No flagged amendments.</li>
        )}
      </ol>
      <div className="hidden max-h-[40%] overflow-y-auto border-t border-line px-4 py-2 md:block">
        <details data-testid="figures-changed">
          <summary className="eyebrow cursor-pointer py-1">Figures changed ({figures.length})</summary>
          <ul className="mb-1 space-y-1">
            {figures.map((figure, i) => (
              <li key={i}>
                <button type="button" onClick={() => onSelect(figure.hunk)} className="text-left text-xs text-ink hover:text-dawn">
                  <span className="font-mono text-ink-soft">{figure.clause ?? `Amdt ${figure.hunk + 1}`}</span> {figure.text}
                </button>
              </li>
            ))}
          </ul>
        </details>
        <details data-testid="drafting-checks">
          <summary className="eyebrow cursor-pointer py-1">Drafting checks on Change ({draftingNotes.length})</summary>
          <ul className="mb-1 space-y-1">
            {draftingNotes.length === 0 && <li className="text-xs text-ink-soft">Nothing found.</li>}
            {draftingNotes.map((note, i) => (
              <li key={i} className="text-xs leading-snug text-ink">
                {note.message}
              </li>
            ))}
          </ul>
        </details>
      </div>
      <div className="flex gap-2 px-4 pb-2 md:flex-col md:border-t md:border-line md:py-3">
        <button
          type="button"
          data-testid="copy-summary"
          onClick={() => void handleCopySummary()}
          disabled={hunks.length === 0}
          className="btn w-full"
        >
          {copied ? 'Copied ✓' : 'Copy amendment summary'}
        </button>
        <button
          type="button"
          data-testid="export-redline"
          onClick={onExportRedline}
          disabled={hunks.length === 0}
          className="btn w-full"
        >
          Export tracked changes (.docx)
        </button>
        <p className="hidden text-[11px] leading-snug text-ink-soft md:block">
          Documents are parsed and compared entirely in your browser — nothing is uploaded.
        </p>
      </div>
    </aside>
  );
}
