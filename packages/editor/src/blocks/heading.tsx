import { z } from 'zod';
import { defineBlock } from '../core/define-block';
import { addResponsive, colorToCss, type StyleAttributes } from '../core/style';
import { responsiveAlign, t, tokenName } from './shared';

const props = z.object({
  level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  /** Visual size from the theme type scale, independent of the level. */
  size: z.enum(['auto', 'l', 'xl', '2xl', '3xl', '4xl', '5xl']).optional(),
  align: responsiveAlign.optional(),
  color: tokenName.optional(),
  /** Theme font name (e.g. `heading`, `serif`). */
  font: tokenName.optional(),
  eyebrow: z.string().max(200).optional(),
  decoration: z.enum(['none', 'underline', 'number']).optional(),
  /** Explicit anchor for the table of contents; defaults to a slug of the text. */
  anchor: z
    .string()
    .regex(/^[A-Za-z][\w-]{0,99}$/)
    .optional(),
});

const HEADING_TAGS = { 2: 'h2', 3: 'h3', 4: 'h4' } as const;

export const heading = defineBlock({
  type: 'heading',
  category: 'text',
  outline: 'none',
  icon: 'heading',
  props,
  defaultProps: { level: 2 },
  slots: ['root', 'eyebrow', 'text'],
  content: true,
  textProps: ['eyebrow'],
  keywords: ['title', 'tytuł', 'nagłówek', 'h2', 'h3', 'h4'],
  modifiers: (p) => [`level-${p.level}`, p.decoration && p.decoration !== 'none' && `deco-${p.decoration}`],
  attributes: (p) => {
    const out: StyleAttributes = { classes: [], vars: {} };
    addResponsive(out, 'align', p.align);
    if (p.size && p.size !== 'auto') out.vars['--ce-heading-size'] = `var(--ce-text-${p.size})`;
    if (p.color) out.vars['--ce-heading-color'] = colorToCss(p.color);
    if (p.font) out.vars['--ce-heading-font'] = `var(--ce-font-${p.font})`;
    return out;
  },
  render: ({ block, props: p, root, slot, content, text, ctx }) => {
    const Tag = HEADING_TAGS[p.level] ?? 'h2';
    return (
      // `style.anchor` is used as the heading's own id (see extractHeadings), not the wrapper's.
      <div {...root} id={undefined}>
        {p.eyebrow && <p className={slot('eyebrow')}>{text('eyebrow')}</p>}
        <Tag className={slot('text')} id={ctx.headingAnchors.get(block.id)}>
          {content}
        </Tag>
      </div>
    );
  },
  inspector: [
    {
      type: 'segmented',
      name: 'level',
      label: t('Poziom', 'Level'),
      options: [
        { value: 2, label: 'H2' },
        { value: 3, label: 'H3' },
        { value: 4, label: 'H4' },
      ],
    },
    {
      type: 'select',
      name: 'size',
      label: t('Rozmiar', 'Size'),
      options: ['auto', 'l', 'xl', '2xl', '3xl', '4xl', '5xl'].map((value) => ({
        value,
        label: value === 'auto' ? t('Wg poziomu', 'By level') : value.toUpperCase(),
      })),
    },
    { type: 'align', name: 'align', label: t('Wyrównanie', 'Alignment'), responsive: true },
    { type: 'color', name: 'color', label: t('Kolor', 'Color') },
    { type: 'font', name: 'font', label: t('Czcionka', 'Font') },
    { type: 'text', name: 'eyebrow', label: t('Nadtytuł', 'Eyebrow') },
    {
      type: 'segmented',
      name: 'decoration',
      label: t('Dekoracja', 'Decoration'),
      options: [
        { value: 'none', label: t('Brak', 'None') },
        { value: 'underline', label: t('Akcent', 'Accent') },
        { value: 'number', label: t('Numeracja', 'Numbering') },
      ],
    },
    { type: 'anchor', name: 'anchor', label: t('Kotwica', 'Anchor'), advanced: true },
  ],
  i18n: {
    pl: { name: 'Nagłówek', description: 'Śródtytuł H2–H4', eyebrowPlaceholder: 'Nadtytuł' },
    en: { name: 'Heading', description: 'Subheading H2–H4', eyebrowPlaceholder: 'Eyebrow' },
  },
});
