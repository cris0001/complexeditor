import { useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEditor } from '../context';
import { createBlock, findBlock, withNewIds, type BlockTemplate } from '../state/operations';
import type { DropResult } from './targets';
import { canvasDropTarget, treeDropTarget } from './targets';

/** What is being dragged: a new block (palette, saved style, global block) or an existing one. */
export type DragSource =
  | { kind: 'new'; type: string; template?: BlockTemplate; label: string }
  | { kind: 'move'; id: string; label: string };

export interface DragState {
  source: DragSource;
  x: number;
  y: number;
  result: DropResult | null;
}

const THRESHOLD = 5;
const SCROLL_EDGE = 48;

function scrollableAncestor(el: Element | null): HTMLElement | null {
  for (let node = el as HTMLElement | null; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight)
      return node;
  }
  return null;
}

/**
 * Pointer-based drag & drop shared by the palette, the canvas action bar and the structure tree.
 * Works with mouse, pen and touch (pointer events); Escape cancels.
 */
export function useDrag() {
  const { store, registry, actions } = useEditor();

  return useCallback(
    (event: ReactPointerEvent, source: DragSource) => {
      if (event.button !== 0) return;
      const startX = event.clientX;
      const startY = event.clientY;
      let started = false;
      let frame = 0;
      let scroller: HTMLElement | null = null;
      let scrollSpeed = 0;

      const type = () =>
        source.kind === 'new'
          ? source.type
          : (findBlock(store.getState().history.present, source.id)?.block.type ?? '');

      const compute = (x: number, y: number): DropResult | null => {
        const hit = document.elementFromPoint(x, y);
        const doc = store.getState().history.present;
        const query = {
          doc,
          registry,
          type: type(),
          movingId: source.kind === 'move' ? source.id : undefined,
          x,
          y,
        };
        const tree = hit?.closest<HTMLElement>('.ce-ed-tree');
        if (tree) return treeDropTarget(tree, hit, query);
        const canvas = hit?.closest<HTMLElement>('.ce-ed-canvas');
        if (canvas) return canvasDropTarget(canvas, hit, query);
        return null;
      };

      const autoscroll = () => {
        if (scroller && scrollSpeed) scroller.scrollTop += scrollSpeed;
        frame = requestAnimationFrame(autoscroll);
      };

      const onMove = (e: PointerEvent) => {
        if (!started) {
          if (Math.hypot(e.clientX - startX, e.clientY - startY) < THRESHOLD) return;
          started = true;
          document.body.classList.add('ce-ed-dragging');
          frame = requestAnimationFrame(autoscroll);
        }
        e.preventDefault();
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        scroller = scrollableAncestor(hit);
        if (scroller) {
          const r = scroller.getBoundingClientRect();
          scrollSpeed = e.clientY < r.top + SCROLL_EDGE ? -12 : e.clientY > r.bottom - SCROLL_EDGE ? 12 : 0;
        }
        store.set({ drag: { source, x: e.clientX, y: e.clientY, result: compute(e.clientX, e.clientY) } });
      };

      const finish = (drop: boolean) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey, true);
        cancelAnimationFrame(frame);
        document.body.classList.remove('ce-ed-dragging');
        const result = store.getState().drag?.result;
        store.set({ drag: null });
        if (!drop || !started || !result) return;
        if (source.kind === 'move') actions.moveTo(source.id, result.target);
        else if (source.template) actions.insertBlocksAt([withNewIds(source.template)], result.target);
        else actions.insertBlocksAt([createBlock(registry, source.type)], result.target);
      };
      const onUp = () => finish(true);
      const onCancel = () => finish(false);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          finish(false);
        }
      };

      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey, true);
    },
    [store, registry, actions],
  );
}
