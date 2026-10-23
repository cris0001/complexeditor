import { createRegistry, type RegistryOptions } from '../core/registry';
import type { AnyBlockDefinition } from '../core/types';
import { globalBlock } from './global';
import { heading } from './heading';
import {
  accordion,
  accordionItem,
  button,
  buttons,
  card,
  stat,
  stats,
  tab,
  tabs,
  timeline,
  timelineItem,
} from './interactive';
import { column, columns, grid, section } from './layout';
import { list, listItem, table, tableCell, tableRow } from './lists';
import { beforeAfter, embed, file, gallery, hero, image, video } from './media';
import { paragraph } from './paragraph';
import { callout, code, quote, separator } from './text';

export {
  heading,
  paragraph,
  quote,
  callout,
  code,
  separator,
  list,
  listItem,
  table,
  tableRow,
  tableCell,
  section,
  columns,
  column,
  grid,
  image,
  gallery,
  beforeAfter,
  hero,
  video,
  embed,
  file,
  buttons,
  button,
  accordion,
  accordionItem,
  tabs,
  tab,
  card,
  stats,
  stat,
  timeline,
  timelineItem,
  globalBlock,
};
export { COLUMN_PRESETS, type ColumnPreset } from './layout';
export { GALLERY_LAYOUTS, Picture } from './media';
export { jsonLd } from './interactive';

/** Every built-in block, in picker order. */
export const builtinBlocks: readonly AnyBlockDefinition[] = [
  // Text
  heading,
  paragraph,
  list,
  listItem,
  quote,
  callout,
  code,
  table,
  tableRow,
  tableCell,
  separator,
  // Layout
  section,
  columns,
  column,
  grid,
  // Media
  image,
  gallery,
  beforeAfter,
  hero,
  file,
  // Video & embeds
  video,
  embed,
  // Interactive
  buttons,
  button,
  accordion,
  accordionItem,
  tabs,
  tab,
  card,
  stats,
  stat,
  timeline,
  timelineItem,
  globalBlock,
];

/**
 * Registry with all built-in blocks plus `extra` (custom blocks, or replacements of built-ins
 * with the same `type`).
 */
export function createDefaultRegistry(extra: readonly AnyBlockDefinition[] = [], options?: RegistryOptions) {
  return createRegistry([...builtinBlocks, ...extra], options);
}

export const defaultRegistry = createDefaultRegistry();
