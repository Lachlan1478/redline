import type { Block, BlockLabel, LevelStyle, NumberingScheme } from './types';

export const DEFAULT_SCHEME: NumberingScheme = {
  levels: ['decimal', 'alpha', 'roman'],
  compose: 'parenthetical',
  refWord: 'Clause',
};

/**
 * Whether a block is currently part of the document.
 * Mandatory blocks always are; optional blocks follow the deal's toggle map,
 * falling back to their template default (excluded unless stated otherwise).
 */
export function isIncluded(block: Block, included: Record<string, boolean>): boolean {
  if (!block.optional) return true;
  return included[block.id] ?? block.includedByDefault ?? false;
}

const ROMAN: Array<[number, string]> = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
];

function toRoman(n: number): string {
  let result = '';
  let remaining = n;
  for (const [value, numeral] of ROMAN) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }
  return result;
}

function toAlpha(n: number): string {
  let result = '';
  let remaining = n;
  while (remaining > 0) {
    remaining -= 1;
    result = String.fromCharCode(97 + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26);
  }
  return result;
}

/**
 * Nesting depth encoded in a full label: "1(a)(i)" → 2, "4.1.1" → 2, "" → 0.
 */
export function labelDepth(full: string): number {
  if (!full) return 0;
  const parens = (full.match(/\(/g) ?? []).length;
  if (parens > 0) return parens;
  return full.split('.').length - 1;
}

function symbolFor(style: LevelStyle, n: number): string {
  if (style === 'alpha') return toAlpha(n);
  if (style === 'roman') return toRoman(n);
  return `${n}`;
}

function makeLabel(scheme: NumberingScheme, depth: number, n: number, prefix: string): BlockLabel {
  const style = scheme.levels[Math.min(depth, scheme.levels.length - 1)];
  const symbol = symbolFor(style, n);
  if (scheme.compose === 'dotted') {
    const full = prefix ? `${prefix}.${symbol}` : symbol;
    return { own: depth === 0 ? `${full}.` : full, full };
  }
  const part = depth === 0 ? symbol : `(${symbol})`;
  const full = prefix + part;
  return { own: depth === 0 ? `${symbol}.` : part, full };
}

/**
 * Assign labels to every included, numberable block.
 *
 * Numbers exist only in the returned map — they are recomputed from scratch on
 * every toggle, which is what makes add/remove mechanically safe.
 *
 * Preamble blocks (recitals, PART headings) take no number themselves and are
 * transparent to numbering: their children share the surrounding counter, so
 * conditions keep numbering continuously across PART headings.
 */
export function computeNumbering(
  blocks: Block[],
  included: Record<string, boolean>,
  scheme: NumberingScheme = DEFAULT_SCHEME,
): Map<string, BlockLabel> {
  const labels = new Map<string, BlockLabel>();

  const walk = (siblings: Block[], depth: number, prefix: string) => {
    let counter = 0;
    const visit = (group: Block[]) => {
      for (const block of group) {
        if (!isIncluded(block, included)) continue;
        if (block.kind === 'preamble') {
          visit(block.children);
          continue;
        }
        counter += 1;
        const label = makeLabel(scheme, depth, counter, prefix);
        labels.set(block.id, label);
        walk(block.children, depth + 1, label.full);
      }
    };
    visit(siblings);
  };

  walk(blocks, 0, '');
  return labels;
}
