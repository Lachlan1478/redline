import { describe, it, expect } from 'vitest';
import { computeNumbering } from './numbering';
import { renderDocument } from './render';
import type { Block, ContractTemplate, DealState } from './types';

/**
 * Performance stress tests. Thresholds are deliberately loose (CI machines
 * vary); the console output carries the real measurements. The scenarios are
 * sized far beyond any real contract — a 100-page ISDA is ~2,000 blocks.
 */

const FIELD_COUNT = 500;

function buildTemplate(topLevel: number, childrenPer: number): ContractTemplate {
  const blocks: Block[] = [];
  for (let i = 0; i < topLevel; i++) {
    const children: Block[] = [];
    for (let j = 0; j < childrenPer; j++) {
      children.push({
        id: `c${i}-${j}`,
        kind: 'clause',
        body: [
          { t: 'text', text: `Sub-obligation ${j} referring to ` },
          { t: 'ref', targetId: `c${(i + 1) % topLevel}` },
          { t: 'text', text: ' and the value ' },
          { t: 'field', fieldId: `f${(i + j) % FIELD_COUNT}` },
          { t: 'text', text: '.' },
        ],
        children: [],
        optional: j === 0,
      });
    }
    blocks.push({
      id: `c${i}`,
      kind: 'clause',
      title: `Clause ${i}`,
      body: [{ t: 'text', text: `Primary obligation number ${i} of the agreement.` }],
      children,
    });
  }
  return {
    id: 'stress',
    name: 'Stress Agreement',
    fields: Array.from({ length: FIELD_COUNT }, (_, i) => ({
      id: `f${i}`,
      label: `Field ${i}`,
      type: 'text' as const,
      required: true,
    })),
    blocks,
  };
}

function filledDeal(template: ContractTemplate, included: Record<string, boolean> = {}): DealState {
  return {
    templateId: template.id,
    fieldValues: Object.fromEntries(template.fields.map((f) => [f.id, `value-${f.id}`])),
    included,
  };
}

function time<T>(label: string, fn: () => T): { result: T; ms: number } {
  const started = performance.now();
  const result = fn();
  const ms = Math.round(performance.now() - started);
  console.info(`[perf] ${label}: ${ms}ms`);
  return { result, ms };
}

// Wall-clock thresholds are very loose: CI runners and loaded dev machines can
// be 20-50x slower than an idle one. The [perf] console output carries the real
// measurements (idle baseline: 44k render ~255ms, realistic contract ~6ms).
describe('assemble engine at scale', { timeout: 60000 }, () => {
  it('renders a 44,000-block contract (10× any real document) in interactive time', () => {
    const template = buildTemplate(4000, 10); // 4,000 clauses × 10 children + tops
    const deal = filledDeal(template);

    // 4,000 optional first-children are excluded by default → 40,000 included.
    const numbering = time('computeNumbering 44k blocks', () =>
      computeNumbering(template.blocks, deal.included),
    );
    expect(numbering.result.size).toBe(40000);

    const render = time('renderDocument 44k blocks', () => renderDocument(template, deal));
    expect(render.result.paragraphs.length).toBe(40000);
    expect(render.result.warnings.brokenRefs).toEqual([]);
    // Loose bound: must stay comfortably re-renderable. Real target is <100ms.
    expect(render.ms).toBeLessThan(15000);
  });

  it('recomputes after a toggle at the same cost as the initial render', () => {
    const template = buildTemplate(2000, 10);
    const toggled = filledDeal(template, { 'c0-0': true, 'c1000-0': true });
    const { ms, result } = time('re-render 22k blocks after toggle', () =>
      renderDocument(template, toggled),
    );
    expect(result.paragraphs.length).toBeGreaterThan(20000);
    expect(ms).toBeLessThan(10000);
  });

  it('handles a realistic ISDA-scale contract (2,200 blocks) at keystroke speed', () => {
    const template = buildTemplate(200, 10);
    const { ms, result } = time('renderDocument 2.2k blocks (realistic)', () =>
      renderDocument(template, filledDeal(template)),
    );
    expect(result.paragraphs.length).toBe(2000);
    // This is the per-keystroke cost in the live preview (idle baseline ~6ms).
    expect(ms).toBeLessThan(2000);
  });

  it('collects tens of thousands of broken references without degrading', () => {
    const template = buildTemplate(2000, 10);
    // Point every child ref at a non-existent block.
    for (const top of template.blocks) {
      for (const child of top.children) {
        for (const inline of child.body) {
          if (inline.t === 'ref') inline.targetId = 'does-not-exist';
        }
      }
    }
    const { ms, result } = time('render 22k blocks, 20k broken refs', () =>
      renderDocument(template, filledDeal(template)),
    );
    // 2,000 excluded optional children don't render, so don't warn either.
    expect(result.warnings.brokenRefs.length).toBe(18000);
    expect(ms).toBeLessThan(10000);
  });

  it('survives nesting far deeper than any real document', () => {
    // 200 levels deep; real contracts stop around 6.
    let current: Block = { id: 'leaf', kind: 'clause', body: [{ t: 'text', text: 'Deepest.' }], children: [] };
    for (let depth = 198; depth >= 0; depth--) {
      current = {
        id: `d${depth}`,
        kind: 'clause',
        body: [{ t: 'text', text: `Level ${depth}.` }],
        children: [current],
      };
    }
    const template: ContractTemplate = {
      id: 'deep',
      name: 'Deep',
      fields: [],
      blocks: [current],
    };
    const { result } = time('render 200-level nesting', () =>
      renderDocument(template, { templateId: 'deep', fieldValues: {}, included: {} }),
    );
    const leaf = result.paragraphs[result.paragraphs.length - 1];
    expect(leaf.blockId).toBe('leaf');
    // Label composes through every level without corruption.
    expect(leaf.label.startsWith('1(a)(i)')).toBe(true);
  });
});
