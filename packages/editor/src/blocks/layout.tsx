import { z } from 'zod';
import { toResponsiveObject, type Responsive } from '../schema/responsive';
import type { Block } from '../schema/types';
import { cx } from '../core/classes';
import { defineBlock } from '../core/define-block';
import { addResponsive, spaceToCss, type StyleAttributes } from '../core/style';
import { cssLength, responsive, responsiveSpace, t, verticalAlignSchema } from './shared';

const attrs = (): StyleAttributes => ({ classes: [], vars: {} });

// ---------------------------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------------------------

const sectionProps = z.object({
  /** Width of the content inside the section (the section itself uses `style.width`). */
  contentWidth: z.enum(['normal', 'wide', 'full']),
  minHeight: responsive(z.union([cssLength, z.literal('screen')])).optional(),
  verticalAlign: z.enum(['start', 'center', 'end']).optional(),
  tag: z.enum(['section', 'div', 'aside']).optional(),
});

export const section = defineBlock({
  type: 'section',
  category: 'layout',
  outline: 'section',
  icon: 'section',
  props: sectionProps,
  defaultProps: { contentWidth: 'normal' },
  slots: ['root', 'inner'],
  container: { nests: true },
  keywords: ['container', 'kontener', 'sekcja', 'background', 'tło'],
  modifiers: (p) => [`content-${p.contentWidth}`, p.verticalAlign && `valign-${p.verticalAlign}`],
  attributes: (p) => {
    const out = attrs();
    addResponsive(out, 'min-h', p.minHeight, (v) => (v === 'screen' ? '100svh' : v));
    return out;
  },
  responsive: [{ kind: 'var', key: 'min-h', declarations: 'min-block-size: $;' }],
  render: ({ props: p, root, slot, children }) => {
    const Tag = p.tag ?? 'section';
    return (
      <Tag {...root}>
        <div className={cx(slot('inner'), 'ce-flow')}>{children}</div>
      </Tag>
    );
  },
  inspector: [
    { type: 'background', name: 'style.background', label: t('Tło', 'Background') },
    { type: 'spacing', name: 'style.padding', label: t('Odstęp wewnętrzny', 'Padding'), responsive: true },
    { type: 'width', name: 'style.width', label: t('Szerokość sekcji', 'Section width'), responsive: true },
    {
      type: 'segmented',
      name: 'contentWidth',
      label: t('Szerokość treści', 'Content width'),
      options: [
        { value: 'normal', label: t('Normalna', 'Normal') },
        { value: 'wide', label: t('Szeroka', 'Wide') },
        { value: 'full', label: t('Pełna', 'Full') },
      ],
    },
    {
      type: 'length',
      name: 'minHeight',
      label: t('Min. wysokość', 'Min height'),
      responsive: true,
      allowScreen: true,
    },
    {
      type: 'segmented',
      name: 'verticalAlign',
      label: t('Wyrównanie w pionie', 'Vertical alignment'),
      options: [
        { value: 'start', label: t('Góra', 'Top') },
        { value: 'center', label: t('Środek', 'Middle') },
        { value: 'end', label: t('Dół', 'Bottom') },
      ],
    },
    {
      type: 'select',
      name: 'tag',
      label: t('Znacznik HTML', 'HTML tag'),
      advanced: true,
      options: ['section', 'div', 'aside'].map((value) => ({ value, label: `<${value}>` })),
    },
  ],
  i18n: {
    pl: { name: 'Sekcja', description: 'Kontener z tłem i odstępami' },
    en: { name: 'Section', description: 'Container with background and spacing' },
  },
});

// ---------------------------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------------------------

/** Column track presets. `custom` uses each column's `width` (fr units). */
export const COLUMN_PRESETS = {
  '100': '1fr',
  '50-50': '1fr 1fr',
  '33-67': '1fr 2fr',
  '67-33': '2fr 1fr',
  '25-75': '1fr 3fr',
  '75-25': '3fr 1fr',
  '33-33-33': 'repeat(3, minmax(0, 1fr))',
  '25-25-25-25': 'repeat(4, minmax(0, 1fr))',
} as const;
export type ColumnPreset = keyof typeof COLUMN_PRESETS | 'custom';

const presetSchema = z.enum([...(Object.keys(COLUMN_PRESETS) as [keyof typeof COLUMN_PRESETS]), 'custom']);

const columnsProps = z.object({
  layout: responsive(presetSchema),
  gap: responsiveSpace.optional(),
  verticalAlign: responsive(verticalAlignSchema).optional(),
  horizontalAlign: responsive(z.enum(['start', 'center', 'end', 'stretch'])).optional(),
  reverse: responsive(z.boolean()).optional(),
  dividers: z.boolean().optional(),
  /**
   * Custom switch point: columns sit side by side when the block is at least this wide and stack
   * below it. Overrides `layout` breakpoints (uses flexbox, no media query needed).
   */
  stackBelow: cssLength.optional(),
  /** Respond to the block's own width instead of the document width (container queries). */
  responsiveTo: z.enum(['document', 'self']).optional(),
});

/** Track list for a preset; `custom` builds it from the columns' own widths. */
function tracks(preset: ColumnPreset, columns: readonly Block[]): string {
  if (preset !== 'custom') return COLUMN_PRESETS[preset];
  const widths = columns.map((c) =>
    typeof c.props.width === 'number' && c.props.width > 0 ? c.props.width : 1,
  );
  return widths.map((w) => `minmax(0, ${w}fr)`).join(' ') || '1fr';
}

/** Flex-grow per column for the `stackBelow` mode. */
function grows(preset: ColumnPreset, columns: readonly Block[]): number[] {
  const value = tracks(preset, columns);
  const repeat = /^repeat\((\d+)/.exec(value);
  if (repeat) return Array.from({ length: Number(repeat[1]) }, () => 1);
  return value.split(' ').flatMap((part) => {
    const fr = /([\d.]+)fr\)?$/.exec(part);
    return fr ? [Number(fr[1])] : [];
  });
}

const REVERSE_CSS = (cls: (v?: string) => string) =>
  Array.from(
    { length: 6 },
    (_, i) => `:where(${cls('true')}) > .ce-columns__grid > :nth-child(${i + 1}) { order: ${6 - i}; }`,
  )
    .concat(`:where(${cls('false')}) > .ce-columns__grid > * { order: 0; }`)
    .join('\n');

export const columns = defineBlock({
  type: 'columns',
  category: 'layout',
  outline: 'layout',
  icon: 'columns',
  props: columnsProps,
  defaultProps: { layout: { base: '100', md: '50-50' } },
  slots: ['root', 'grid'],
  container: {
    nests: true,
    allowedChildren: ['column'],
    minChildren: 1,
    maxChildren: 6,
    defaultChild: () => ({ type: 'column', props: {}, children: [] }),
  },
  keywords: ['flex', 'kolumny', 'columns', 'layout', 'układ'],
  summary: (p) => {
    const layout = toResponsiveObject(p.layout);
    const preset = layout.md ?? layout.lg ?? layout.base;
    return preset && preset !== 'custom' ? preset.replace(/-/g, '/') : undefined;
  },
  create: () => ({
    type: 'columns',
    props: { layout: { base: '100', md: '50-50' } },
    children: [
      { id: '', type: 'column', props: {}, children: [] },
      { id: '', type: 'column', props: {}, children: [] },
    ],
  }),
  modifiers: (p) => [p.dividers && 'dividers', p.stackBelow && 'switch', p.responsiveTo === 'self' && 'self'],
  attributes: (p, _ctx, block) => {
    const out = attrs();
    const children = block.children ?? [];
    if (p.stackBelow) {
      out.vars['--ce-columns-switch'] = p.stackBelow;
      const base = toResponsiveObject(p.layout);
      const preset = (base.xl ?? base.lg ?? base.md ?? base.sm ?? base.base ?? '50-50') as ColumnPreset;
      grows(preset, children).forEach((grow, i) => {
        out.vars[`--ce-col-${i + 1}-grow`] = String(grow);
      });
    } else {
      addResponsive(out, 'cols', p.layout as Responsive<ColumnPreset>, (preset) => tracks(preset, children));
    }
    addResponsive(out, 'cols-gap', p.gap, spaceToCss);
    addResponsive(out, 'cols-valign', p.verticalAlign);
    addResponsive(out, 'cols-halign', p.horizontalAlign);
    addResponsive(out, 'cols-reverse', p.reverse);
    return out;
  },
  responsive: [
    { kind: 'var', key: 'cols', target: ' > .ce-columns__grid', declarations: 'grid-template-columns: $;' },
    { kind: 'var', key: 'cols-gap', target: ' > .ce-columns__grid', declarations: 'gap: $;' },
    {
      kind: 'enum',
      key: 'cols-valign',
      target: ' > .ce-columns__grid',
      values: {
        start: 'align-items: start;',
        center: 'align-items: center;',
        end: 'align-items: end;',
        stretch: 'align-items: stretch;',
      },
    },
    {
      kind: 'enum',
      key: 'cols-halign',
      target: ' > .ce-columns__grid',
      values: {
        start: 'justify-items: start;',
        center: 'justify-items: center;',
        end: 'justify-items: end;',
        stretch: 'justify-items: stretch;',
      },
    },
    { kind: 'custom', key: 'cols-reverse', css: REVERSE_CSS },
  ],
  render: ({ root, slot, children }) => (
    <div {...root}>
      <div className={slot('grid')}>{children}</div>
    </div>
  ),
  inspector: [
    { type: 'columnsLayout', name: 'layout', label: t('Proporcje', 'Proportions'), responsive: true },
    { type: 'space', name: 'gap', label: t('Odstęp', 'Gap'), responsive: true },
    {
      type: 'verticalAlign',
      name: 'verticalAlign',
      label: t('Wyrównanie w pionie', 'Vertical alignment'),
      responsive: true,
    },
    {
      type: 'horizontalAlign',
      name: 'horizontalAlign',
      label: t('Wyrównanie w poziomie', 'Horizontal alignment'),
      responsive: true,
    },
    { type: 'toggle', name: 'dividers', label: t('Linie między kolumnami', 'Dividers') },
    {
      type: 'toggle',
      name: 'reverse',
      label: t('Odwróć kolejność', 'Reverse order'),
      responsive: true,
      advanced: true,
    },
    {
      type: 'length',
      name: 'stackBelow',
      label: t('Własny punkt przełączenia (układ w kolumnach od)', 'Custom switch point (side by side from)'),
      advanced: true,
    },
    {
      type: 'segmented',
      name: 'responsiveTo',
      label: t('Reaguj na szerokość', 'Respond to width of'),
      advanced: true,
      options: [
        { value: 'document', label: t('Strony', 'Page') },
        { value: 'self', label: t('Klocka (container query)', 'Block (container query)') },
      ],
    },
  ],
  i18n: {
    pl: { name: 'Kolumny', description: 'Układ obok siebie (flex)' },
    en: { name: 'Columns', description: 'Side-by-side layout' },
  },
});

const columnProps = z.object({
  /** Relative width (fr) used by the `custom` layout. */
  width: z.number().positive().max(12).optional(),
  order: responsive(z.number().int().min(0).max(12)).optional(),
  sticky: z.boolean().optional(),
  verticalAlign: verticalAlignSchema.optional(),
});

export const column = defineBlock({
  type: 'column',
  category: 'layout',
  outline: 'layout',
  icon: 'column',
  props: columnProps,
  defaultProps: {},
  slots: ['root'],
  container: {},
  parents: ['columns'],
  hidden: true,
  modifiers: (p) => [p.sticky && 'sticky', p.verticalAlign && `valign-${p.verticalAlign}`],
  attributes: (p) => {
    const out = attrs();
    addResponsive(out, 'col-order', p.order, String);
    return out;
  },
  responsive: [{ kind: 'var', key: 'col-order', declarations: 'order: $;' }],
  render: ({ root, children }) => <div {...root}>{children}</div>,
  inspector: [
    { type: 'number', name: 'width', label: t('Szerokość (fr)', 'Width (fr)'), min: 1, max: 12 },
    {
      type: 'number',
      name: 'order',
      label: t('Kolejność', 'Order'),
      responsive: true,
      advanced: true,
      min: 0,
      max: 12,
    },
    { type: 'toggle', name: 'sticky', label: t('Przyklejona przy przewijaniu', 'Sticky while scrolling') },
    { type: 'verticalAlign', name: 'verticalAlign', label: t('Wyrównanie w pionie', 'Vertical alignment') },
  ],
  i18n: {
    pl: { name: 'Kolumna' },
    en: { name: 'Column' },
  },
});

// ---------------------------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------------------------

const gridProps = z.object({
  /** Fixed number of columns per breakpoint. Ignored when `minItemWidth` is set. */
  columns: responsive(z.number().int().min(1).max(12)),
  /** Auto mode: as many columns as fit, each at least this wide. */
  minItemWidth: cssLength.optional(),
  gap: responsiveSpace.optional(),
  rowGap: responsiveSpace.optional(),
  verticalAlign: verticalAlignSchema.optional(),
});

export const grid = defineBlock({
  type: 'grid',
  category: 'layout',
  outline: 'layout',
  icon: 'grid',
  props: gridProps,
  defaultProps: { columns: { base: 1, sm: 2, lg: 3 } },
  slots: ['root'],
  container: { nests: true },
  keywords: ['grid', 'siatka', 'kafelki', 'tiles'],
  modifiers: (p) => [p.minItemWidth && 'auto', p.verticalAlign && `valign-${p.verticalAlign}`],
  attributes: (p) => {
    const out = attrs();
    if (p.minItemWidth) out.vars['--ce-grid-min'] = p.minItemWidth;
    else addResponsive(out, 'grid-cols', p.columns, (n) => `repeat(${n}, minmax(0, 1fr))`);
    addResponsive(out, 'grid-gap', p.gap, spaceToCss);
    addResponsive(out, 'grid-row-gap', p.rowGap, spaceToCss);
    return out;
  },
  responsive: [
    { kind: 'var', key: 'grid-cols', declarations: 'grid-template-columns: $;' },
    { kind: 'var', key: 'grid-gap', declarations: 'gap: $;' },
    { kind: 'var', key: 'grid-row-gap', declarations: 'row-gap: $;' },
  ],
  render: ({ root, children }) => <div {...root}>{children}</div>,
  inspector: [
    {
      type: 'number',
      name: 'columns',
      label: t('Liczba kolumn', 'Columns'),
      responsive: true,
      min: 1,
      max: 12,
    },
    {
      type: 'length',
      name: 'minItemWidth',
      label: t('Tryb auto: min. szerokość kafelka', 'Auto mode: min tile width'),
    },
    { type: 'space', name: 'gap', label: t('Odstęp', 'Gap'), responsive: true },
    {
      type: 'space',
      name: 'rowGap',
      label: t('Odstęp wierszy', 'Row gap'),
      responsive: true,
      advanced: true,
    },
    { type: 'verticalAlign', name: 'verticalAlign', label: t('Wyrównanie w pionie', 'Vertical alignment') },
  ],
  i18n: {
    pl: { name: 'Siatka', description: 'Kafelki w kolumnach (grid)' },
    en: { name: 'Grid', description: 'Tiles in columns' },
  },
});
