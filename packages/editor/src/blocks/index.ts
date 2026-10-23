import { createRegistry, type RegistryOptions } from '../core/registry';
import type { AnyBlockDefinition } from '../core/types';
import { heading } from './heading';
import { column, columns, grid, section } from './layout';
import { paragraph } from './paragraph';

export { heading, paragraph, section, columns, column, grid };
export { COLUMN_PRESETS, type ColumnPreset } from './layout';

/** Every built-in block, in picker order. */
export const builtinBlocks: readonly AnyBlockDefinition[] = [
  heading,
  paragraph,
  section,
  columns,
  column,
  grid,
];

/**
 * Registry with all built-in blocks plus `extra` (custom blocks, or replacements of built-ins
 * with the same `type`).
 */
export function createDefaultRegistry(extra: readonly AnyBlockDefinition[] = [], options?: RegistryOptions) {
  return createRegistry([...builtinBlocks, ...extra], options);
}

export const defaultRegistry = createDefaultRegistry();
