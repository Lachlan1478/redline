import { clauseKey } from '../clauses';
import { figureTokens, withoutClauseNumbers } from './materiality';
import type { ChangeHunk, WordEdit } from './types';

/** How well a cover note accounts for an amendment, from worst to best. */
export type CoverStatus = 'not-mentioned' | 'undescribed-edit' | 'partly-described' | 'mentioned';

export interface CoverCheck {
  status: CoverStatus;
  /** Edits the note doesn't describe (or describes only one side of). */
  gaps: WordEdit[];
}

type Coverage = 'none' | 'partial' | 'full';

interface Ref {
  top: string;
  sub?: string;
}

const ITEM = String.raw`\d+[A-Z]?(?:\.\d+)*(?:\([a-z0-9]+\))*`;
const CLAUSE_REFS = new RegExp(
  String.raw`\b(?:clauses?|cll?s?\.?|sections?|paragraphs?|paras?\.?)\s*(${ITEM}(?:\s*(?:,|and|&|or|to|–|—|-)\s*${ITEM})*)`,
  'gi',
);
const SCHEDULE_REFS = /\b(?:schedule|sch\.?|annexure|appendix)\s*(\d+|[A-Z])\b/gi;
const STOPWORDS = new Set(
  'that this with from have such shall must will which their there where party parties agreement clause clauses under other than been each into upon being when were what they them then also does only more most some same very'.split(' '),
);
/** Words this common in the document can't show that a note describes a particular edit. */
const COMMON_IN_DOCUMENT = 6;

function parseItem(item: string): Ref {
  const match = /^(\d+[A-Z]?(?:\.\d+)*)((?:\([a-z0-9]+\))*)$/i.exec(item.trim());
  return match ? { top: match[1].toLowerCase(), sub: match[2] || undefined } : { top: item.toLowerCase() };
}

/** Every clause and Schedule the note refers to, with ranges like "cl 6–7" or "clauses 18 to 23" expanded. */
export function coverNoteRefs(note: string): Ref[] {
  const refs: Ref[] = [];
  for (const [, list] of note.matchAll(CLAUSE_REFS)) {
    const pieces = list.split(/\s*(,|and|&|or|to|–|—|-)\s*/);
    for (let i = 0; i < pieces.length; i += 2) {
      const from = parseItem(pieces[i]);
      refs.push(from);
      const isRange = ['to', '–', '—', '-'].includes(pieces[i + 1] ?? '');
      const to = isRange ? Number(pieces[i + 2]) : NaN;
      if (isRange && /^\d+$/.test(from.top) && to > Number(from.top) && to - Number(from.top) < 50) {
        for (let n = Number(from.top) + 1; n < to; n++) refs.push({ top: String(n) });
      }
    }
  }
  for (const [, id] of note.matchAll(SCHEDULE_REFS)) refs.push({ top: `schedule ${id.toLowerCase()}` });
  return refs;
}

function refersTo(refs: Ref[], clause: string): boolean {
  const key = clauseKey(clause);
  const sameClause = refs.filter((r) => r.top === key.top || key.top.startsWith(`${r.top}.`));
  if (sameClause.length === 0) return false;
  if (!key.sub || sameClause.some((r) => !r.sub)) return true;
  return sameClause.some((r) => key.sub!.startsWith(r.sub!) || r.sub!.startsWith(key.sub!));
}

/** The note lines that discuss a clause, plus any unnumbered lines that continue them. */
function noteItem(lines: string[], clause: string): string {
  const picked: string[] = [];
  let following = false;
  for (const line of lines) {
    const refs = coverNoteRefs(line);
    if (refs.length > 0) following = refersTo(refs, clause);
    if (following) picked.push(line);
  }
  return picked.join('\n');
}

function wordCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) counts.set(word, (counts.get(word) ?? 0) + 1);
  return counts;
}

function distinctive(text: string, documentWords: Map<string, number>): string[] {
  const words = (text.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(
    (w) => !STOPWORDS.has(w) && (documentWords.get(w) ?? 0) <= COMMON_IN_DOCUMENT,
  );
  return [...words, ...figureTokens(withoutClauseNumbers(text))];
}

function coverage(edit: WordEdit, item: string, documentWords: Map<string, number>): Coverage {
  const said = new Set([
    ...(item.toLowerCase().match(/[a-z]{4,}/g) ?? []),
    ...figureTokens(withoutClauseNumbers(item.replace(CLAUSE_REFS, ' ').replace(SCHEDULE_REFS, ' '))),
  ]);
  const removed = distinctive(edit.removed, documentWords);
  const added = distinctive(edit.added, documentWords).filter((t) => !removed.includes(t));
  const removedOnly = removed.filter((t) => !added.includes(t));
  const hit = (side: string[]) => side.some((t) => said.has(t));
  if (added.length === 0 && removedOnly.length === 0) return 'full';
  if (!hit(added) && !hit(removedOnly)) return 'none';
  // The new wording must be described; the old only when it held a figure ("five" in "five → three").
  const oldFigure = figureTokens(withoutClauseNumbers(edit.removed)).length > 0;
  const addedOk = added.length === 0 || hit(added);
  const removedOk = removedOnly.length === 0 || !oldFigure || hit(removedOnly);
  return addedOk && removedOk ? 'full' : 'partial';
}

/**
 * Checks each amendment against a cover note, edit by edit, using what the
 * note says about that clause:
 * - "not-mentioned": the note never refers to the clause (or, if unnumbered,
 *   to any changed word);
 * - "undescribed-edit": some edit's old and new wording both go unmentioned;
 * - "partly-described": the note gives only one side of some replacement,
 *   e.g. the new figure but not the old.
 */
export function checkCoverNote(hunks: ChangeHunk[], note: string, documentText = ''): CoverCheck[] {
  const refs = coverNoteRefs(note);
  const lines = note.split(/\n+/);
  const documentWords = wordCounts(documentText);
  return hunks.map((hunk) => {
    if (hunk.clause && !refersTo(refs, hunk.clause)) return { status: 'not-mentioned', gaps: hunk.edits };
    const item = hunk.clause ? noteItem(lines, hunk.clause) : note;
    const results = hunk.edits.map((edit) => coverage(edit, item, documentWords));
    const gaps = hunk.edits.filter((_, i) => results[i] !== 'full');
    if (!hunk.clause && results.every((r) => r === 'none')) return { status: 'not-mentioned', gaps };
    const status = results.includes('none') ? 'undescribed-edit' : results.includes('partial') ? 'partly-described' : 'mentioned';
    return { status, gaps };
  });
}
