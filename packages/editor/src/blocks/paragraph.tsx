import { z } from 'zod';
import { defineBlock } from '../core/define-block';
import { addResponsive, type StyleAttributes } from '../core/style';
import { responsiveAlign, t } from './shared';

const props = z.object({
  size: z.enum(['lead', 'normal', 'small']),
  align: responsiveAlign.optional(),
  dropCap: z.boolean().optional(),
  /** Breakpoint from which the text flows in two columns. */
  columnsFrom: z.enum(['none', 'sm', 'md', 'lg', 'xl']).optional(),
});

export const paragraph = defineBlock({
  type: 'paragraph',
  category: 'text',
  outline: 'none',
  icon: 'paragraph',
  props,
  defaultProps: { size: 'normal' },
  slots: ['root'],
  content: true,
  keywords: ['text', 'tekst', 'akapit', 'p'],
  modifiers: (p) => [p.size !== 'normal' && p.size, p.dropCap && 'drop-cap'],
  attributes: (p) => {
    const out: StyleAttributes = { classes: [], vars: {} };
    addResponsive(out, 'align', p.align);
    if (p.columnsFrom && p.columnsFrom !== 'none') addResponsive(out, 'text-cols', { [p.columnsFrom]: '2' });
    return out;
  },
  responsive: [
    { kind: 'enum', key: 'text-cols', values: { '2': 'columns: 2; column-gap: var(--ce-space-l);' } },
  ],
  render: ({ root, content }) => <p {...root}>{content}</p>,
  inspector: [
    {
      type: 'segmented',
      name: 'size',
      label: t('Rozmiar', 'Size'),
      options: [
        { value: 'lead', label: t('Wstęp', 'Lead') },
        { value: 'normal', label: t('Normalny', 'Normal') },
        { value: 'small', label: t('Mały', 'Small') },
      ],
    },
    { type: 'align', name: 'align', label: t('Wyrównanie', 'Alignment'), responsive: true },
    { type: 'toggle', name: 'dropCap', label: t('Inicjał', 'Drop cap') },
    {
      type: 'select',
      name: 'columnsFrom',
      label: t('Dwie kolumny od', 'Two columns from'),
      advanced: true,
      options: [
        { value: 'none', label: t('Nigdy', 'Never') },
        { value: 'sm', label: t('Duży telefon', 'Large phone') },
        { value: 'md', label: t('Tablet', 'Tablet') },
        { value: 'lg', label: t('Laptop', 'Laptop') },
        { value: 'xl', label: t('Desktop', 'Desktop') },
      ],
    },
  ],
  i18n: {
    pl: { name: 'Akapit', description: 'Zwykły tekst z formatowaniem' },
    en: { name: 'Paragraph', description: 'Plain text with formatting' },
  },
});
