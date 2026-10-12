import { CLAUSE_HEADING } from './clauses';

export interface DraftingNote {
  kind: 'undefined-term' | 'unused-definition' | 'missing-clause' | 'deleted-clause';
  message: string;
}

const MAX_LISTED = 12;
const TERM = String.raw`[A-Z][A-Za-z-]+(?:\s+(?:of\s+|and\s+|for\s+)?[A-Z][A-Za-z-]+){0,3}`;
const QUOTED_DEFINITION = new RegExp(String.raw`"(${TERM})"\s+(?:means|includes|has the meaning)|\((?:the\s+)?"(${TERM})"\)`, 'g');
const BARE_DEFINITION = new RegExp(String.raw`\((${TERM})\)|"(${TERM})"`, 'g');
const DEFINITE_USE = new RegExp(String.raw`\b(?:[Tt]he|[Aa]n?|[Aa]ny|[Ee]ach|[Ee]very|[Ss]uch|[Nn]o|[Aa]ll|[Tt]hat)\s+(${TERM})`, 'g');
const NOT_TERMS = /\b(?:Act|Acts|Regulations?|Code|Ltd|Limited|Pty|plc|Inc|LLC|LP|Bank|Court|Courts|Commission|Office|Exchange|Government|Commonwealth|Crown|January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Australia|Australian|Victoria|Queensland|Wales|England|English|Clause|Clauses|Schedule|Schedules|Annexure|Appendix|Part)\b/;
const CLAUSE_REF = /\b(?:[Cc]lauses?|cl\.?)\s+(\d+[A-Z]?)(?:\.\d+)*(?:\([a-z0-9]+\))*(?:\s*(?:to|–|-)\s*(\d+))?/g;
const DELETED_BODY = /^\s*\d+[A-Z]?\.\s*(?:[^.]{0,60}\.\s*)?\[?\s*(?:not used|intentionally (?:left blank|deleted)|deleted|reserved)\s*\.?\]?\s*$/i;

const singular = (term: string) => term.replace(/ies$/, 'y').replace(/s$/, '');
const ACRONYM = /^[A-Z]{2,5}$/;
const normalise = (text: string) => text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

function listed(kind: DraftingNote['kind'], label: string, items: string[]): DraftingNote[] {
  if (items.length === 0) return [];
  const shown = items.slice(0, MAX_LISTED).join(', ');
  const more = items.length > MAX_LISTED ? ` and ${items.length - MAX_LISTED} more` : '';
  return [{ kind, message: `${label}: ${shown}${more}.` }];
}

/**
 * Text-level drafting checks that work on any contract: capitalised terms used
 * as defined terms but never defined, quoted definitions never used, and
 * clause references to clauses that don't exist or are marked deleted.
 * Heuristic by design — results are prompts to check, not findings.
 */
export function draftingChecks(paragraphs: string[]): DraftingNote[] {
  const text = paragraphs.map(normalise);
  const all = text.join('\n');

  const quoted = new Set<string>();
  for (const m of all.matchAll(QUOTED_DEFINITION)) quoted.add(m[1] ?? m[2]);
  const defined = new Set(quoted);
  for (const m of all.matchAll(BARE_DEFINITION)) defined.add(m[1] ?? m[2]);
  const isDefined = (term: string) =>
    [...defined].some((d) => singular(d) === singular(term) || term.startsWith(`${d} `));

  const undefinedTerms = new Set<string>();
  for (const m of all.matchAll(DEFINITE_USE)) {
    const term = m[1];
    if (!NOT_TERMS.test(term) && !ACRONYM.test(term) && !isDefined(term)) undefinedTerms.add(term);
  }

  const unused = [...quoted].filter((term) => {
    const uses = all.match(new RegExp(String.raw`\b${term.replace(/[-]/g, '\\-')}s?\b`, 'g')) ?? [];
    return uses.length <= 1;
  });

  const headings = new Map<string, string>();
  for (const paragraph of text) {
    const heading = CLAUSE_HEADING.exec(paragraph)?.[1].replace(/\.$/, '');
    if (heading && !heading.includes('.')) headings.set(heading, paragraph);
  }
  const missing = new Set<string>();
  const deleted = new Set<string>();
  if (headings.size > 0) {
    for (const m of all.matchAll(CLAUSE_REF)) {
      const from = Number.parseInt(m[1], 10);
      const to = m[2] ? Number(m[2]) : from;
      for (let n = from; n <= Math.min(to, from + 50); n++) {
        const id = n === from ? m[1] : String(n);
        const target = headings.get(id);
        if (!target) missing.add(id);
        else if (DELETED_BODY.test(target)) deleted.add(id);
      }
    }
  }

  return [
    ...listed('missing-clause', 'References to clauses that do not exist', [...missing].map((c) => `clause ${c}`)),
    ...listed('deleted-clause', 'References to clauses marked deleted', [...deleted].map((c) => `clause ${c}`)),
    ...listed('undefined-term', 'Possibly undefined terms', [...undefinedTerms]),
    ...listed('unused-definition', 'Defined but never used', unused),
  ];
}
