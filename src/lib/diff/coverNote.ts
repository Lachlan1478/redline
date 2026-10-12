import { clauseKey } from '../clauses';
import { figureTokens, isFigureEdit } from './materiality';
import type { ChangeHunk } from './types';

/** Whether a cover note accounts for an amendment. */
export type CoverStatus = 'mentioned' | 'figure-missing' | 'not-mentioned';

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
const STOPWORDS = new Set(['that', 'this', 'with', 'from', 'have', 'such', 'shall', 'which', 'their', 'party', 'parties', 'agreement']);

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

function clauseMentioned(refs: Ref[], clause: string): boolean {
  const key = clauseKey(clause);
  const sameClause = refs.filter((r) => r.top === key.top || key.top.startsWith(`${r.top}.`));
  if (sameClause.length === 0) return false;
  if (!key.sub || sameClause.some((r) => !r.sub)) return true;
  return sameClause.some((r) => key.sub!.startsWith(r.sub!) || r.sub!.startsWith(key.sub!));
}

function wordsMentioned(note: string, hunk: ChangeHunk): boolean {
  const lower = note.toLowerCase();
  const words = hunk.edits.flatMap((e) => `${e.removed} ${e.added}`.toLowerCase().match(/[a-z]{4,}|\d[\d,.]*/g) ?? []);
  return words.some((w) => !STOPWORDS.has(w) && lower.includes(w));
}

function figuresMentioned(note: string, hunk: ChangeHunk): boolean {
  // Clause numbers are references, not figures: "Clause 5" must not vouch for a change to five days.
  const noteFigures = new Set(figureTokens(note.replace(CLAUSE_REFS, ' ').replace(SCHEDULE_REFS, ' ')));
  return hunk.edits.filter(isFigureEdit).every((edit) => {
    const figures = figureTokens(edit.added).filter((f) => !figureTokens(edit.removed).includes(f));
    const changed = figures.length > 0 ? figures : figureTokens(edit.removed);
    return changed.length === 0 || changed.some((f) => noteFigures.has(f));
  });
}

/**
 * Checks each amendment against a cover note. An amendment is "not mentioned"
 * when the note never refers to its clause (or, for unnumbered text, to any
 * changed word), and "figure-missing" when the clause is referred to but a
 * changed number never appears in the note.
 */
export function checkCoverNote(hunks: ChangeHunk[], note: string): CoverStatus[] {
  const refs = coverNoteRefs(note);
  return hunks.map((hunk) => {
    const mentioned = hunk.clause ? clauseMentioned(refs, hunk.clause) : wordsMentioned(note, hunk);
    if (!mentioned) return 'not-mentioned';
    return figuresMentioned(note, hunk) ? 'mentioned' : 'figure-missing';
  });
}
