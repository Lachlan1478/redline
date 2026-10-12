import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { clauseKey } from '../lib/clauses';
import { exportRedlineBlob } from '../lib/diff/exportRedline';
import { revertedClauses } from '../lib/diff/history';
import type { DocumentDiff, Segment } from '../lib/diff/types';
import { downloadBlob } from '../lib/download';
import { draftingChecks } from '../lib/drafting';
import { AmendmentRail } from './AmendmentRail';
import { ChangeSidebar } from './ChangeSidebar';
import { DiffView } from './DiffView';

interface DiffWorkspaceProps {
  diff: DocumentDiff;
  leftName: string;
  rightName: string;
  /** Shown above the split view when the two sides are identical. */
  identicalNote: string;
  banner?: ReactNode;
  /** Paragraphs of a draft earlier than the Original, to spot clauses reverted to it. */
  earlier?: string[];
}

const joined = (segments?: Segment[]) => (segments ?? []).map((s) => s.text).join('');

/**
 * The full redline reading experience — change index, amendment rail, and the
 * split view — shared by the Compare tab and the Assemble deviation view.
 */
export function DiffWorkspace({ diff, leftName, rightName, identicalNote, banner, earlier }: DiffWorkspaceProps) {
  const [activeHunk, setActiveHunk] = useState<number>();

  useEffect(() => {
    setActiveHunk(diff.hunks.length > 0 ? 0 : undefined);
  }, [diff]);

  const changeParagraphs = useMemo(() => diff.rows.filter((r) => r.right).map((r) => joined(r.right)), [diff]);
  const draftingNotes = useMemo(() => draftingChecks(changeParagraphs), [changeParagraphs]);
  const reverted = useMemo(() => {
    if (!earlier) return new Set<number>();
    const original = diff.rows.filter((r) => r.left).map((r) => joined(r.left));
    const clauses = revertedClauses(earlier, original, changeParagraphs);
    return new Set(
      diff.hunks
        .filter((h) => {
          if (!h.clause) return false;
          const { top, sub } = clauseKey(h.clause);
          return clauses.has(`${top}${sub?.toLowerCase() ?? ''}`);
        })
        .map((h) => h.index),
    );
  }, [diff, earlier, changeParagraphs]);

  const handleExportRedline = async () => {
    const name = rightName.replace(/\.(docx|pdf|txt|md)$/i, '');
    downloadBlob(await exportRedlineBlob(diff.rows), `${name}-redline.docx`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <ChangeSidebar
        hunks={diff.hunks}
        activeHunk={activeHunk}
        onSelect={setActiveHunk}
        leftName={leftName}
        rightName={rightName}
        reverted={reverted}
        draftingNotes={draftingNotes}
        documentText={changeParagraphs.join('\n')}
        onExportRedline={() => void handleExportRedline()}
      />
      <div className="flex min-h-0 flex-1">
        <AmendmentRail diff={diff} activeHunk={activeHunk} onSelect={setActiveHunk} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-card">
          {banner}
          {diff.hunks.length === 0 && (
            <p className="border-b border-line bg-page px-7 py-2 text-sm text-ink-soft">
              {identicalNote}
            </p>
          )}
          <DiffView diff={diff} originalName={leftName} changeName={rightName} activeHunk={activeHunk} />
        </main>
      </div>
    </div>
  );
}
