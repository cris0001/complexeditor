import type { Block } from '../schema/types';
import type { BlockDefinition, RenderContext, SlotClasses } from './types';

type ClassValue = string | false | null | undefined;

/** Joins class names, dropping empty values and duplicates. */
export function cx(...values: ClassValue[]): string {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const name of value.split(/\s+/)) if (name) seen.add(name);
  }
  return [...seen].join(' ');
}

/** `acme/note` → `acme-note`. */
export const typeClass = (type: string) => `ce-${type.replace(/\//g, '-')}`;

function projectSlotClasses(ctx: RenderContext, block: Block, props: Record<string, unknown>): SlotClasses[] {
  const config = ctx.classNames?.[block.type];
  const all = ctx.classNames?.['*'];
  const result: SlotClasses[] = [];
  for (const entry of [all, config]) {
    if (!entry) continue;
    const slots = typeof entry.slots === 'function' ? entry.slots({ props, block }) : entry.slots;
    if (slots) result.push(slots);
    const variant = block.style?.variant ? entry.variants?.[block.style.variant] : undefined;
    if (variant) result.push(variant);
  }
  return result;
}

/**
 * Builds the `slot()` function for a block: `ce-{type}__{slot}` (+ `--modifier`s) followed by
 * project classes (global config, variant config, then classes stored in the document).
 */
export function createSlotResolver(
  ctx: RenderContext,
  def: BlockDefinition,
  block: Block,
  props: Record<string, unknown>,
) {
  const base = typeClass(def.type);
  const project = projectSlotClasses(ctx, block, props);
  const merge = ctx.mergeClasses ?? ((defaults: string, extra: string) => cx(defaults, extra));

  return (slot: string, defaults: ClassValue[] = [], modifiers: ClassValue[] = []): string => {
    const name = slot === 'root' ? base : `${base}__${slot}`;
    const own = cx(name, ...modifiers.map((m) => m && `${name}--${m}`), ...defaults);
    const extra = cx(
      ...project.map((p) => p[slot]),
      block.classes?.[slot],
      slot === 'root' ? block.style?.className : undefined,
    );
    return extra ? merge(own, extra) : own;
  };
}
