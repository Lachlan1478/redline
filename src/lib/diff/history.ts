import { clauseKey, headingLabel } from '../clauses';

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

/**
 * Clauses the Change draft has put back to their wording in an earlier draft,
 * undoing what the Original had — how a point "accepted" in one round gets
 * quietly reverted in the next.
 */
export function revertedClauses(earlier: string[], original: string[], change: string[]): Set<string> {
  const [before, middle, after] = [earlier, original, change].map(clauseTexts);
  const reverted = new Set<string>();
  for (const [key, text] of after) {
    if (before.get(key) === text && middle.get(key) !== text) reverted.add(key);
  }
  return reverted;
}
