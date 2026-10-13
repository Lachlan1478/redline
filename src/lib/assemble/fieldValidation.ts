import type { FieldDef } from './types';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** "16 July 2026" or "2026-07-16" → a comparable timestamp; undefined if not a date. */
export function parseDate(value: string): number | undefined {
  const written = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(value.trim());
  if (written) {
    const month = MONTHS.indexOf(written[2].toLowerCase());
    return month === -1 ? undefined : Date.UTC(Number(written[3]), month, Number(written[1]));
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return iso ? Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : undefined;
}

const FORMAT_PROBLEMS: Partial<Record<FieldDef['type'], [RegExp | ((v: string) => boolean), string]>> = {
  date: [(v) => parseDate(v) !== undefined, 'Expected a date like 16 July 2026'],
  currency: [/\d/, 'Expected an amount like AUD 10,000,000'],
  number: [/^-?\d[\d,]*(?:\.\d+)?$/, 'Expected a number only, e.g. 85'],
};

/**
 * Per-field problems: values that don't fit the field's type, and date fields
 * out of order (the template lists dates in the order they must fall).
 */
export function fieldProblems(fields: FieldDef[], values: Record<string, string>): Map<string, string> {
  const problems = new Map<string, string>();
  let previous: { field: FieldDef; date: number } | undefined;
  for (const field of fields) {
    const value = values[field.id]?.trim();
    if (!value) continue;
    const rule = FORMAT_PROBLEMS[field.type];
    if (rule) {
      const [test, message] = rule;
      const ok = typeof test === 'function' ? test(value) : test.test(value);
      if (!ok) {
        problems.set(field.id, message);
        continue;
      }
    }
    if (field.type !== 'date') continue;
    const date = parseDate(value)!;
    if (previous && date < previous.date) problems.set(field.id, `Falls before ${previous.field.label}`);
    previous = { field, date };
  }
  return problems;
}
