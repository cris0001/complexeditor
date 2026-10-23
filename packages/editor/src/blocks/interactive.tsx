import { z } from 'zod';
import { documentToPlainText } from '../schema/text';
import { defineBlock } from '../core/define-block';
import { Icon, ICON_NAMES } from '../core/icons';
import { addResponsive, spaceToCss, type StyleAttributes } from '../core/style';
import { linkAttributes } from '../renderer/inline';
import { island } from '../renderer/island';
import { sanitizeUrl } from '../schema/url';
import { Picture } from './media';
import { imageSchema, responsive, responsiveAlign, responsiveSpace, safeUrl, t, tokenName } from './shared';

const attrs = (): StyleAttributes => ({ classes: [], vars: {} });

// ---------------------------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------------------------

export const buttons = defineBlock({
  type: 'buttons',
  category: 'interactive',
  outline: 'interactive',
  icon: 'button',
  props: z.object({
    align: responsiveAlign.optional(),
    /** Stretch buttons to the full width on phones. */
    fullWidthMobile: z.boolean().optional(),
    gap: responsiveSpace.optional(),
  }),
  defaultProps: {},
  slots: ['root'],
  container: {
    allowedChildren: ['button'],
    minChildren: 1,
    defaultChild: () => ({ type: 'button', props: { label: '', href: '' } }),
  },
  keywords: ['przycisk', 'button', 'cta', 'link'],
  create: () => ({
    type: 'buttons',
    props: {},
    children: [{ id: '', type: 'button', props: { label: '', href: '', variant: 'primary', size: 'm' } }],
  }),
  modifiers: (p) => [p.fullWidthMobile && 'full-mobile'],
  attributes: (p) => {
    const out = attrs();
    addResponsive(out, 'btns-align', p.align);
    addResponsive(out, 'btns-gap', p.gap, spaceToCss);
    return out;
  },
  responsive: [
    {
      kind: 'enum',
      key: 'btns-align',
      values: {
        left: 'justify-content: flex-start;',
        center: 'justify-content: center;',
        right: 'justify-content: flex-end;',
      },
    },
    { kind: 'var', key: 'btns-gap', declarations: 'gap: $;' },
  ],
  render: ({ root, children }) => <div {...root}>{children}</div>,
  inspector: [
    { type: 'align', name: 'align', label: t('Wyrównanie', 'Alignment'), responsive: true },
    { type: 'space', name: 'gap', label: t('Odstęp', 'Gap'), responsive: true },
    {
      type: 'toggle',
      name: 'fullWidthMobile',
      label: t('Pełna szerokość na telefonie', 'Full width on phones'),
    },
  ],
  i18n: {
    pl: { name: 'Przyciski', description: 'Jeden lub kilka przycisków' },
    en: { name: 'Buttons', description: 'One or more buttons' },
  },
});

export const button = defineBlock({
  type: 'button',
  category: 'interactive',
  outline: 'interactive',
  props: z.object({
    label: z.string().max(200),
    href: z.union([z.literal(''), safeUrl]),
    newTab: z.boolean().optional(),
    rel: z
      .string()
      .regex(/^[a-z ]{0,100}$/)
      .optional(),
    /** Button variant from the theme (`theme.buttons`). */
    variant: tokenName.optional(),
    size: z.enum(['s', 'm', 'l']).optional(),
    icon: z.string().max(40).optional(),
    iconPosition: z.enum(['start', 'end']).optional(),
  }),
  defaultProps: { label: '', href: '', variant: 'primary', size: 'm' },
  slots: ['root', 'icon', 'label'],
  textProps: ['label'],
  parents: ['buttons', 'card'],
  hidden: true,
  modifiers: (p) => [p.variant && `variant-${p.variant}`, p.size && `size-${p.size}`],
  attributes: (p): StyleAttributes => ({
    classes: [],
    vars: p.variant
      ? {
          '--ce-btn-bg': `var(--ce-button-${p.variant}-bg)`,
          '--ce-btn-fg': `var(--ce-button-${p.variant}-fg)`,
          '--ce-btn-border': `var(--ce-button-${p.variant}-border)`,
        }
      : ({} as StyleAttributes['vars']),
  }),
  render: ({ props: p, root, slot, text, ctx }) => {
    const icon = p.icon && <Icon name={p.icon} className={slot('icon')} size={18} />;
    const inner = (
      <>
        {p.iconPosition !== 'end' && icon}
        <span className={slot('label')}>{text('label')}</span>
        {p.iconPosition === 'end' && icon}
      </>
    );
    const href = sanitizeUrl(p.href);
    // In the editor a button never navigates away.
    if (!href || ctx.mode === 'editor') return <span {...root}>{inner}</span>;
    const { Link } = ctx.components;
    return (
      <Link href={href} className={root.className} style={root.style} {...linkAttributes(p)}>
        {inner}
      </Link>
    );
  },
  inspector: [
    { type: 'text', name: 'label', label: t('Tekst', 'Label') },
    { type: 'url', name: 'href', label: t('Link', 'Link') },
    { type: 'toggle', name: 'newTab', label: t('Otwórz w nowej karcie', 'Open in a new tab') },
    { type: 'buttonVariant', name: 'variant', label: t('Wariant', 'Variant') },
    {
      type: 'segmented',
      name: 'size',
      label: t('Rozmiar', 'Size'),
      options: [
        { value: 's', label: 'S' },
        { value: 'm', label: 'M' },
        { value: 'l', label: 'L' },
      ],
    },
    { type: 'icon', name: 'icon', label: t('Ikona', 'Icon'), icons: ['none', ...ICON_NAMES] },
    {
      type: 'segmented',
      name: 'iconPosition',
      label: t('Pozycja ikony', 'Icon position'),
      options: [
        { value: 'start', label: t('Przed', 'Before') },
        { value: 'end', label: t('Po', 'After') },
      ],
    },
    { type: 'text', name: 'rel', label: t('Atrybut rel', 'rel attribute'), advanced: true },
  ],
  i18n: { pl: { name: 'Przycisk' }, en: { name: 'Button' } },
});

// ---------------------------------------------------------------------------------------------
// Accordion / FAQ
// ---------------------------------------------------------------------------------------------

/** JSON for a `<script type="application/ld+json">`, safe to embed in HTML. */
export function jsonLd(data: unknown): string {
  // Escape "<" and the JS line separators U+2028/U+2029 so the JSON cannot end the <script> element.
  const escapeSequence = (code: number) => String.fromCharCode(92) + 'u' + code.toString(16).padStart(4, '0');
  let out = '';
  for (const char of JSON.stringify(data)) {
    const code = char.charCodeAt(0);
    out += code === 0x3c || code === 0x2028 || code === 0x2029 ? escapeSequence(code) : char;
  }
  return out;
}

export const accordion = defineBlock({
  type: 'accordion',
  category: 'interactive',
  outline: 'interactive',
  icon: 'accordion',
  props: z.object({
    allowMultiple: z.boolean(),
    /** Emit FAQPage structured data (JSON-LD) for search engines. */
    faqSchema: z.boolean().optional(),
  }),
  defaultProps: { allowMultiple: false },
  slots: ['root'],
  container: {
    allowedChildren: ['accordion-item'],
    minChildren: 1,
    defaultChild: () => ({
      type: 'accordion-item',
      props: { title: '' },
      children: [{ id: '', type: 'paragraph', props: {}, content: [] }],
    }),
  },
  keywords: ['akordeon', 'faq', 'pytania', 'questions', 'collapse'],
  create: () => ({
    type: 'accordion',
    props: { allowMultiple: false },
    children: [0, 1].map(() => ({
      id: '',
      type: 'accordion-item',
      props: { title: '' },
      children: [{ id: '', type: 'paragraph', props: {}, content: [] }],
    })),
  }),
  render: ({ block, props: p, root, children, ctx }) => {
    const items = block.children ?? [];
    const faq =
      p.faqSchema && ctx.mode !== 'editor'
        ? {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: items.map((item) => ({
              '@type': 'Question',
              name: String(item.props.title ?? ''),
              acceptedAnswer: {
                '@type': 'Answer',
                text: documentToPlainText(
                  { version: 1, blocks: item.children ?? [] },
                  { textProps: ctx.registry.textProps() },
                ),
              },
            })),
          }
        : null;
    return (
      <div {...root}>
        {children}
        {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}
      </div>
    );
  },
  inspector: [
    { type: 'toggle', name: 'allowMultiple', label: t('Wiele otwartych naraz', 'Allow multiple open') },
    {
      type: 'toggle',
      name: 'faqSchema',
      label: t('Dane strukturalne FAQ (SEO)', 'FAQ structured data (SEO)'),
    },
  ],
  i18n: {
    pl: { name: 'Akordeon / FAQ', description: 'Rozwijane sekcje, pytania i odpowiedzi' },
    en: { name: 'Accordion / FAQ', description: 'Collapsible sections, questions and answers' },
  },
});

export const accordionItem = defineBlock({
  type: 'accordion-item',
  category: 'interactive',
  outline: 'interactive',
  props: z.object({ title: z.string().max(500), open: z.boolean().optional() }),
  defaultProps: { title: '' },
  slots: ['root', 'summary', 'title', 'icon', 'body'],
  textProps: ['title'],
  container: {},
  parents: ['accordion'],
  hidden: true,
  render: ({ props: p, root, slot, children, text, ctx }) => {
    // Exclusive accordions use the native `name` attribute: no JavaScript needed.
    const parent = ctx.parent;
    const name =
      parent && !parent.props.allowMultiple && ctx.mode !== 'editor'
        ? `ce-accordion-${parent.id}`
        : undefined;
    return (
      <details {...root} open={p.open || ctx.mode === 'editor' || undefined} name={name}>
        <summary className={slot('summary')}>
          <span className={slot('title')}>{text('title')}</span>
          <Icon name="plus" className={slot('icon')} size={18} />
        </summary>
        <div className={slot('body')}>{children}</div>
      </details>
    );
  },
  inspector: [
    { type: 'text', name: 'title', label: t('Tytuł / pytanie', 'Title / question') },
    { type: 'toggle', name: 'open', label: t('Domyślnie otwarty', 'Open by default') },
  ],
  i18n: { pl: { name: 'Element akordeonu' }, en: { name: 'Accordion item' } },
});

// ---------------------------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------------------------

export const tabs = defineBlock({
  type: 'tabs',
  category: 'interactive',
  outline: 'interactive',
  icon: 'tabs',
  props: z.object({
    /** Turn into an accordion on phones. */
    mobileAccordion: z.boolean().optional(),
  }),
  defaultProps: { mobileAccordion: true },
  slots: ['root', 'list', 'tab', 'panels'],
  container: {
    allowedChildren: ['tab'],
    minChildren: 1,
    defaultChild: () => ({
      type: 'tab',
      props: { title: '' },
      children: [{ id: '', type: 'paragraph', props: {}, content: [] }],
    }),
  },
  keywords: ['zakładki', 'taby', 'tabs'],
  create: () => ({
    type: 'tabs',
    props: { mobileAccordion: true },
    children: [0, 1].map(() => ({
      id: '',
      type: 'tab',
      props: { title: '' },
      children: [{ id: '', type: 'paragraph', props: {}, content: [] }],
    })),
  }),
  modifiers: (p) => [p.mobileAccordion && 'mobile-accordion'],
  render: ({ block, root, slot, children, ctx }) => {
    const items = block.children ?? [];
    return (
      <div {...root}>
        <div className={slot('list')} role="tablist">
          {items.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`ce-tab-${tab.id}`}
              aria-controls={`ce-panel-${tab.id}`}
              aria-selected={i === 0}
              tabIndex={i === 0 ? 0 : -1}
              className={slot('tab')}
            >
              {ctx.renderText(tab, 'title')}
            </button>
          ))}
        </div>
        <div className={slot('panels')}>{children}</div>
        {island(ctx, 'tabs')}
      </div>
    );
  },
  inspector: [
    { type: 'toggle', name: 'mobileAccordion', label: t('Akordeon na telefonie', 'Accordion on phones') },
  ],
  i18n: {
    pl: { name: 'Zakładki', description: 'Treść w kartach (tabach)' },
    en: { name: 'Tabs', description: 'Content in tabs' },
  },
});

export const tab = defineBlock({
  type: 'tab',
  category: 'interactive',
  outline: 'interactive',
  props: z.object({ title: z.string().max(200) }),
  defaultProps: { title: '' },
  slots: ['root', 'heading', 'toggle'],
  textProps: ['title'],
  container: {},
  parents: ['tabs'],
  hidden: true,
  render: ({ block, root, slot, children, text }) => (
    <section {...root} id={`ce-panel-${block.id}`} role="tabpanel" aria-labelledby={`ce-tab-${block.id}`}>
      {/* Visible without JavaScript and in the mobile accordion mode. */}
      <h3 className={slot('heading')}>
        <button
          type="button"
          className={slot('toggle')}
          aria-expanded="true"
          aria-controls={`ce-panel-${block.id}`}
        >
          {text('title')}
        </button>
      </h3>
      {children}
    </section>
  ),
  inspector: [{ type: 'text', name: 'title', label: t('Tytuł zakładki', 'Tab title') }],
  i18n: { pl: { name: 'Zakładka' }, en: { name: 'Tab' } },
});

// ---------------------------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------------------------

export const card = defineBlock({
  type: 'card',
  category: 'interactive',
  outline: 'highlight',
  icon: 'card',
  props: z.object({
    image: imageSchema.optional(),
    title: z.string().max(300),
    layout: z.enum(['vertical', 'horizontal']),
    /** Make the whole card clickable (uses the first button's link). */
    linkCard: z.boolean().optional(),
  }),
  defaultProps: { title: '', layout: 'vertical' },
  slots: ['root', 'media', 'img', 'body', 'title', 'text', 'actions'],
  content: true,
  textProps: ['title'],
  container: { allowedChildren: ['button'], maxChildren: 2 },
  keywords: ['karta', 'card', 'kafelek', 'tile', 'teaser'],
  modifiers: (p) => [p.layout, p.linkCard && 'link'],
  render: ({ block, props: p, root, slot, content, children, text, ctx }) => {
    const firstHref = block.children?.[0]?.props.href;
    const stretched = p.linkCard && typeof firstHref === 'string' && sanitizeUrl(firstHref);
    return (
      <article {...root} data-ce-link={stretched ? '' : undefined}>
        {p.image?.src && (
          <div className={slot('media')}>
            <Picture ctx={ctx} image={p.image} className={slot('img')} />
          </div>
        )}
        <div className={slot('body')}>
          {p.title && <h3 className={slot('title')}>{text('title')}</h3>}
          {block.content?.length ? <p className={slot('text')}>{content}</p> : null}
          {children && <div className={slot('actions')}>{children}</div>}
        </div>
      </article>
    );
  },
  inspector: [
    { type: 'media', name: 'image', label: t('Zdjęcie', 'Image'), mediaType: 'image' },
    { type: 'text', name: 'title', label: t('Tytuł', 'Title') },
    {
      type: 'segmented',
      name: 'layout',
      label: t('Układ', 'Layout'),
      options: [
        { value: 'vertical', label: t('Pionowy', 'Vertical') },
        { value: 'horizontal', label: t('Poziomy', 'Horizontal') },
      ],
    },
    { type: 'toggle', name: 'linkCard', label: t('Cała karta klikalna', 'Whole card clickable') },
  ],
  i18n: {
    pl: { name: 'Karta', description: 'Zdjęcie, tytuł, tekst i przycisk' },
    en: { name: 'Card', description: 'Image, title, text and button' },
  },
});

// ---------------------------------------------------------------------------------------------
// Stats / counter
// ---------------------------------------------------------------------------------------------

export const stats = defineBlock({
  type: 'stats',
  category: 'interactive',
  outline: 'interactive',
  icon: 'stats',
  props: z.object({
    columns: responsive(z.number().int().min(1).max(6)),
    animate: z.boolean(),
    /** Animation length in milliseconds. */
    duration: z.number().int().min(200).max(10_000).optional(),
  }),
  defaultProps: { columns: { base: 2, md: 4 }, animate: true },
  slots: ['root'],
  container: {
    allowedChildren: ['stat'],
    minChildren: 1,
    defaultChild: () => ({ type: 'stat', props: { value: 0, label: '' } }),
  },
  keywords: ['licznik', 'statystyki', 'liczby', 'counter', 'numbers'],
  create: () => ({
    type: 'stats',
    props: { columns: { base: 2, md: 4 }, animate: true },
    children: [0, 1, 2].map(() => ({ id: '', type: 'stat', props: { value: 0, label: '' } })),
  }),
  attributes: (p) => {
    const out = attrs();
    addResponsive(out, 'stats-cols', p.columns, (n) => `repeat(${n}, minmax(0, 1fr))`);
    return out;
  },
  responsive: [{ kind: 'var', key: 'stats-cols', declarations: 'grid-template-columns: $;' }],
  render: ({ props: p, root, children, ctx }) => (
    <div {...root}>
      {children}
      {p.animate && island(ctx, 'counter', { duration: p.duration ?? 1600 })}
    </div>
  ),
  inspector: [
    { type: 'number', name: 'columns', label: t('Kolumny', 'Columns'), responsive: true, min: 1, max: 6 },
    { type: 'toggle', name: 'animate', label: t('Animacja przy wejściu w widok', 'Animate when visible') },
    {
      type: 'number',
      name: 'duration',
      label: t('Czas animacji (ms)', 'Animation duration (ms)'),
      advanced: true,
    },
  ],
  i18n: {
    pl: { name: 'Statystyki', description: 'Liczby z animowanym licznikiem' },
    en: { name: 'Stats', description: 'Numbers with an animated counter' },
  },
});

export const stat = defineBlock({
  type: 'stat',
  category: 'interactive',
  outline: 'interactive',
  props: z.object({
    value: z.number(),
    decimals: z.number().int().min(0).max(4).optional(),
    prefix: z.string().max(20).optional(),
    suffix: z.string().max(20).optional(),
    label: z.string().max(300),
    icon: z.string().max(40).optional(),
  }),
  defaultProps: { value: 0, label: '' },
  slots: ['root', 'icon', 'value', 'number', 'label'],
  textProps: ['label', 'prefix', 'suffix'],
  parents: ['stats'],
  hidden: true,
  render: ({ props: p, root, slot, text, ctx }) => {
    const formatted = new Intl.NumberFormat(ctx.locale, {
      minimumFractionDigits: p.decimals ?? 0,
      maximumFractionDigits: p.decimals ?? 0,
    }).format(p.value);
    return (
      <div {...root}>
        {p.icon && <Icon name={p.icon} className={slot('icon')} size={28} />}
        <p className={slot('value')}>
          {p.prefix && text('prefix')}
          <span className={slot('number')} data-ce-value={p.value} data-ce-decimals={p.decimals ?? 0}>
            {formatted}
          </span>
          {p.suffix && text('suffix')}
        </p>
        <p className={slot('label')}>{text('label')}</p>
      </div>
    );
  },
  inspector: [
    { type: 'number', name: 'value', label: t('Wartość', 'Value') },
    { type: 'number', name: 'decimals', label: t('Miejsca po przecinku', 'Decimals'), min: 0, max: 4 },
    { type: 'text', name: 'prefix', label: t('Przedrostek', 'Prefix') },
    { type: 'text', name: 'suffix', label: t('Przyrostek', 'Suffix') },
    { type: 'text', name: 'label', label: t('Opis', 'Label') },
    { type: 'icon', name: 'icon', label: t('Ikona', 'Icon'), icons: ['none', ...ICON_NAMES] },
  ],
  i18n: { pl: { name: 'Liczba' }, en: { name: 'Stat' } },
});

// ---------------------------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------------------------

export const timeline = defineBlock({
  type: 'timeline',
  category: 'interactive',
  outline: 'interactive',
  icon: 'timeline',
  props: z.object({ layout: z.enum(['left', 'alternate']) }),
  defaultProps: { layout: 'left' },
  slots: ['root'],
  container: {
    allowedChildren: ['timeline-item'],
    minChildren: 1,
    defaultChild: () => ({ type: 'timeline-item', props: { date: '', title: '' }, children: [] }),
  },
  keywords: ['oś czasu', 'historia', 'timeline', 'kroki', 'steps'],
  create: () => ({
    type: 'timeline',
    props: { layout: 'left' },
    children: [0, 1, 2].map(() => ({
      id: '',
      type: 'timeline-item',
      props: { date: '', title: '' },
      children: [{ id: '', type: 'paragraph', props: {}, content: [] }],
    })),
  }),
  modifiers: (p) => [p.layout],
  render: ({ root, children }) => <ol {...root}>{children}</ol>,
  inspector: [
    {
      type: 'segmented',
      name: 'layout',
      label: t('Układ', 'Layout'),
      options: [
        { value: 'left', label: t('Po lewej', 'Left') },
        { value: 'alternate', label: t('Naprzemiennie', 'Alternating') },
      ],
    },
  ],
  i18n: {
    pl: { name: 'Oś czasu', description: 'Wydarzenia lub kroki w kolejności' },
    en: { name: 'Timeline', description: 'Events or steps in order' },
  },
});

export const timelineItem = defineBlock({
  type: 'timeline-item',
  category: 'interactive',
  outline: 'interactive',
  props: z.object({
    date: z.string().max(100),
    title: z.string().max(300),
    icon: z.string().max(40).optional(),
  }),
  defaultProps: { date: '', title: '' },
  slots: ['root', 'marker', 'date', 'title', 'body'],
  textProps: ['date', 'title'],
  container: {},
  parents: ['timeline'],
  hidden: true,
  render: ({ props: p, root, slot, children, text }) => (
    <li {...root}>
      <span className={slot('marker')} aria-hidden="true">
        {p.icon && <Icon name={p.icon} size={16} />}
      </span>
      <div className={slot('body')}>
        {p.date && <p className={slot('date')}>{text('date')}</p>}
        {p.title && <h3 className={slot('title')}>{text('title')}</h3>}
        {children}
      </div>
    </li>
  ),
  inspector: [
    { type: 'text', name: 'date', label: t('Data / etap', 'Date / step') },
    { type: 'text', name: 'title', label: t('Tytuł', 'Title') },
    { type: 'icon', name: 'icon', label: t('Ikona', 'Icon'), icons: ['none', ...ICON_NAMES] },
  ],
  i18n: { pl: { name: 'Wydarzenie' }, en: { name: 'Event' } },
});
