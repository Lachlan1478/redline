import type { WordEdit } from './types';

export type Flag = 'figure' | 'obligation' | 'risk';

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
];
const TENS: Record<string, number> = { thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90 };

const FIGURE = new RegExp(`\\d|%|\\b(?:${[...NUMBER_WORDS, ...Object.keys(TENS)].join('|')}|hundred|thousand|million|billion|half|quarter)\\b`, 'i');
const OBLIGATION = /\b(?:may|must|shall|will|not|no|only|never|any|all|each|unless|except|without|neither|nor|reasonabl[ey]|promptly|immediately)\b/i;
const RISK = /\b(?:fraud\w*|wilful\w*|caps?|capped|liab\w*|indemn\w*|warrant\w*|knowledge|aware\w*|consent\w*|terminat\w*|exclusiv\w*|interest|escrow|consequential|gross[- ]up|negligen\w*|default|set[- ]off|guarantee\w*|insur\w*|assign\w*|confidential\w*|govern\w*|jurisdiction|disclos\w*|restrain\w*|non[- ]compete|leakage)\b/i;

/** Numbers in text, with "five" and "5" both normalised to "5" and thousands separators removed. */
export function figureTokens(text: string): string[] {
  const tokens = text.toLowerCase().match(/\d[\d,]*(?:\.\d+)?|[a-z]+/g) ?? [];
  return tokens.flatMap((token) => {
    if (/^\d/.test(token)) return [token.replace(/,/g, '')];
    const index = NUMBER_WORDS.indexOf(token);
    if (index !== -1) return [String(index)];
    return token in TENS ? [String(TENS[token])] : [];
  });
}

const editText = (edit: WordEdit) => `${edit.removed} ${edit.added}`;

export function isFigureEdit(edit: WordEdit): boolean {
  return FIGURE.test(edit.removed) || FIGURE.test(edit.added);
}

/** What kind of change this is, so a lawyer can triage: figures, obligation words, risk terms. */
export function materialityFlags(edits: WordEdit[]): Flag[] {
  const flags: Flag[] = [];
  if (edits.some(isFigureEdit)) flags.push('figure');
  if (edits.some((e) => OBLIGATION.test(editText(e)))) flags.push('obligation');
  if (edits.some((e) => RISK.test(editText(e)))) flags.push('risk');
  return flags;
}
