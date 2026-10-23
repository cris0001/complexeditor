import { createId } from '../../schema/ids';
import type { Block, ContentDocument } from '../../schema/types';
import { canContain } from '../../core/registry';
import type { Registry } from '../../core/types';

/** Where a block lives: its parent (null = top level), index among siblings and ancestors (outermost first). */
export interface BlockLocation {
  block: Block;
  parent: Block | null;
  index: number;
  ancestors: Block[];
}

/** Insertion point: `index` among the children of `parentId` (null = top level). */
export interface DropTarget {
  parentId: string | null;
  index: number;
}

export function findBlock(doc: ContentDocument, id: string): BlockLocation | undefined {
  const visit = (blocks: Block[], parent: Block | null, ancestors: Block[]): BlockLocation | undefined => {
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index]!;
      if (block.id === id) return { block, parent, index, ancestors };
      if (block.children) {
        const found = visit(block.children, block, parent ? [...ancestors, parent] : ancestors);
        if (found) return found;
      }
    }
    return undefined;
  };
  return visit(doc.blocks, null, []);
}

/** Ancestors of a block plus the block itself, outermost first. */
export function pathTo(doc: ContentDocument, id: string): Block[] {
  const location = findBlock(doc, id);
  if (!location) return [];
  return [...location.ancestors, ...(location.parent ? [location.parent] : []), location.block];
}

/** Children of `parentId` (or the top-level blocks). */
export function childrenOf(doc: ContentDocument, parentId: string | null): Block[] {
  if (parentId === null) return doc.blocks;
  return findBlock(doc, parentId)?.block.children ?? [];
}

/** Replaces the children list of `parentId` immutably. */
function setChildren(doc: ContentDocument, parentId: string | null, children: Block[]): ContentDocument {
  if (parentId === null) return { ...doc, blocks: children };
  return updateBlock(doc, parentId, (block) => ({ ...block, children }));
}

/** Applies `update` to the block with `id`, copying only the path to it. */
export function updateBlock(
  doc: ContentDocument,
  id: string,
  update: (block: Block) => Block,
): ContentDocument {
  let changed = false;
  const visit = (blocks: Block[]): Block[] => {
    let result: Block[] | undefined;
    blocks.forEach((block, i) => {
      let next = block;
      if (block.id === id) next = update(block);
      else if (block.children) {
        const children = visit(block.children);
        if (children !== block.children) next = { ...block, children };
      }
      if (next !== block) {
        result ??= [...blocks];
        result[i] = next;
        changed = true;
      }
    });
    return result ?? blocks;
  };
  const blocks = visit(doc.blocks);
  return changed ? { ...doc, blocks } : doc;
}

/** Gives the block and all its descendants fresh ids (for copies, templates and new blocks). */
export function withNewIds(block: Omit<Block, 'id'> & { id?: string }): Block {
  return {
    ...block,
    id: createId(),
    children: block.children?.map((child) => withNewIds(child)),
  } as Block;
}

/** Creates a new block of `type` from its definition (`create()` or default props). */
export function createBlock(registry: Registry, type: string): Block {
  const def = registry.get(type);
  if (!def) throw new Error(`Unknown block type "${type}"`);
  const template = def.create?.() ?? {
    type,
    props: structuredClone(def.defaultProps),
    ...(def.content ? { content: [] } : {}),
    ...(def.container ? { children: def.container.defaultChild ? [def.container.defaultChild()] : [] } : {}),
  };
  const block = withNewIds(structuredClone(template));
  // Structural containers start with their minimum number of children.
  const min = def.container?.minChildren ?? 0;
  if (def.container?.defaultChild && (block.children?.length ?? 0) < min) {
    const missing = min - (block.children?.length ?? 0);
    block.children = [
      ...(block.children ?? []),
      ...Array.from({ length: missing }, () => withNewIds(def.container!.defaultChild!())),
    ];
  }
  return block;
}

export function insertBlocks(doc: ContentDocument, blocks: Block[], target: DropTarget): ContentDocument {
  const siblings = childrenOf(doc, target.parentId);
  const index = Math.max(0, Math.min(target.index, siblings.length));
  return setChildren(doc, target.parentId, [
    ...siblings.slice(0, index),
    ...blocks,
    ...siblings.slice(index),
  ]);
}

export function removeBlocks(doc: ContentDocument, ids: Iterable<string>): ContentDocument {
  const remove = new Set(ids);
  const visit = (blocks: Block[]): Block[] => {
    let changed = false;
    const result: Block[] = [];
    for (const block of blocks) {
      if (remove.has(block.id)) {
        changed = true;
        continue;
      }
      if (block.children) {
        const children = visit(block.children);
        if (children !== block.children) {
          changed = true;
          result.push({ ...block, children });
          continue;
        }
      }
      result.push(block);
    }
    return changed ? result : blocks;
  };
  const blocks = visit(doc.blocks);
  return blocks === doc.blocks ? doc : { ...doc, blocks };
}

/** Moves a block to `target`. The index refers to the target list before the block is removed. */
export function moveBlock(doc: ContentDocument, id: string, target: DropTarget): ContentDocument {
  const location = findBlock(doc, id);
  if (!location) return doc;
  // A block cannot move into itself or its descendants.
  if (target.parentId !== null && pathTo(doc, target.parentId).some((b) => b.id === id)) return doc;
  let index = target.index;
  const sameParent = (location.parent?.id ?? null) === target.parentId;
  if (sameParent && location.index < index) index -= 1;
  if (sameParent && location.index === index) return doc;
  return insertBlocks(removeBlocks(doc, [id]), [location.block], { parentId: target.parentId, index });
}

/** Moves a block one position up (-1) or down (+1) among its siblings. */
export function shiftBlock(doc: ContentDocument, id: string, direction: -1 | 1): ContentDocument {
  const location = findBlock(doc, id);
  if (!location) return doc;
  const siblings = childrenOf(doc, location.parent?.id ?? null);
  const index = location.index + direction;
  if (index < 0 || index >= siblings.length) return doc;
  return moveBlock(doc, id, {
    parentId: location.parent?.id ?? null,
    index: direction > 0 ? index + 1 : index,
  });
}

/** Inserts a deep copy right after the original. Returns the new document and the copy's id. */
export function duplicateBlock(doc: ContentDocument, id: string): { doc: ContentDocument; id?: string } {
  const location = findBlock(doc, id);
  if (!location) return { doc };
  const copy = withNewIds(structuredClone(location.block));
  return {
    doc: insertBlocks(doc, [copy], { parentId: location.parent?.id ?? null, index: location.index + 1 }),
    id: copy.id,
  };
}

/** Whether `type` may be dropped at `target` (registry placement and nesting rules). */
export function canDrop(
  registry: Registry,
  doc: ContentDocument,
  type: string,
  target: DropTarget,
  movingId?: string,
): boolean {
  if (target.parentId === null) return canContain(registry, null, type, []);
  if (movingId && pathTo(doc, target.parentId).some((b) => b.id === movingId)) return false;
  const location = findBlock(doc, target.parentId);
  if (!location) return false;
  const ancestors = [...location.ancestors, ...(location.parent ? [location.parent] : [])];
  const rules = registry.get(location.block.type)?.container;
  if (rules?.maxChildren !== undefined) {
    const count = location.block.children?.length ?? 0;
    const alreadyInside = movingId && location.block.children?.some((c) => c.id === movingId);
    if (!alreadyInside && count >= rules.maxChildren) return false;
  }
  // When moving a container, its own nested containers count toward the depth limit too.
  return canContain(registry, location.block, type, ancestors);
}

/**
 * The closest valid insertion point "after" a block: inside it when it is an empty-friendly
 * container, otherwise after it among its siblings (walking up until the type is allowed).
 */
export function insertionPointAfter(
  registry: Registry,
  doc: ContentDocument,
  afterId: string | null,
  type: string,
): DropTarget | null {
  if (afterId === null) {
    const target = { parentId: null, index: doc.blocks.length };
    return canDrop(registry, doc, type, target) ? target : null;
  }
  const chain = pathTo(doc, afterId);
  for (let i = chain.length - 1; i >= 0; i--) {
    const block = chain[i]!;
    const parent = chain[i - 1] ?? null;
    const siblings = childrenOf(doc, parent?.id ?? null);
    const target = { parentId: parent?.id ?? null, index: siblings.findIndex((b) => b.id === block.id) + 1 };
    if (canDrop(registry, doc, type, target)) return target;
  }
  return null;
}
