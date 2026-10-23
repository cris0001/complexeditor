import type { Block } from '../schema/types';
import type { PropsOf, SlotsOf } from './define-block';
import type { AnyBlockDefinition, BlockClassNames, ClassNamesConfig } from './types';

type SlotMap<S extends string> = Partial<Record<S, string>>;

/** Class configuration of one block type, with its slot names and props typed. */
export interface TypedBlockClassNames<S extends string, P> {
  slots?: SlotMap<S> | ((args: { props: P; block: Block }) => SlotMap<S>);
  variants?: Record<string, SlotMap<S>>;
}

export type TypedClassNames<D extends readonly AnyBlockDefinition[]> = {
  [K in D[number] as K['type']]?: TypedBlockClassNames<SlotsOf<K>, PropsOf<K>>;
} & {
  /** Classes for every block (only the common `root` slot is known). */
  '*'?: TypedBlockClassNames<'root', Record<string, unknown>>;
};

/**
 * Typed `classNames` config: autocompletes block types, slot names and props.
 *
 * ```ts
 * const classNames = defineClassNames([...builtinBlocks, note], {
 *   heading: { slots: ({ props }) => ({ text: props.level === 2 ? 'tracking-tight' : '' }) },
 *   image: { variants: { framed: { root: 'p-2 bg-white shadow' } } },
 * });
 * ```
 */
export function defineClassNames<const D extends readonly AnyBlockDefinition[]>(
  _blocks: D,
  // Block types come from `blocks` only; the config is checked against them.
  config: NoInfer<TypedClassNames<D>>,
): ClassNamesConfig {
  return config as unknown as Record<string, BlockClassNames>;
}
