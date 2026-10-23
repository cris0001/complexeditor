import type { Block } from '../../schema/types';

type Obj = Record<string, unknown>;

/** Reads `a.b.c` from an object. */
export function getPath(source: unknown, path: string): unknown {
  let value: unknown = source;
  for (const key of path.split('.')) {
    if (value === null || typeof value !== 'object') return undefined;
    value = (value as Obj)[key];
  }
  return value;
}

/**
 * Immutably sets `a.b.c`. `undefined` removes the key, and objects that become empty are removed
 * too, so resetting a setting leaves no `{}` behind in the document.
 */
export function setPath<T extends Obj>(source: T, path: string, value: unknown): T {
  const [key, ...rest] = path.split('.');
  if (!key) return source;
  const current = (source ?? {}) as Obj;
  let next: unknown = value;
  if (rest.length) {
    const child = current[key];
    next = setPath(
      (child && typeof child === 'object' && !Array.isArray(child) ? child : {}) as Obj,
      rest.join('.'),
      value,
    );
    if (next && typeof next === 'object' && Object.keys(next).length === 0) next = undefined;
  }
  const result = { ...current } as Obj;
  if (next === undefined) delete result[key];
  else result[key] = next;
  return result as T;
}

/**
 * Field paths used by the inspector: `style.*` and `classes.*` address the block's common
 * settings, everything else lives in `props`.
 */
export function getBlockField(block: Block, name: string): unknown {
  if (name.startsWith('style.')) return getPath(block.style, name.slice(6));
  if (name.startsWith('classes.')) return getPath(block.classes, name.slice(8));
  return getPath(block.props, name);
}

export function setBlockField(block: Block, name: string, value: unknown): Block {
  if (name.startsWith('style.')) {
    const style = setPath((block.style ?? {}) as Obj, name.slice(6), value);
    const { style: _old, ...rest } = block;
    return Object.keys(style).length ? { ...rest, style } : rest;
  }
  if (name.startsWith('classes.')) {
    const classes = setPath((block.classes ?? {}) as Obj, name.slice(8), value === '' ? undefined : value);
    const { classes: _old, ...rest } = block;
    return Object.keys(classes).length ? { ...rest, classes: classes as Block['classes'] } : rest;
  }
  return { ...block, props: setPath(block.props, name, value) };
}
