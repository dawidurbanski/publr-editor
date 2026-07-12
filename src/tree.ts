// tree.ts — model-tree traversal. Once blocks carry children the model is a
// tree, and every structural operation works on the SIBLING LIST containing a
// block — so locate hands back the list itself: a live reference into the
// model that callers splice inside commit().

import type { Block } from "./carriers";

export interface LocatedBlock {
  block: Block;
  /** The sibling list holding the block — model.blocks or a parent's children. */
  list: Block[];
  index: number;
  /** The block whose children `list` is; null at the document root. */
  parent: Block | null;
}

export function locateBlock(
  root: Block[],
  id: string,
  parent: Block | null = null,
): LocatedBlock | null {
  for (let index = 0; index < root.length; index++) {
    const block = root[index];
    if (block.id === id) return { block, list: root, index, parent };
    if (block.children) {
      const hit = locateBlock(block.children, id, block);
      if (hit) return hit;
    }
  }
  return null;
}

/** Pre-order (document order) flatten of the block tree. */
export function flattenBlocks(root: Block[]): Block[] {
  const out: Block[] = [];
  const walk = (list: Block[]) => {
    for (const block of list) {
      out.push(block);
      if (block.children) walk(block.children);
    }
  };
  walk(root);
  return out;
}

/** Ancestor path root→block, both inclusive; null when the id isn't in the tree. */
export function pathToBlock(root: Block[], id: string): Block[] | null {
  for (const block of root) {
    if (block.id === id) return [block];
    if (block.children) {
      const rest = pathToBlock(block.children, id);
      if (rest) return [block, ...rest];
    }
  }
  return null;
}

export interface SiblingRun {
  list: Block[];
  lo: number;
  hi: number;
}

/**
 * Normalize two endpoints — possibly at different nesting depths — to ONE
 * sibling list: climb both to the children of their deepest common ancestor
 * and take the contiguous run between them (familiar block-editor semantics: a selection
 * never straddles levels). Same-block endpoints return null — that's a text
 * selection, not a block run. When one endpoint contains the other, the run
 * is the containing block alone.
 */
export function siblingRun(root: Block[], aId: string, bId: string): SiblingRun | null {
  const pa = pathToBlock(root, aId);
  const pb = pathToBlock(root, bId);
  if (!pa || !pb) return null;
  let depth = 0;
  while (depth < pa.length && depth < pb.length && pa[depth] === pb[depth]) depth++;
  if (depth === pa.length && depth === pb.length) return null; // the same block
  if (depth === pa.length || depth === pb.length) {
    // one endpoint is inside the other — the containing block, alone
    const ancestor = pa[depth - 1];
    const list = depth === 1 ? root : pa[depth - 2].children!;
    const at = list.indexOf(ancestor);
    return at < 0 ? null : { list, lo: at, hi: at };
  }
  const list = depth === 0 ? root : pa[depth - 1].children!;
  const i = list.indexOf(pa[depth]);
  const j = list.indexOf(pb[depth]);
  if (i < 0 || j < 0) return null;
  return i < j ? { list, lo: i, hi: j } : { list, lo: j, hi: i };
}
