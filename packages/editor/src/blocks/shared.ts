import { z } from 'zod';
import type { LocalizedString } from '../schema/types';
import { responsive, spaceValue, tokenName } from '../schema/zod';
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
  src: z.string().max(2048),
  id: z.string().max(200).optional(),
  alt: z.string().max(1000).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  /** Responsive variants supplied by the project (`srcset`). */
  srcSet: z.string().max(4000).optional(),
});
export type ImageRef = z.infer<typeof imageSchema>;
