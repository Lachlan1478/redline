/** Paragraph-level clause numbering shared by the diff index, cover-note check and drafting checks. */

export const CLAUSE_HEADING = /^\s*(?:clause\s+)?(\d+[A-Z]?(?:\.\d+)+\.?|\d+[A-Z]?\.)(?=\s|$)/i;
const SCHEDULE_HEADING = /^\s*((?:schedule|annexure|appendix|part)\s+[\dA-Z]+)\b/i;

/** "cl 12" or "Schedule 1" when the paragraph opens a numbered clause. */
export function headingLabel(text: string): string | undefined {
  const clause = CLAUSE_HEADING.exec(text);
  if (clause) return `cl ${clause[1].replace(/\.$/, '')}`;
  return SCHEDULE_HEADING.exec(text)?.[1];
}

/** "cl 11(a)" → { top: "11", sub: "(a)" }; "Schedule 1" → { top: "schedule 1" }. */
export function clauseKey(label: string): { top: string; sub?: string } {
  const match = /^cl (\d+[A-Z]?(?:\.\d+)*)((?:\([a-z0-9]+\))*)$/i.exec(label);
  if (match) return { top: match[1].toLowerCase(), sub: match[2] || undefined };
  return { top: label.toLowerCase() };
}
