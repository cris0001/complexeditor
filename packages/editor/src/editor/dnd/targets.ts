import type { ContentDocument } from '../../schema/types';
import type { Registry } from '../../core/types';
import { canDrop, findBlock, type DropTarget } from '../state/operations';

export interface Indicator {
  /** Viewport coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'line' | 'box';
}

export interface DropResult {
  target: DropTarget;
  indicator: Indicator;
}

interface Query {
  doc: ContentDocument;
  registry: Registry;
  /** Type of the dragged block. */
  type: string;
  /** Id of the block being moved (it cannot be dropped into itself). */
  movingId?: string;
  x: number;
  y: number;
}

const blockElement = (root: ParentNode, id: string) =>
  root.querySelector<HTMLElement>(`[data-ce-id="${CSS.escape(id)}"]`);

/** Siblings laid out side by side (columns, buttons, grid rows) take left/right drops. */
function isHorizontal(el: HTMLElement, siblings: HTMLElement[]): boolean {
  const rect = el.getBoundingClientRect();
  return siblings.some((other) => {
    if (other === el) return false;
    const r = other.getBoundingClientRect();
    return Math.abs(r.top - rect.top) < rect.height / 2 && Math.abs(r.left - rect.left) > 4;
  });
}

function lineAt(rect: DOMRect, edge: 'top' | 'bottom' | 'left' | 'right'): Indicator {
  const t = 3;
  if (edge === 'top')
    return { x: rect.left, y: rect.top - t / 2, width: rect.width, height: t, kind: 'line' };
  if (edge === 'bottom')
    return { x: rect.left, y: rect.bottom - t / 2, width: rect.width, height: t, kind: 'line' };
  if (edge === 'left')
    return { x: rect.left - t / 2, y: rect.top, width: t, height: rect.height, kind: 'line' };
  return { x: rect.right - t / 2, y: rect.top, width: t, height: rect.height, kind: 'line' };
}

/** Insertion index among `childIds` closest to the pointer, plus an indicator line. */
function indexAmong(
  root: ParentNode,
  childIds: string[],
  x: number,
  y: number,
): { index: number; indicator?: Indicator } {
  const elements = childIds
    .map((id) => blockElement(root, id))
    .filter((el): el is HTMLElement => Boolean(el));
  if (!elements.length) return { index: 0 };
  const horizontal = isHorizontal(elements[0]!, elements);
  for (let i = 0; i < elements.length; i++) {
    const rect = elements[i]!.getBoundingClientRect();
    const before = horizontal
      ? y < rect.bottom && x < rect.left + rect.width / 2
      : y < rect.top + rect.height / 2;
    if (before) return { index: i, indicator: lineAt(rect, horizontal ? 'left' : 'top') };
  }
  const last = elements[elements.length - 1]!.getBoundingClientRect();
  return { index: elements.length, indicator: lineAt(last, horizontal ? 'right' : 'bottom') };
}

/** Finds where a block would land in the canvas for the pointer position. */
export function canvasDropTarget(canvas: HTMLElement, hit: Element | null, query: Query): DropResult | null {
  const { doc, registry, type, movingId, x, y } = query;
  const valid = (target: DropTarget) => canDrop(registry, doc, type, target, movingId);

  // 1. An empty container zone.
  const zone = hit?.closest<HTMLElement>('[data-ce-drop-parent]');
  if (zone && canvas.contains(zone)) {
    const parentId = zone.dataset.ceDropParent || null;
    const target = { parentId, index: 0 };
    if (valid(target)) {
      const r = zone.getBoundingClientRect();
      return { target, indicator: { x: r.left, y: r.top, width: r.width, height: r.height, kind: 'box' } };
    }
  }

  // 2. Walk up from the deepest block under the pointer.
  let el = hit?.closest<HTMLElement>('[data-ce-id]') ?? null;
  while (el && canvas.contains(el)) {
    const id = el.dataset.ceId!;
    const location = findBlock(doc, id);
    if (!location) break;
    const rect = el.getBoundingClientRect();
    const children = location.block.children ?? [];
    const edge = Math.min(12, rect.height / 4);
    const inner = y > rect.top + edge && y < rect.bottom - edge;

    // Inside a container that already has children.
    if (children.length && inner && id !== movingId) {
      const { index, indicator } = indexAmong(
        el,
        children.map((c) => c.id),
        x,
        y,
      );
      const target = { parentId: id, index };
      if (indicator && valid(target)) return { target, indicator };
    }

    // Before / after the block itself.
    const parentId = location.parent?.id ?? null;
    const siblingIds = (location.parent?.children ?? doc.blocks).map((b) => b.id);
    const siblings = siblingIds
      .map((sid) => blockElement(canvas, sid))
      .filter((s): s is HTMLElement => Boolean(s));
    const horizontal = isHorizontal(el, siblings);
    const before = horizontal ? x < rect.left + rect.width / 2 : y < rect.top + rect.height / 2;
    const target = { parentId, index: location.index + (before ? 0 : 1) };
    if (valid(target)) {
      return {
        target,
        indicator: lineAt(rect, horizontal ? (before ? 'left' : 'right') : before ? 'top' : 'bottom'),
      };
    }
    el = el.parentElement?.closest<HTMLElement>('[data-ce-id]') ?? null;
  }

  // 3. Top level of the document.
  const doc_ = canvas.querySelector<HTMLElement>('.ce-document');
  if (!doc_) return null;
  if (!doc.blocks.length) {
    const target = { parentId: null, index: 0 };
    const r = doc_.getBoundingClientRect();
    return valid(target)
      ? {
          target,
          indicator: { x: r.left, y: r.top, width: r.width, height: Math.max(r.height, 40), kind: 'box' },
        }
      : null;
  }
  const { index, indicator } = indexAmong(
    canvas,
    doc.blocks.map((b) => b.id),
    x,
    y,
  );
  const target = { parentId: null, index };
  return indicator && valid(target) ? { target, indicator } : null;
}

/** Drop target in the structure tree: upper quarter = before, lower quarter = after, middle = inside. */
export function treeDropTarget(tree: HTMLElement, hit: Element | null, query: Query): DropResult | null {
  const { doc, registry, type, movingId, y } = query;
  const valid = (target: DropTarget) => canDrop(registry, doc, type, target, movingId);
  const row = hit?.closest<HTMLElement>('[data-ce-tree-id]');
  if (!row || !tree.contains(row)) {
    const target = { parentId: null, index: doc.blocks.length };
    const r = tree.getBoundingClientRect();
    return valid(target)
      ? { target, indicator: { x: r.left, y: r.bottom - 2, width: r.width, height: 3, kind: 'line' } }
      : null;
  }
  const id = row.dataset.ceTreeId!;
  const location = findBlock(doc, id);
  if (!location) return null;
  const rect = row.getBoundingClientRect();
  const relative = (y - rect.top) / rect.height;
  const isContainer = Boolean(registry.get(location.block.type)?.container);
  const candidates: { target: DropTarget; indicator: Indicator }[] = [];
  const inside = { parentId: id, index: location.block.children?.length ?? 0 };
  const before = { parentId: location.parent?.id ?? null, index: location.index };
  const after = { parentId: location.parent?.id ?? null, index: location.index + 1 };
  const box = { x: rect.left, y: rect.top, width: rect.width, height: rect.height, kind: 'box' as const };
  if (relative < 0.25) candidates.push({ target: before, indicator: lineAt(rect, 'top') });
  else if (relative > 0.75 || !isContainer)
    candidates.push({
      target: relative < 0.5 ? before : after,
      indicator: lineAt(rect, relative < 0.5 ? 'top' : 'bottom'),
    });
  if (isContainer && id !== movingId) candidates.push({ target: inside, indicator: box });
  candidates.push({ target: after, indicator: lineAt(rect, 'bottom') });
  return candidates.find((c) => valid(c.target)) ?? null;
}
