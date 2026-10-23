import type { ReactNode } from 'react';
import { z } from 'zod';
import { inlineToPlainText } from '../schema/text';
import type { Block } from '../schema/types';
import { defineBlock } from '../core/define-block';
import { Icon, ICON_NAMES } from '../core/icons';
import { cx } from '../core/classes';
import { addResponsive, spaceToCss, type StyleAttributes } from '../core/style';
import type { RenderContext } from '../core/types';
import { responsive, t } from './shared';

// ---------------------------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------------------------

const MARKER_ICONS = { check: 'check', arrow: 'arrow-right' } as const;

const listProps = z.object({
  style: z.enum(['bullet', 'number', 'check', 'arrow', 'icon']),
  icon: z.string().max(40).optional(),
  start: z.number().int().min(0).max(100_000).optional(),
  spacing: z.enum(['none', 'xs', 's', 'm', 'l', 'xl']).optional(),
  columns: responsive(z.number().int().min(1).max(4)).optional(),
});
type ListProps = z.infer<typeof listProps>;

function renderItems(items: readonly Block[], p: ListProps, ctx: RenderContext, depth: number): ReactNode {
  const Tag = p.style === 'number' ? 'ol' : 'ul';
  const marker =
    p.style === 'icon'
      ? p.icon
      : p.style in MARKER_ICONS
        ? MARKER_ICONS[p.style as keyof typeof MARKER_ICONS]
        : undefined;
  return (
    <Tag
      className={cx('ce-list__items', depth > 0 && 'ce-list__items--nested')}
      start={depth === 0 && p.style === 'number' && p.start !== undefined ? p.start : undefined}
    >
      {items.map((item) => {
        const checked = p.style === 'check' && item.props.checked === false ? 'square' : marker;
        return (
          <li key={item.id} className={cx('ce-list__item', item.classes?.root)}>
            {marker && <Icon name={checked} className="ce-list__marker" size={18} />}
            <span className="ce-list__text">{ctx.renderInline(item)}</span>
            {item.children?.length ? renderItems(item.children, p, ctx, depth + 1) : null}
          </li>
        );
      })}
    </Tag>
  );
}

export const list = defineBlock({
  type: 'list',
  category: 'text',
  outline: 'none',
  icon: 'list',
  props: listProps,
  defaultProps: { style: 'bullet' },
  slots: ['root'],
  container: {
    allowedChildren: ['list-item'],
    minChildren: 1,
    defaultChild: () => ({ type: 'list-item', props: {}, content: [] }),
  },
  keywords: ['lista', 'punkty', 'bullets', 'numbered', 'checklist', 'ul', 'ol'],
  create: () => ({
    type: 'list',
    props: { style: 'bullet' },
    children: [{ id: '', type: 'list-item', props: {}, content: [] }],
  }),
  modifiers: (p) => [p.style],
  attributes: (p) => {
    const out: StyleAttributes = { classes: [], vars: {} };
    if (p.spacing) out.vars['--ce-list-spacing'] = spaceToCss(p.spacing);
    addResponsive(out, 'list-cols', p.columns, String);
    return out;
  },
  responsive: [{ kind: 'var', key: 'list-cols', target: ' > .ce-list__items', declarations: 'columns: $;' }],
  // Items are rendered by the list itself so that markers and nesting stay semantic (<ul>/<ol>/<li>).
  render: ({ block, props: p, root, ctx }) => (
    <div {...root}>{renderItems(block.children ?? [], p, ctx, 0)}</div>
  ),
  inspector: [
    {
      type: 'segmented',
      name: 'style',
      label: t('Rodzaj', 'Type'),
      options: [
        { value: 'bullet', label: t('Punkty', 'Bullets') },
        { value: 'number', label: t('Numerowana', 'Numbered') },
        { value: 'check', label: t('Checklista', 'Checklist') },
        { value: 'arrow', label: t('Strzałki', 'Arrows') },
        { value: 'icon', label: t('Ikona', 'Icon') },
      ],
    },
    {
      type: 'icon',
      name: 'icon',
      label: t('Ikona', 'Icon'),
      icons: ICON_NAMES,
      when: (p) => p.style === 'icon',
    },
    { type: 'number', name: 'start', label: t('Zacznij od', 'Start at'), when: (p) => p.style === 'number' },
    {
      type: 'segmented',
      name: 'spacing',
      label: t('Odstępy', 'Spacing'),
      options: ['none', 'xs', 's', 'm', 'l'].map((value) => ({ value, label: value.toUpperCase() })),
    },
    { type: 'number', name: 'columns', label: t('Kolumny', 'Columns'), responsive: true, min: 1, max: 4 },
  ],
  i18n: {
    pl: { name: 'Lista', description: 'Punktowana, numerowana, checklista' },
    en: { name: 'List', description: 'Bulleted, numbered, checklist' },
  },
});

export const listItem = defineBlock({
  type: 'list-item',
  category: 'text',
  outline: 'none',
  props: z.object({ checked: z.boolean().optional() }),
  defaultProps: {},
  slots: ['root'],
  content: true,
  container: { allowedChildren: ['list-item'] },
  parents: ['list', 'list-item'],
  hidden: true,
  render: ({ root, content, children }) => (
    <li {...root}>
      {content}
      {children && <ul>{children}</ul>}
    </li>
  ),
  inspector: [{ type: 'toggle', name: 'checked', label: t('Zaznaczony', 'Checked') }],
  i18n: { pl: { name: 'Punkt listy' }, en: { name: 'List item' } },
});

// ---------------------------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------------------------

const alignSchema = z.enum(['left', 'center', 'right']);

export const table = defineBlock({
  type: 'table',
  category: 'text',
  outline: 'none',
  icon: 'table',
  props: z.object({
    headerRow: z.boolean(),
    headerColumn: z.boolean().optional(),
    striped: z.boolean().optional(),
    /** Alignment per column (index = column). */
    columnAlign: z.array(alignSchema.nullable()).max(30).optional(),
    /** Small screens: scroll horizontally, or show each row as a card. */
    mobile: z.enum(['scroll', 'cards']),
    caption: z.string().max(500).optional(),
  }),
  defaultProps: { headerRow: true, mobile: 'scroll' },
  slots: ['root', 'scroller', 'table', 'caption', 'row', 'cell', 'headerCell'],
  textProps: ['caption'],
  container: { allowedChildren: ['table-row'], minChildren: 1 },
  keywords: ['tabela', 'table', 'dane', 'data'],
  create: () => {
    const row = () => ({
      id: '',
      type: 'table-row',
      props: {},
      children: [0, 1, 2].map(() => ({ id: '', type: 'table-cell', props: {}, content: [] })),
    });
    return { type: 'table', props: { headerRow: true, mobile: 'scroll' }, children: [row(), row(), row()] };
  },
  modifiers: (p) => [p.striped && 'striped', `mobile-${p.mobile}`, p.headerColumn && 'header-column'],
  render: ({ block, props: p, root, slot, text, ctx }) => {
    const rows = block.children ?? [];
    const [first, ...rest] = rows;
    const head = p.headerRow && first ? first : undefined;
    const body = head ? rest : rows;
    const labels = head?.children?.map((cell) => inlineToPlainText(cell.content)) ?? [];
    const align = (i: number) => p.columnAlign?.[i] ?? undefined;
    return (
      <div {...root}>
        <div className={slot('scroller')} tabIndex={0} role="region" aria-label={p.caption || undefined}>
          <table className={slot('table')}>
            {p.caption && <caption className={slot('caption')}>{text('caption')}</caption>}
            {head && (
              <thead>
                <tr className={slot('row')}>
                  {head.children?.map((cell, i) => (
                    <th
                      key={cell.id}
                      scope="col"
                      className={slot('headerCell', align(i) && `align-${align(i)}`)}
                    >
                      {ctx.renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row) => (
                <tr key={row.id} className={slot('row')}>
                  {row.children?.map((cell, i) => {
                    const Cell = p.headerColumn && i === 0 ? 'th' : 'td';
                    return (
                      <Cell
                        key={cell.id}
                        scope={Cell === 'th' ? 'row' : undefined}
                        data-label={labels[i] || undefined}
                        className={slot(
                          Cell === 'th' ? 'headerCell' : 'cell',
                          align(i) && `align-${align(i)}`,
                        )}
                      >
                        {ctx.renderInline(cell)}
                      </Cell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  },
  inspector: [
    { type: 'toggle', name: 'headerRow', label: t('Wiersz nagłówkowy', 'Header row') },
    { type: 'toggle', name: 'headerColumn', label: t('Kolumna nagłówkowa', 'Header column') },
    { type: 'toggle', name: 'striped', label: t('Paski', 'Stripes') },
    { type: 'tableColumns', name: 'columnAlign', label: t('Wyrównanie kolumn', 'Column alignment') },
    {
      type: 'segmented',
      name: 'mobile',
      label: t('Na telefonie', 'On phones'),
      options: [
        { value: 'scroll', label: t('Przewijanie w bok', 'Scroll sideways') },
        { value: 'cards', label: t('Karty', 'Cards') },
      ],
    },
    { type: 'text', name: 'caption', label: t('Podpis tabeli', 'Caption') },
  ],
  i18n: {
    pl: { name: 'Tabela', description: 'Dane w wierszach i kolumnach' },
    en: { name: 'Table', description: 'Rows and columns of data' },
  },
});

export const tableRow = defineBlock({
  type: 'table-row',
  category: 'text',
  props: z.object({}),
  defaultProps: {},
  slots: ['root'],
  container: { allowedChildren: ['table-cell'], minChildren: 1 },
  parents: ['table'],
  hidden: true,
  render: ({ root, children }) => <tr {...root}>{children}</tr>,
  i18n: { pl: { name: 'Wiersz' }, en: { name: 'Row' } },
});

export const tableCell = defineBlock({
  type: 'table-cell',
  category: 'text',
  props: z.object({}),
  defaultProps: {},
  slots: ['root'],
  content: true,
  parents: ['table-row'],
  hidden: true,
  render: ({ root, content }) => <td {...root}>{content}</td>,
  i18n: { pl: { name: 'Komórka' }, en: { name: 'Cell' } },
});
