import type { Block, ContentDocument, InlineContent } from '../schema/types';
import type { Registry } from '../core/types';
import { normalizeInline } from './tiptap/convert';
import {
  createBlock,
  duplicateBlock,
  findBlock,
  insertBlocks,
  insertionPointAfter,
  moveBlock,
  removeBlocks,
  shiftBlock,
  updateBlock,
  withNewIds,
  type DropTarget,
} from './state/operations';
import type { EditorStore } from './state/store';
import type { GlobalBlock } from './types';

/** Blocks that behave like lines of text: Enter splits them, Backspace merges them. */
export const FLOW_TEXT = new Set(['paragraph', 'heading', 'quote', 'list-item']);

const textLength = (content: InlineContent | undefined) =>
  (content ?? []).reduce((n, node) => n + node.text.length, 0);

/** Text offset where `content` is split; marks are kept on both sides. */
export function splitInline(
  content: InlineContent | undefined,
  offset: number,
): [InlineContent, InlineContent] {
  const before: InlineContent = [];
  const after: InlineContent = [];
  let position = 0;
  for (const node of content ?? []) {
    const end = position + node.text.length;
    if (end <= offset) before.push(node);
    else if (position >= offset) after.push(node);
    else {
      before.push({ ...node, text: node.text.slice(0, offset - position) });
      after.push({ ...node, text: node.text.slice(offset - position) });
    }
    position = end;
  }
  return [normalizeInline(before), normalizeInline(after)];
}

export interface Actions {
  /** Enter inside a text block: split at the caret into a new block after it. */
  split(blockId: string, before: InlineContent, after: InlineContent): void;
  /** Backspace at the start: merge into the previous text block or remove an empty block. */
  mergeBackward(blockId: string): boolean;
  /** Delete at the end: pull the next text block's content into this one. */
  mergeForward(blockId: string): boolean;
  indent(blockId: string): boolean;
  outdent(blockId: string): boolean;
  /** Replaces a paragraph by another block type (markdown shortcuts, slash menu). */
  transform(blockId: string, type: string, props?: Record<string, unknown>, content?: InlineContent): void;
  /** Inserts a new block after `afterId` (or at the end) at the closest valid place and selects it. */
  insert(type: string, afterId: string | null, init?: (block: Block) => Block): string | null;
  insertBlocksAt(blocks: Block[], target: DropTarget): void;
  remove(ids: string[]): void;
  duplicate(id: string): void;
  move(id: string, direction: -1 | 1): void;
  moveTo(id: string, target: DropTarget): void;
  select(id: string | null): void;
  selectParent(id: string): void;
  /** Focus the previous / next text field (arrow keys at the edges). */
  focusSibling(blockId: string, direction: -1 | 1): boolean;
  update(id: string, update: (block: Block) => Block, group?: string): void;
  /** Replaces a global block reference with an editable copy of its content. */
  detachGlobal(id: string, globals: Record<string, GlobalBlock>, locale?: string): void;
}

/** Flattened list of blocks that have editable inline content, in reading order. */
function textBlocks(doc: ContentDocument, registry: Registry): Block[] {
  const list: Block[] = [];
  const visit = (blocks: Block[]) =>
    blocks.forEach((block) => {
      if (registry.get(block.type)?.content) list.push(block);
      if (block.children) visit(block.children);
    });
  visit(doc.blocks);
  return list;
}

export function createActions(store: EditorStore, registry: Registry): Actions {
  const doc = () => store.getState().history.present;
  const focus = (blockId: string, at: 'start' | 'end' | number) =>
    store.set({ focusRequest: { blockId, at }, selection: blockId });

  const actions: Actions = {
    split(blockId, before, after) {
      const location = findBlock(doc(), blockId);
      if (!location) return;
      const { block, parent } = location;
      // Enter in an empty list item leaves the list.
      if (
        block.type === 'list-item' &&
        !textLength(before) &&
        !textLength(after) &&
        parent?.type === 'list'
      ) {
        const listLocation = findBlock(doc(), parent.id)!;
        const paragraph = createBlock(registry, 'paragraph');
        store.change((d) => {
          let next = removeBlocks(d, [blockId]);
          if (!findBlock(next, parent.id)?.block.children?.length) next = removeBlocks(next, [parent.id]);
          const index = findBlock(next, parent.id) ? listLocation.index + 1 : listLocation.index;
          return insertBlocks(next, [paragraph], { parentId: listLocation.parent?.id ?? null, index });
        });
        focus(paragraph.id, 'start');
        return;
      }
      const nextType = block.type === 'list-item' ? 'list-item' : 'paragraph';
      const created = { ...createBlock(registry, nextType), content: after };
      store.change((d) =>
        insertBlocks(
          updateBlock(d, blockId, (b) => ({ ...b, content: before })),
          [created],
          {
            parentId: parent?.id ?? null,
            index: location.index + 1,
          },
        ),
      );
      focus(created.id, 'start');
    },

    mergeBackward(blockId) {
      const current = doc();
      const location = findBlock(current, blockId);
      if (!location || !FLOW_TEXT.has(location.block.type)) return false;
      const { block } = location;
      // Backspace at the start of a heading or quote turns it into a paragraph first.
      if (block.type === 'heading' || block.type === 'quote') {
        actions.transform(blockId, 'paragraph', {}, block.content);
        return true;
      }
      const list = textBlocks(current, registry);
      const index = list.findIndex((b) => b.id === blockId);
      const previous = list[index - 1];
      const empty = !textLength(block.content);
      if (!previous || !FLOW_TEXT.has(previous.type)) {
        if (empty && current.blocks.length > 1 && block.type === 'paragraph') {
          const next = list[index + 1];
          store.change((d) => removeBlocks(d, [blockId]));
          if (next) focus(next.id, 'start');
          return true;
        }
        return false;
      }
      const offset = textLength(previous.content);
      store.change((d) => {
        let next = updateBlock(d, previous.id, (b) => ({
          ...b,
          content: normalizeInline([...(b.content ?? []), ...(block.content ?? [])]),
        }));
        // Nested list items move up to the previous item.
        if (block.children?.length) {
          next = updateBlock(next, previous.id, (b) => ({
            ...b,
            children: [...(b.children ?? []), ...block.children!],
          }));
        }
        next = removeBlocks(next, [blockId]);
        // Remove a list that became empty.
        const parent = location.parent;
        if (parent?.type === 'list' && !findBlock(next, parent.id)?.block.children?.length)
          next = removeBlocks(next, [parent.id]);
        return next;
      });
      focus(previous.id, offset);
      return true;
    },

    mergeForward(blockId) {
      const current = doc();
      const list = textBlocks(current, registry);
      const index = list.findIndex((b) => b.id === blockId);
      const block = list[index];
      const next = list[index + 1];
      if (!block || !next || !FLOW_TEXT.has(block.type) || !FLOW_TEXT.has(next.type)) return false;
      const offset = textLength(block.content);
      store.change((d) =>
        removeBlocks(
          updateBlock(d, blockId, (b) => ({
            ...b,
            content: normalizeInline([...(b.content ?? []), ...(next.content ?? [])]),
          })),
          [next.id],
        ),
      );
      focus(blockId, offset);
      return true;
    },

    indent(blockId) {
      const location = findBlock(doc(), blockId);
      if (!location || location.block.type !== 'list-item' || location.index === 0) return false;
      const previous = (location.parent?.children ?? [])[location.index - 1]!;
      store.change((d) =>
        moveBlock(d, blockId, { parentId: previous.id, index: previous.children?.length ?? 0 }),
      );
      focus(blockId, 'end');
      return true;
    },

    outdent(blockId) {
      const location = findBlock(doc(), blockId);
      if (!location || location.block.type !== 'list-item' || location.parent?.type !== 'list-item')
        return false;
      const parentLocation = findBlock(doc(), location.parent.id)!;
      store.change((d) =>
        moveBlock(d, blockId, {
          parentId: parentLocation.parent?.id ?? null,
          index: parentLocation.index + 1,
        }),
      );
      focus(blockId, 'end');
      return true;
    },

    transform(blockId, type, props = {}, content) {
      const location = findBlock(doc(), blockId);
      if (!location) return;
      const created = createBlock(registry, type);
      const def = registry.get(type);
      let replacement: Block = { ...created, props: { ...created.props, ...props } };
      if (type === 'list') {
        const item = replacement.children?.[0];
        replacement = {
          ...replacement,
          children: [{ ...(item ?? createBlock(registry, 'list-item')), content: content ?? [] }],
        };
      } else if (def?.content) {
        replacement = { ...replacement, content: content ?? [] };
      }
      // Keep common style settings when switching between text blocks.
      if (location.block.style && FLOW_TEXT.has(type)) replacement.style = location.block.style;
      store.change((d) =>
        insertBlocks(removeBlocks(d, [blockId]), [replacement], {
          parentId: location.parent?.id ?? null,
          index: location.index,
        }),
      );
      const focusTarget = type === 'list' ? replacement.children![0]!.id : replacement.id;
      if (def?.content || type === 'list') focus(focusTarget, 'end');
      else store.set({ selection: replacement.id, focusRequest: null });
    },

    insert(type, afterId, init) {
      const current = doc();
      const target = insertionPointAfter(registry, current, afterId, type);
      if (!target) return null;
      let block = createBlock(registry, type);
      if (init) block = init(block);
      store.change((d) => insertBlocks(d, [block], target), { select: block.id });
      if (registry.get(type)?.content) focus(block.id, 'start');
      return block.id;
    },

    insertBlocksAt(blocks, target) {
      const fresh = blocks.map((b) => withNewIds(structuredClone(b)));
      store.change((d) => insertBlocks(d, fresh, target), { select: fresh[0]?.id ?? null });
      const first = fresh[0];
      if (first && registry.get(first.type)?.content) focus(first.id, 'start');
    },

    remove(ids) {
      const current = doc();
      const first = ids[0] ? findBlock(current, ids[0]) : undefined;
      store.change((d) => removeBlocks(d, ids), { select: null });
      // Keep the keyboard user in place: select the block that took the removed one's spot.
      if (first) {
        const siblings = first.parent ? findBlock(doc(), first.parent.id)?.block.children : doc().blocks;
        const neighbour = siblings?.[Math.min(first.index, (siblings?.length ?? 1) - 1)] ?? first.parent;
        store.set({ selection: neighbour?.id ?? null });
      }
    },

    duplicate(id) {
      let copyId: string | undefined;
      store.change((d) => {
        const result = duplicateBlock(d, id);
        copyId = result.id;
        return result.doc;
      });
      if (copyId) store.set({ selection: copyId });
    },

    move(id, direction) {
      store.change((d) => shiftBlock(d, id, direction));
    },

    moveTo(id, target) {
      store.change((d) => moveBlock(d, id, target), { select: id });
    },

    select(id) {
      store.set({ selection: id, slash: null });
    },

    selectParent(id) {
      const parent = findBlock(doc(), id)?.parent;
      if (parent) store.set({ selection: parent.id, editing: null });
    },

    focusSibling(blockId, direction) {
      const list = textBlocks(doc(), registry);
      const index = list.findIndex((b) => b.id === blockId);
      const target = list[index + direction];
      if (!target) return false;
      focus(target.id, direction < 0 ? 'end' : 'start');
      return true;
    },

    update(id, update, group) {
      store.change((d) => updateBlock(d, id, update), group ? { group } : undefined);
    },

    detachGlobal(id, globals, locale) {
      const location = findBlock(doc(), id);
      const ref = location?.block.props.ref;
      const global = typeof ref === 'string' ? globals[ref] : undefined;
      if (!location || !global) return;
      const blocks =
        (locale ? global.blocks[locale] : undefined) ?? Object.values(global.blocks).find(Boolean) ?? [];
      const copies = blocks.map((b) => withNewIds(structuredClone(b)));
      store.change(
        (d) =>
          insertBlocks(removeBlocks(d, [id]), copies, {
            parentId: location.parent?.id ?? null,
            index: location.index,
          }),
        { select: copies[0]?.id ?? null },
      );
    },
  };
  return actions;
}

/** Markdown shortcuts typed at the start of a paragraph (followed by a space). */
export const MARKDOWN_SHORTCUTS: { pattern: RegExp; type: string; props?: Record<string, unknown> }[] = [
  { pattern: /^#{2}$/, type: 'heading', props: { level: 2 } },
  { pattern: /^#{3}$/, type: 'heading', props: { level: 3 } },
  { pattern: /^#{4}$/, type: 'heading', props: { level: 4 } },
  { pattern: /^[-*]$/, type: 'list', props: { style: 'bullet' } },
  { pattern: /^1[.)]$/, type: 'list', props: { style: 'number' } },
  { pattern: /^\[\s?\]$/, type: 'list', props: { style: 'check' } },
  { pattern: /^>$/, type: 'quote' },
];
