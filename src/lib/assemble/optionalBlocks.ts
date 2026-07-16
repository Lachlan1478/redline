import type { Block } from './types';

/** All toggleable blocks in document order, wherever they sit in the tree. */
export function collectOptionalBlocks(blocks: Block[]): Block[] {
  const found: Block[] = [];
  const walk = (group: Block[]) => {
    for (const block of group) {
      if (block.optional) found.push(block);
      walk(block.children);
    }
  };
  walk(blocks);
  return found;
}

/** Lookup of block id → display title (falls back to the id for untitled blocks). */
export function blockTitles(blocks: Block[]): Map<string, string> {
  const titles = new Map<string, string>();
  const walk = (group: Block[]) => {
    for (const block of group) {
      titles.set(block.id, block.title ?? block.id);
      walk(block.children);
    }
  };
  walk(blocks);
  return titles;
}
