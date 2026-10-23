import type { Block, ContentDocument } from '../../schema/types';
import { defaultRegistry } from '../../blocks/index';
import { validateDocument } from '../../schema/validate';
import { validateStructure } from '../../core/registry';
import {
  canDrop,
  createBlock,
  duplicateBlock,
  findBlock,
  insertBlocks,
  insertionPointAfter,
  moveBlock,
  pathTo,
  removeBlocks,
  shiftBlock,
  updateBlock,
} from './operations';
import { canRedo, canUndo, commit, createHistory, redo, undo } from './history';

const b = (id: string, type = 'paragraph', children?: Block[]): Block => ({
  id,
  type,
  props: {},
  ...(children ? { children } : {}),
});
const ids = (blocks: Block[]): unknown =>
  blocks.map((x) => (x.children ? { [x.id]: ids(x.children) } : x.id));

const doc: ContentDocument = {
  version: 1,
  blocks: [
    b('a'),
    b('s', 'section', [b('cols', 'columns', [b('c1', 'column', [b('p1')]), b('c2', 'column', [])])]),
    b('z'),
  ],
};

describe('document operations', () => {
  it('finds blocks with their location', () => {
    const found = findBlock(doc, 'p1')!;
    expect(found.parent?.id).toBe('c1');
    expect(found.ancestors.map((x) => x.id)).toEqual(['s', 'cols']);
    expect(pathTo(doc, 'p1').map((x) => x.id)).toEqual(['s', 'cols', 'c1', 'p1']);
  });

  it('updates immutably, copying only the path', () => {
    const next = updateBlock(doc, 'p1', (x) => ({ ...x, props: { size: 'lead' } }));
    expect(findBlock(next, 'p1')!.block.props).toEqual({ size: 'lead' });
    expect(next.blocks[0]).toBe(doc.blocks[0]);
    expect(next.blocks[1]).not.toBe(doc.blocks[1]);
    expect(updateBlock(doc, 'missing', (x) => x)).toBe(doc);
  });

  it('inserts, removes and moves', () => {
    expect(ids(insertBlocks(doc, [b('n')], { parentId: 'c2', index: 0 }).blocks)).toEqual([
      'a',
      { s: [{ cols: [{ c1: ['p1'] }, { c2: ['n'] }] }] },
      'z',
    ]);
    expect(ids(removeBlocks(doc, ['p1', 'z']).blocks)).toEqual([
      'a',
      { s: [{ cols: [{ c1: [] }, { c2: [] }] }] },
    ]);
    expect(ids(moveBlock(doc, 'p1', { parentId: 'c2', index: 0 }).blocks)).toEqual([
      'a',
      { s: [{ cols: [{ c1: [] }, { c2: ['p1'] }] }] },
      'z',
    ]);
    // Index refers to the list before removal: moving "a" to the end of the top level.
    expect(ids(moveBlock(doc, 'a', { parentId: null, index: 3 }).blocks)).toEqual([
      { s: [{ cols: [{ c1: ['p1'] }, { c2: [] }] }] },
      'z',
      'a',
    ]);
    // Never into itself.
    expect(moveBlock(doc, 's', { parentId: 'c1', index: 0 })).toBe(doc);
  });

  it('shifts and duplicates', () => {
    expect(ids(shiftBlock(doc, 'z', -1).blocks)).toEqual([
      'a',
      'z',
      { s: [{ cols: [{ c1: ['p1'] }, { c2: [] }] }] },
    ]);
    expect(ids(shiftBlock(doc, 'a', 1).blocks)).toEqual([
      { s: [{ cols: [{ c1: ['p1'] }, { c2: [] }] }] },
      'a',
      'z',
    ]);
    expect(shiftBlock(doc, 'a', -1)).toBe(doc);
    const { doc: copied, id } = duplicateBlock(doc, 's');
    expect(copied.blocks).toHaveLength(4);
    expect(copied.blocks[2]!.id).toBe(id);
    expect(findBlock(copied, id!)!.block.children![0]!.id).not.toBe('cols');
  });

  it('creates valid blocks of every type from the registry', () => {
    for (const def of defaultRegistry.all()) {
      const block = createBlock(defaultRegistry, def.type);
      const parents = def.parents ? [] : [block];
      if (parents.length === 0) continue;
      const created: ContentDocument = { version: 1, blocks: parents };
      const result = validateDocument(created, defaultRegistry.validateOptions());
      expect(result.success ? [] : [def.type, result.errors]).toEqual([]);
      expect(validateStructure(defaultRegistry, created)).toEqual([]);
    }
    const columns = createBlock(defaultRegistry, 'columns');
    expect(columns.children).toHaveLength(2);
    expect(new Set([columns.id, ...columns.children!.map((c) => c.id)]).size).toBe(3);
  });

  it('checks drop targets against nesting rules', () => {
    expect(canDrop(defaultRegistry, doc, 'paragraph', { parentId: 'c2', index: 0 })).toBe(true);
    expect(canDrop(defaultRegistry, doc, 'paragraph', { parentId: 'cols', index: 0 })).toBe(false);
    expect(canDrop(defaultRegistry, doc, 'grid', { parentId: 'c2', index: 0 })).toBe(false);
    expect(canDrop(defaultRegistry, doc, 'column', { parentId: 'cols', index: 2 })).toBe(true);
    expect(canDrop(defaultRegistry, doc, 'section', { parentId: 'c1', index: 0 }, 's')).toBe(false);
  });

  it('finds the next valid insertion point', () => {
    expect(insertionPointAfter(defaultRegistry, doc, 'p1', 'paragraph')).toEqual({
      parentId: 'c1',
      index: 1,
    });
    // A grid cannot go inside the column (depth limit) nor next to a column, so it goes after the columns.
    expect(insertionPointAfter(defaultRegistry, doc, 'p1', 'grid')).toEqual({ parentId: 's', index: 1 });
    // A column only fits inside columns.
    expect(insertionPointAfter(defaultRegistry, doc, 'p1', 'column')).toEqual({ parentId: 'cols', index: 1 });
    expect(insertionPointAfter(defaultRegistry, doc, null, 'heading')).toEqual({ parentId: null, index: 3 });
  });
});

describe('history', () => {
  const v = (n: number): ContentDocument => ({ version: 1, blocks: [b(`v${n}`)] });

  it('undoes and redoes', () => {
    let h = createHistory(v(0));
    h = commit(h, v(1));
    h = commit(h, v(2));
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(h.present.blocks[0]!.id).toBe('v1');
    expect(canRedo(h)).toBe(true);
    h = redo(h);
    expect(h.present.blocks[0]!.id).toBe('v2');
    h = undo(undo(h));
    expect(undo(h)).toBe(h);
    h = commit(h, v(9));
    expect(canRedo(h)).toBe(false);
  });

  it('merges grouped changes within the window', () => {
    let h = createHistory(v(0));
    h = commit(h, v(1), { group: 'text:a', now: 0 });
    h = commit(h, v(2), { group: 'text:a', now: 500 });
    h = commit(h, v(3), { group: 'text:a', now: 900 });
    expect(h.past).toHaveLength(1);
    h = commit(h, v(4), { group: 'text:a', now: 5000 });
    expect(h.past).toHaveLength(2);
    h = commit(h, v(5), { group: 'text:b', now: 5100 });
    expect(h.past).toHaveLength(3);
    expect(undo(h).present.blocks[0]!.id).toBe('v4');
  });
});
