import { z } from 'zod';
import type { LocalizedString } from '../schema/types';
import { responsive, safeUrl as safeUrlSchema, spaceValue, tokenName } from '../schema/zod';
import { spaceToCss } from '../core/style';

export { cssLength, responsive, safeUrl, spaceValue, tokenName, focalPointSchema } from '../schema/zod';

/** Localized label shorthand. */
export const t = (pl: string, en: string): LocalizedString => ({ pl, en });

export const alignSchema = z.enum(['left', 'center', 'right']);
export const responsiveAlign = responsive(alignSchema);
export const responsiveSpace = responsive(spaceValue);
export const verticalAlignSchema = z.enum(['start', 'center', 'end', 'stretch']);
export const optionalToken = tokenName.optional();

export { spaceToCss };

/** Image reference stored in blocks. `id` points to the media library when the image came from it. */
export const imageSchema = z.strictObject({
  /** Empty while the editor has not picked an image yet. */
  src: z.union([z.literal(''), safeUrlSchema]),
  id: z.string().max(200).optional(),
  alt: z.string().max(1000).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  /** Responsive variants supplied by the project (`srcset`). */
  srcSet: z.string().max(4000).optional(),
});
export type ImageRef = z.infer<typeof imageSchema>;

export const ASPECTS = ['original', '16/9', '4/3', '3/2', '1/1', '3/4', '4/5', '9/16', 'custom'] as const;
export const aspectSchema = z.enum(ASPECTS);
/** `16/9`-style ratio typed by the editor for `custom`. */
export const customAspectSchema = z
  .string()
  .regex(/^\d{1,4}(\.\d{1,3})?\/\d{1,4}(\.\d{1,3})?$/, 'Expected a ratio like 21/9');

/** CSS `aspect-ratio` value, or undefined for the image's own ratio. */
export function aspectValue(aspect: string | undefined, custom?: string): string | undefined {
  if (!aspect || aspect === 'original') return undefined;
  if (aspect === 'custom') return custom ? custom.replace('/', ' / ') : undefined;
  return aspect.replace('/', ' / ');
}

export const aspectOptions = ASPECTS.map((value) => ({
  value,
  label:
    value === 'original'
      ? t('Oryginalne', 'Original')
      : value === 'custom'
        ? t('Własne', 'Custom')
        : { pl: value.replace('/', ':'), en: value.replace('/', ':') },
}));

export const linkSchema = z.strictObject({
  href: safeUrlSchema,
  newTab: z.boolean().optional(),
  rel: z
    .string()
    .regex(/^[a-z ]{0,100}$/)
    .optional(),
});

/** Human-readable file size. */
export function formatBytes(bytes: number, locale?: string): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value)} ${units[unit]}`;
}
