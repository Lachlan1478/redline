import { clauseKey, headingLabel } from '../clauses';
import type { ChangeHunk } from './types';

const SUB_PARAGRAPH = /^\s*(\([a-z0-9]+\))/i;

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Text of each clause and sub-paragraph, keyed "11" or "11(a)", so a revert is spotted at the level it happened. */
export function clauseTexts(paragraphs: string[]): Map<string, string> {
  const clauses = new Map<string, string>();
  let heading: string | undefined;
  let key: string | undefined;
  for (const paragraph of paragraphs) {
    const label = headingLabel(paragraph);
    const sub = SUB_PARAGRAPH.exec(paragraph)?.[1];
    if (label) key = heading = clauseKey(label).top;
    else if (sub && heading) key = `${heading}${sub.toLowerCase()}`;
    if (key) clauses.set(key, squash(`${clauses.get(key) ?? ''} ${paragraph}`));
  }
  return clauses;
}

const PHRASE_WORDS = 4;

/** Runs of PHRASE_WORDS words from an edit (or the whole edit if shorter, but at least two words). */
function phrases(text: string): string[] {
  const words = squash(text).split(' ').filter(Boolean);
  if (words.length < 2) return [];
  if (words.length <= PHRASE_WORDS) return [words.join(' ')];
  return words.slice(0, words.length - PHRASE_WORDS + 1).map((_, i) => words.slice(i, i + PHRASE_WORDS).join(' '));
}

/**
 * Amendments that restore an earlier draft's wording the Original had moved
 * away from — how a point "accepted" in one round gets quietly reverted in
 * the next. A whole clause or sub-paragraph matching the earlier draft counts,
 * as does any edit containing a run of new words that was in the earlier
 * draft's clause but not the Original's.
 */
export function revertedHunks(hunks: ChangeHunk[], earlier: string[], original: string[], change: string[]): Set<number> {
  const [before, middle, after] = [earlier, original, change].map(clauseTexts);
  const reverted = new Set<number>();
  for (const hunk of hunks) {
    if (!hunk.clause) continue;
    const { top, sub } = clauseKey(hunk.clause);
    const key = `${top}${sub?.toLowerCase() ?? ''}`;
    const was = before.get(key) ?? before.get(top) ?? '';
    const had = middle.get(key) ?? middle.get(top) ?? '';
    const wholeRevert = after.get(key) === before.get(key) && middle.get(key) !== before.get(key);
    const phraseRevert = hunk.edits.some((edit) =>
      phrases(edit.added).some((phrase) => was.includes(phrase) && !had.includes(phrase)),
    );
    if (wholeRevert || phraseRevert) reverted.add(hunk.index);
  }
  return reverted;
}
