import { computeNumbering, DEFAULT_SCHEME } from '../numbering';
import type { Block, LevelStyle, NumberingScheme } from '../types';

export interface ImportNote {
  kind: 'renumbered' | 'unresolved-ref' | 'structure';
  message: string;
  blockId?: string;
}

export interface ParsedStructure {
  blocks: Block[];
  numbering: NumberingScheme;
  notes: ImportNote[];
}

const DOTTED = /^(\d+(?:\.\d+)*)([.)])?\s+(.*)$/s;
const PAREN = /^\(([a-z0-9]{1,4})\)\s+(.*)$/is;
const HEADING = /^[A-Z][A-Z0-9 ,.&—–\-()]*$/;
const REF_WORDS = ['Clause', 'Section', 'Condition', 'Article', 'Paragraph'];
const TITLE_MINOR_WORDS = new Set(['of', 'and', 'the', 'to', 'for', 'in', 'on', 'by', 'with', 'a', 'an', 'or']);

const ROMAN_VALUES: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

function isRoman(token: string): boolean {
  return /^[ivxlcdm]+$/.test(token);
}

function romanIndex(token: string): number {
  let total = 0;
  for (let i = 0; i < token.length; i++) {
    const value = ROMAN_VALUES[token[i]];
    const next = ROMAN_VALUES[token[i + 1]] ?? 0;
    total += value < next ? -value : value;
  }
  return total;
}

function alphaIndex(token: string): number {
  let total = 0;
  for (const char of token) {
    total = total * 26 + (char.charCodeAt(0) - 96);
  }
  return total;
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

function toRomanLower(n: number): string {
  const table: Array<[number, string]> = [
    [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'],
    [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
  ];
  let result = '';
  let remaining = n;
  for (const [value, numeral] of table) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }
  return result;
}

function nextSymbol(style: LevelStyle, count: number): string {
  if (style === 'alpha') return toAlpha(count + 1);
  if (style === 'roman') return toRomanLower(count + 1);
  return `${count + 1}`;
}

/** "Definitions. In this Agreement…" → title "Definitions" if it reads like a heading. */
function extractTitle(text: string): { title?: string; body: string } {
  const match = /^([A-Z][^.!?]{1,60})\.\s+(.+)$/s.exec(text);
  if (!match) return { body: text };
  const words = match[1].split(/\s+/);
  const isTitleCase =
    words.length <= 6 &&
    words.every((word) => TITLE_MINOR_WORDS.has(word) || /^[A-Z0-9("“"']/.test(word));
  return isTitleCase ? { title: match[1], body: match[2] } : { body: text };
}

function detectRefWord(paragraphs: string[]): string {
  const text = paragraphs.join('\n');
  let best = 'Clause';
  let bestCount = 0;
  for (const word of REF_WORDS) {
    const count = (text.match(new RegExp(`\\b${word}s?\\s+\\d`, 'g')) ?? []).length;
    if (count > bestCount) {
      best = word;
      bestCount = count;
    }
  }
  return best;
}

interface ParenLevel {
  depth: number;
  style: LevelStyle;
  count: number;
}

/**
 * Cut a flat list of paragraphs into the block tree, stripping literal
 * numbers (numbering is recomputed from structure ever after). Best-effort by
 * design: anything surprising lands in `notes` for the review-the-cut step.
 */
export function parseStructure(paragraphs: string[]): ParsedStructure {
  const notes: ImportNote[] = [];
  const roots: Block[] = [];
  /** Current chain of open blocks by depth. */
  let chain: Block[] = [];
  let parenLevels: ParenLevel[] = [];
  const sourceLabels = new Map<string, string>();
  let sawDottedNesting = false;
  let sequence = 0;

  const makeBlock = (kind: Block['kind'], body: string, title?: string): Block => ({
    id: `b${++sequence}${title ? `-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24).replace(/-+$/, '')}` : ''}`,
    kind,
    ...(title ? { title } : {}),
    body: body ? [{ t: 'text', text: body }] : [],
    children: [],
  });

  const attach = (block: Block, depth: number) => {
    const clamped = Math.min(depth, chain.length);
    if (clamped !== depth) {
      notes.push({
        kind: 'structure',
        blockId: block.id,
        message: `A level-${depth + 1} item appeared without a parent; attached one level up.`,
      });
    }
    if (clamped === 0) {
      roots.push(block);
    } else {
      chain[clamped - 1].children.push(block);
    }
    chain = [...chain.slice(0, clamped), block];
  };

  for (const raw of paragraphs) {
    const paragraph = raw.trim();
    if (!paragraph) continue;

    const dotted = DOTTED.exec(paragraph);
    // "5. Title" or "5) Title" always counts; a bare "2.1 …" counts only when
    // multi-part, so prose starting with a plain number is not cut into a clause.
    if (dotted && (dotted[2] || dotted[1].includes('.'))) {
      const parts = dotted[1].split('.');
      if (parts.length > 1) sawDottedNesting = true;
      const { title, body } = extractTitle(dotted[3]);
      const block = makeBlock('clause', body, title);
      sourceLabels.set(block.id, dotted[1]);
      attach(block, parts.length - 1);
      parenLevels = [];
      continue;
    }

    const paren = PAREN.exec(paragraph);
    if (paren && chain.length > 0) {
      const token = paren[1].toLowerCase();
      const { title, body } = extractTitle(paren[2]);
      const block = makeBlock('clause', body, title);
      sourceLabels.set(block.id, `(${token})`);

      // Prefer continuing an open list over starting a deeper one: "(i)" after
      // "(h)" is the next alpha item, not a new roman level.
      const continuation = [...parenLevels]
        .reverse()
        .find((level) => nextSymbol(level.style, level.count) === token);
      if (continuation) {
        continuation.count += 1;
        parenLevels = parenLevels.filter((level) => level.depth <= continuation.depth);
        attach(block, continuation.depth);
      } else {
        const depth = chain.length;
        const style: LevelStyle = /^\d+$/.test(token)
          ? 'decimal'
          : token === 'i' || (isRoman(token) && token.length > 1)
            ? 'roman'
            : 'alpha';
        const count =
          style === 'decimal' ? Number(token) : style === 'roman' ? romanIndex(token) : alphaIndex(token);
        parenLevels = [...parenLevels, { depth, style, count }];
        attach(block, depth);
      }
      continue;
    }

    if (HEADING.test(paragraph) && paragraph.length <= 80 && /[A-Z]{2}/.test(paragraph)) {
      const heading = makeBlock('preamble', '', paragraph);
      roots.push(heading);
      chain = [];
      parenLevels = [];
      continue;
    }

    // Plain prose: preamble before the first clause, otherwise a continuation
    // paragraph of the deepest open block (unnumbered, so numbering ignores it).
    const prose = makeBlock('preamble', paragraph);
    if (chain.length === 0) {
      roots.push(prose);
    } else {
      chain[chain.length - 1].children.push(prose);
    }
  }

  const numbering: NumberingScheme = {
    levels: sawDottedNesting ? ['decimal', 'decimal', 'decimal'] : DEFAULT_SCHEME.levels,
    compose: sawDottedNesting ? 'dotted' : 'parenthetical',
    refWord: detectRefWord(paragraphs),
  };

  // Where the recomputed number disagrees with the document's literal number,
  // tell the user — the source may genuinely skip or repeat a clause.
  const labels = computeNumbering(roots, {}, numbering);
  for (const [blockId, source] of sourceLabels) {
    const computed = labels.get(blockId);
    if (!computed) continue;
    const normalizedComputed = computed.own.replace(/\.$/, '');
    const normalizedSource = source.replace(/\.$/, '');
    if (normalizedComputed !== normalizedSource) {
      notes.push({
        kind: 'renumbered',
        blockId,
        message: `Numbered "${source}" in the source but recomputed as "${normalizedComputed}".`,
      });
    }
  }

  return { blocks: roots, numbering, notes };
}
