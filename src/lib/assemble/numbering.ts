import type { Block, BlockLabel } from './types';

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

/** Own/full label parts for the nth (1-based) numbered sibling at a depth. */
function labelAt(depth: number, n: number): { own: string; part: string } {
  switch (depth) {
    case 0:
      return { own: `${n}.`, part: `${n}` };
    case 1:
      return { own: `(${toAlpha(n)})`, part: `(${toAlpha(n)})` };
    default:
      return { own: `(${toRoman(n)})`, part: `(${toRoman(n)})` };
  }
}

/**
 * Assign labels to every included, numberable block.
 *
 * Numbers exist only in the returned map — they are recomputed from scratch on
 * every toggle, which is what makes add/remove mechanically safe.
 */
export function computeNumbering(
  blocks: Block[],
  included: Record<string, boolean>,
): Map<string, BlockLabel> {
  const labels = new Map<string, BlockLabel>();

  const walk = (siblings: Block[], depth: number, prefix: string) => {
    let counter = 0;
    for (const block of siblings) {
      if (!isIncluded(block, included)) continue;
      if (block.kind === 'preamble') {
        walk(block.children, depth, prefix);
        continue;
      }
      counter += 1;
      const { own, part } = labelAt(depth, counter);
      const full = prefix + part;
      labels.set(block.id, { own, full });
      walk(block.children, depth + 1, full);
    }
  };

  walk(blocks, 0, '');
  return labels;
}
