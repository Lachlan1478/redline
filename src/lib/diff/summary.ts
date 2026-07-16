import type { ChangeHunk } from './types';

/**
 * The plain-text "cover note" skeleton for a redline: one numbered line per
 * amendment, ready to paste into an email to the counterparty.
 */
export function amendmentSummary(hunks: ChangeHunk[], leftName: string, rightName: string): string {
  const header = `Redline: ${leftName} → ${rightName}`;
  if (hunks.length === 0) {
    return `${header}\nNo amendments — the documents are identical.`;
  }
  const lines = hunks.map((hunk) => {
    const range =
      hunk.rowEnd > hunk.rowStart
        ? `¶ ${hunk.rowStart + 1}–${hunk.rowEnd + 1}`
        : `¶ ${hunk.rowStart + 1}`;
    return `${hunk.index + 1}. (${range}) ${hunk.summary}`;
  });
  return [`${header}`, `${hunks.length} amendment${hunks.length === 1 ? '' : 's'}:`, '', ...lines].join(
    '\n',
  );
}
