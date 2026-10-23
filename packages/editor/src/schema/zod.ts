import { z } from 'zod';
import { BREAKPOINTS } from './responsive';
import { isSafeUrl } from './url';
import type { Block, BlockStyle, ContentDocument, Mark, TextNode } from './types';

/** Palette / variant / token names: `primary`, `brand-500`, `accent2`. */
export const tokenName = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/i, 'Expected a theme token name');

/** CSS lengths accepted in custom values. Restrictive on purpose: values end up in CSS variables. */
export const cssLength = z
  .string()
  .regex(
    /^(0|-?\d{1,5}(\.\d{1,4})?(px|rem|em|%|vh|vw|svh|dvh|ch))$/,
    'Expected a CSS length such as 24px or 2rem',
  );

export const safeUrl = z.string().refine((url) => isSafeUrl(url), 'Unsafe or invalid URL');

const ALWAYS_FORBIDDEN = new Set(['<', '`', '{', '}', ';', '\\']);
const QUOTES = new Set(['"', "'"]);

/**
 * Checks a whitespace-separated class list. `< \` { } ; \\` are never allowed. Quotes and `>` are
 * allowed only inside balanced `[...]` (Tailwind arbitrary values and variants such as
 * `content-['x']` or `[&>*]:underline`); quotes must be paired.
 */
export function isSafeClassList(value: string): boolean {
  for (const token of value.split(/\s+/)) {
    let depth = 0;
    let quote: string | null = null;
    for (const char of token) {
      if (ALWAYS_FORBIDDEN.has(char)) return false;
      if (quote) {
        if (char === quote) quote = null;
      } else if (QUOTES.has(char) || char === '>') {
        if (depth === 0) return false;
        if (char === '>') continue;
        quote = char;
      } else if (char === '[') depth++;
      else if (char === ']') {
        if (--depth < 0) return false;
      }
    }
    if (depth !== 0 || quote) return false;
  }
  return true;
}

/** One or more class names; nothing that could break out of the attribute or a generated selector. */
export const classList = z
  .string()
  .max(1000, 'Class list is too long (max 1000 characters)')
  .refine(isSafeClassList, 'Class list contains forbidden characters');

export function responsive<T extends z.ZodType>(inner: T) {
  const shape = Object.fromEntries(BREAKPOINTS.map((bp) => [bp, inner.optional()])) as Record<
    (typeof BREAKPOINTS)[number],
    z.ZodOptional<T>
  >;
  return z.union([inner, z.strictObject(shape)]);
}

export const markSchema: z.ZodType<Mark> = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('bold') }),
  z.strictObject({ type: z.literal('italic') }),
  z.strictObject({ type: z.literal('underline') }),
  z.strictObject({ type: z.literal('strike') }),
  z.strictObject({ type: z.literal('code') }),
  z.strictObject({ type: z.literal('superscript') }),
  z.strictObject({ type: z.literal('subscript') }),
  z.strictObject({ type: z.literal('highlight'), color: tokenName.optional() }),
  z.strictObject({ type: z.literal('color'), color: tokenName }),
  z.strictObject({
    type: z.literal('link'),
    href: safeUrl,
    newTab: z.boolean().optional(),
    rel: z
      .string()
      .regex(/^[a-z ]{0,100}$/, 'Invalid rel')
      .optional(),
  }),
]);

export const textNodeSchema: z.ZodType<TextNode> = z.strictObject({
  text: z.string().max(100_000),
  marks: z.array(markSchema).max(20).optional(),
});

export const inlineContentSchema = z.array(textNodeSchema);

const spaceValue = z.union([
  z.enum(['none', 'xs', 's', 'm', 'l', 'xl']),
  z.strictObject({ custom: cssLength }),
]);
const boxSpacing = z.strictObject({
  top: responsive(spaceValue).optional(),
  bottom: responsive(spaceValue).optional(),
  left: responsive(spaceValue).optional(),
  right: responsive(spaceValue).optional(),
});
const level = z.enum(['none', 's', 'm', 'l']);

export const focalPointSchema = z.strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });

export const backgroundSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('color'), color: tokenName }),
  z.strictObject({
    type: z.literal('gradient'),
    from: tokenName,
    to: tokenName,
    angle: z.number().min(0).max(360).optional(),
  }),
  z.strictObject({
    type: z.literal('image'),
    src: safeUrl,
    overlay: z.number().min(0).max(1).optional(),
    focalPoint: focalPointSchema.optional(),
  }),
]);

export const blockStyleSchema: z.ZodType<BlockStyle> = z.strictObject({
  margin: boxSpacing.optional(),
  padding: boxSpacing.optional(),
  width: responsive(
    z.union([z.enum(['normal', 'wide', 'full']), z.strictObject({ max: cssLength })]),
  ).optional(),
  align: responsive(z.enum(['left', 'center', 'right'])).optional(),
  background: backgroundSchema.optional(),
  radius: level.optional(),
  border: level.optional(),
  shadow: level.optional(),
  animation: z
    .strictObject({
      type: z.enum(['fade', 'slide', 'zoom']),
      direction: z.enum(['up', 'down', 'left', 'right']).optional(),
      delay: z.number().int().min(0).max(5000).optional(),
    })
    .optional(),
  hidden: z
    .strictObject({
      mobile: z.boolean().optional(),
      tablet: z.boolean().optional(),
      desktop: z.boolean().optional(),
    })
    .optional(),
  anchor: z
    .string()
    .regex(
      /^[A-Za-z][\w-]{0,99}$/,
      'Anchor must start with a letter and contain only letters, digits, - and _',
    )
    .optional(),
  className: classList.optional(),
  variant: tokenName.optional(),
});

export const blockClassesSchema = z.record(
  z.string().regex(/^[a-zA-Z][\w-]{0,31}$/, 'Invalid slot name'),
  classList,
);

export const blockSchema: z.ZodType<Block> = z.lazy(() =>
  z.strictObject({
    id: z.string().regex(/^[\w-]{1,64}$/, 'Invalid block id'),
    type: z.string().regex(/^[a-z][a-z0-9-]*(\/[a-z][a-z0-9-]*)?$/, 'Invalid block type'),
    props: z.record(z.string(), z.unknown()),
    style: blockStyleSchema.optional(),
    classes: blockClassesSchema.optional(),
    content: inlineContentSchema.optional(),
    children: z.array(blockSchema).optional(),
  }),
);

export const documentSchema: z.ZodType<ContentDocument> = z.strictObject({
  version: z.number().int().positive(),
  blocks: z.array(blockSchema),
});
