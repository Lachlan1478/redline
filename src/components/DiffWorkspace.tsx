import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { DocumentDiff } from '../lib/diff/types';
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
}

/**
 * The full redline reading experience — change index, amendment rail, and the
 * split view — shared by the Compare tab and the Assemble deviation view.
 */
export function DiffWorkspace({ diff, leftName, rightName, identicalNote, banner }: DiffWorkspaceProps) {
  const [activeHunk, setActiveHunk] = useState<number>();

  useEffect(() => {
    setActiveHunk(diff.hunks.length > 0 ? 0 : undefined);
  }, [diff]);

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <ChangeSidebar
        hunks={diff.hunks}
        activeHunk={activeHunk}
        onSelect={setActiveHunk}
        leftName={leftName}
        rightName={rightName}
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
