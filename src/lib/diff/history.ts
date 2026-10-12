import { clauseKey, headingLabel } from '../clauses';

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Full text of each top-level clause, keyed like clauseKey().top: a heading plus the paragraphs under it. */
export function clauseTexts(paragraphs: string[]): Map<string, string> {
  const clauses = new Map<string, string>();
  let current: string | undefined;
  for (const paragraph of paragraphs) {
    const heading = headingLabel(paragraph);
    if (heading) current = clauseKey(heading).top.split('.')[0];
    if (current) clauses.set(current, squash(`${clauses.get(current) ?? ''} ${paragraph}`));
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
