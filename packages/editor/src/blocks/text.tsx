import { z } from 'zod';
import { defineBlock } from '../core/define-block';
import { CODE_LANGUAGES, splitLines } from '../core/highlight';
import { Icon, ICON_NAMES } from '../core/icons';
import { cx } from '../core/classes';
import type { StyleAttributes } from '../core/style';
import { island } from '../renderer/island';
import { safeUrl, t, tokenName } from './shared';

// ---------------------------------------------------------------------------------------------
// Quote
// ---------------------------------------------------------------------------------------------

export const quote = defineBlock({
  type: 'quote',
  category: 'text',
  outline: 'highlight',
  icon: 'quote',
  props: z.object({
    variant: z.enum(['line', 'quotes', 'pull']),
    author: z.string().max(200).optional(),
    source: z.string().max(300).optional(),
    sourceUrl: safeUrl.optional(),
  }),
  defaultProps: { variant: 'line' },
  slots: ['root', 'text', 'caption', 'author', 'source'],
  content: true,
  textProps: ['author', 'source'],
  keywords: ['cytat', 'blockquote', 'pull quote'],
  modifiers: (p) => [p.variant],
  render: ({ props: p, root, slot, content, text, ctx }) => {
    const { Link } = ctx.components;
    const source = p.source ? <cite className={slot('source')}>{text('source')}</cite> : null;
    return (
      <figure {...root}>
        <blockquote className={slot('text')} cite={p.sourceUrl}>
          <p>{content}</p>
        </blockquote>
        {(p.author || p.source) && (
          <figcaption className={slot('caption')}>
            {p.author && <span className={slot('author')}>{text('author')}</span>}
            {p.author && p.source && ', '}
            {source && p.sourceUrl ? <Link href={p.sourceUrl}>{source}</Link> : source}
          </figcaption>
        )}
      </figure>
    );
  },
  inspector: [
    {
      type: 'segmented',
      name: 'variant',
      label: t('Wariant', 'Variant'),
      options: [
        { value: 'line', label: t('Kreska', 'Line') },
        { value: 'quotes', label: t('Cudzysłów', 'Quote marks') },
        { value: 'pull', label: t('Wyróżniony', 'Pull quote') },
      ],
    },
    { type: 'text', name: 'author', label: t('Autor', 'Author') },
    { type: 'text', name: 'source', label: t('Źródło', 'Source') },
    { type: 'url', name: 'sourceUrl', label: t('Link do źródła', 'Source link') },
  ],
  i18n: {
    pl: { name: 'Cytat', description: 'Cytat z autorem i źródłem' },
    en: { name: 'Quote', description: 'Quotation with author and source' },
  },
});

// ---------------------------------------------------------------------------------------------
// Callout
// ---------------------------------------------------------------------------------------------

const CALLOUT_ICONS = { info: 'info', warning: 'warning', success: 'success', tip: 'tip' } as const;

export const callout = defineBlock({
  type: 'callout',
  category: 'text',
  outline: 'highlight',
  icon: 'info',
  props: z.object({
    variant: z.enum(['info', 'warning', 'success', 'tip']),
    /** Icon name, `auto` (variant's icon) or `none`. */
    icon: z.string().max(40).optional(),
    title: z.string().max(200).optional(),
    collapsible: z.boolean().optional(),
    defaultOpen: z.boolean().optional(),
  }),
  defaultProps: { variant: 'info', icon: 'auto' },
  slots: ['root', 'header', 'icon', 'title', 'body'],
  textProps: ['title'],
  container: {},
  keywords: ['ramka', 'box', 'note', 'uwaga', 'info', 'alert', 'ciekawostka'],
  create: () => ({
    type: 'callout',
    props: { variant: 'info', icon: 'auto' },
    children: [{ id: '', type: 'paragraph', props: {}, content: [] }],
  }),
  modifiers: (p) => [p.variant, p.collapsible && 'collapsible'],
  render: ({ props: p, root, slot, children, text, ctx }) => {
    const iconName =
      p.icon === 'none' ? undefined : p.icon && p.icon !== 'auto' ? p.icon : CALLOUT_ICONS[p.variant];
    const header = (iconName || p.title) && (
      <>
        <Icon name={iconName} className={slot('icon')} />
        {p.title && <strong className={slot('title')}>{text('title')}</strong>}
      </>
    );
    const body = <div className={slot('body')}>{children}</div>;
    if (p.collapsible && ctx.mode !== 'editor') {
      return (
        <details {...root} open={p.defaultOpen}>
          <summary className={slot('header')}>{header}</summary>
          {body}
        </details>
      );
    }
    return (
      // Static content, so `note` rather than `alert` even for warnings.
      <aside {...root} role="note">
        {header && <div className={slot('header')}>{header}</div>}
        {body}
      </aside>
    );
  },
  inspector: [
    {
      type: 'segmented',
      name: 'variant',
      label: t('Wariant', 'Variant'),
      options: [
        { value: 'info', label: t('Info', 'Info') },
        { value: 'warning', label: t('Uwaga', 'Warning') },
        { value: 'success', label: t('Sukces', 'Success') },
        { value: 'tip', label: t('Ciekawostka', 'Tip') },
      ],
    },
    { type: 'icon', name: 'icon', label: t('Ikona', 'Icon'), icons: ['auto', 'none', ...ICON_NAMES] },
    { type: 'text', name: 'title', label: t('Tytuł', 'Title') },
    { type: 'toggle', name: 'collapsible', label: t('Zwijany', 'Collapsible') },
    {
      type: 'toggle',
      name: 'defaultOpen',
      label: t('Domyślnie rozwinięty', 'Open by default'),
      when: (props) => Boolean(props.collapsible),
    },
  ],
  i18n: {
    pl: { name: 'Ramka', description: 'Wyróżniona informacja, uwaga, ciekawostka' },
    en: { name: 'Callout', description: 'Highlighted note, warning or tip' },
  },
});

// ---------------------------------------------------------------------------------------------
// Code
// ---------------------------------------------------------------------------------------------

export const code = defineBlock({
  type: 'code',
  category: 'text',
  outline: 'highlight',
  icon: 'file-code',
  props: z.object({
    code: z.string().max(200_000),
    language: z.string().max(40),
    filename: z.string().max(200).optional(),
    lineNumbers: z.boolean().optional(),
    copyButton: z.boolean().optional(),
    /** 1-based line numbers to emphasize. */
    highlightLines: z.array(z.number().int().positive()).max(500).optional(),
  }),
  defaultProps: { code: '', language: 'text', copyButton: true },
  slots: ['root', 'header', 'filename', 'pre', 'code', 'line', 'copy'],
  textProps: ['filename'],
  keywords: ['kod', 'snippet', 'pre', 'syntax'],
  modifiers: (p) => [p.lineNumbers && 'line-numbers'],
  render: ({ props: p, root, slot, text, ctx }) => {
    const tokens = ctx.highlight(p.code, p.language) ?? [{ text: p.code, classes: [] }];
    const emphasized = new Set(p.highlightLines);
    const lines = splitLines(tokens);
    // A trailing newline should not produce an empty numbered line.
    if (lines.length > 1 && lines[lines.length - 1]!.length === 0) lines.pop();
    return (
      <figure {...root}>
        {(p.filename || p.copyButton) && (
          <figcaption className={slot('header')}>
            {p.filename && <span className={slot('filename')}>{text('filename')}</span>}
            {p.copyButton && (
              <button type="button" className={slot('copy')} data-copied-label={ctx.t('copied')}>
                {ctx.t('copy')}
              </button>
            )}
          </figcaption>
        )}
        <pre className={slot('pre')} tabIndex={0}>
          <code className={cx(slot('code'), `language-${p.language}`)}>
            {lines.map((line, i) => (
              <span key={i} className={slot('line', emphasized.has(i + 1) && 'highlighted')}>
                {line.map((token, j) =>
                  token.classes.length ? (
                    <span key={j} className={token.classes.join(' ')}>
                      {token.text}
                    </span>
                  ) : (
                    token.text
                  ),
                )}
                {'\n'}
              </span>
            ))}
          </code>
        </pre>
        {p.copyButton && island(ctx, 'copy')}
      </figure>
    );
  },
  inspector: [
    {
      type: 'select',
      name: 'language',
      label: t('Język', 'Language'),
      options: CODE_LANGUAGES.map((value) => ({ value, label: value })),
    },
    { type: 'text', name: 'filename', label: t('Nazwa pliku', 'File name') },
    { type: 'toggle', name: 'lineNumbers', label: t('Numeracja linii', 'Line numbers') },
    { type: 'toggle', name: 'copyButton', label: t('Przycisk „kopiuj”', 'Copy button') },
    {
      type: 'numberList',
      name: 'highlightLines',
      label: t('Wyróżnione linie', 'Highlighted lines'),
      advanced: true,
    },
  ],
  i18n: {
    pl: { name: 'Kod', description: 'Kod z podświetlaniem składni' },
    en: { name: 'Code', description: 'Code with syntax highlighting' },
  },
});

// ---------------------------------------------------------------------------------------------
// Separator
// ---------------------------------------------------------------------------------------------

export const separator = defineBlock({
  type: 'separator',
  category: 'text',
  outline: 'none',
  icon: 'minus',
  props: z.object({
    variant: z.enum(['line', 'dots', 'ornament', 'space']),
    size: z.enum(['xs', 's', 'm', 'l', 'xl']).optional(),
    color: tokenName.optional(),
  }),
  defaultProps: { variant: 'line', size: 'm' },
  slots: ['root'],
  keywords: ['hr', 'linia', 'divider', 'odstęp', 'spacer'],
  modifiers: (p) => [p.variant, p.size && `size-${p.size}`],
  attributes: (p): StyleAttributes => ({
    classes: [],
    vars: p.color
      ? { '--ce-separator-color': `var(--ce-color-${p.color})` }
      : ({} as StyleAttributes['vars']),
  }),
  render: ({ props: p, root }) =>
    p.variant === 'space' ? <div {...root} aria-hidden="true" /> : <hr {...root} />,
  inspector: [
    {
      type: 'segmented',
      name: 'variant',
      label: t('Wygląd', 'Style'),
      options: [
        { value: 'line', label: t('Linia', 'Line') },
        { value: 'dots', label: t('Kropki', 'Dots') },
        { value: 'ornament', label: t('Ozdobnik', 'Ornament') },
        { value: 'space', label: t('Odstęp', 'Space') },
      ],
    },
    {
      type: 'segmented',
      name: 'size',
      label: t('Wielkość odstępu', 'Spacing'),
      options: ['xs', 's', 'm', 'l', 'xl'].map((value) => ({ value, label: value.toUpperCase() })),
    },
    { type: 'color', name: 'color', label: t('Kolor', 'Color'), when: (props) => props.variant !== 'space' },
  ],
  i18n: {
    pl: { name: 'Separator', description: 'Linia, kropki, ozdobnik lub odstęp' },
    en: { name: 'Separator', description: 'Line, dots, ornament or space' },
  },
});
