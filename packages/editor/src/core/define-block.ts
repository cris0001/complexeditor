import type { BlockDefinition } from './types';

/**
 * Defines a block type. Built-in blocks use this same function.
 *
 * ```ts
 * const note = defineBlock({
 *   type: 'acme/note',
 *   category: 'text',
 *   props: z.object({ tone: z.enum(['calm', 'loud']) }),
 *   defaultProps: { tone: 'calm' },
 *   slots: ['root', 'label'],
 *   content: true,
 *   render: ({ root, slot, content }) => <aside {...root}><b className={slot('label')}>Note</b>{content}</aside>,
 * });
 * ```
 */
export function defineBlock<
  const TType extends string,
  TProps extends Record<string, unknown>,
  const TSlots extends string,
>(definition: BlockDefinition<TType, TProps, TSlots>): BlockDefinition<TType, TProps, TSlots> {
  if (!definition.slots.includes('root' as TSlots)) {
    throw new Error(`Block "${definition.type}" must declare a "root" slot`);
  }
  return definition;
}

/** Slot names of a block definition, for typing `classNames` configs. */
export type SlotsOf<D> = D extends BlockDefinition<string, Record<string, unknown>, infer S> ? S : never;
/** Props type of a block definition. */
export type PropsOf<D> = D extends BlockDefinition<string, infer P, string> ? P : never;
