import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';
import type { Block, ContentDocument } from '../schema/types';
import { validateDocument } from '../schema/validate';
import {
  ContentRenderer,
  canContain,
  createDefaultRegistry,
  defaultRegistry,
  defaultTheme,
  defineBlock,
  defineTheme,
  responsiveCss,
  themeToCss,
  validateStructure,
  type ContentRendererProps,
} from './index';

const doc = (blocks: Block[]): ContentDocument => ({ version: 1, blocks });
const render = (blocks: Block[], props: Partial<ContentRendererProps> = {}) =>
  renderToStaticMarkup(<ContentRenderer document={doc(blocks)} dev={false} {...props} />);

const p = (id: string, text: string, extra: Partial<Block> = {}): Block => ({
  id,
  type: 'paragraph',
  props: {},
  content: [{ text }],
  ...extra,
});

/** Every `style="…"` attribute may only declare `--ce-*` custom properties. */
function inlineDeclarations(html: string): string[] {
  return [...html.matchAll(/style="([^"]*)"/g)].flatMap((m) =>
    m[1]!
      .replaceAll('&quot;', '"')
      .split(/;(?=--|$)/)
      .map((d) => d.trim())
      .filter(Boolean),
  );
}

const kitchenSink: Block[] = [
  {
    id: 'h',
    type: 'heading',
    props: {
      level: 2,
      size: '4xl',
      align: { base: 'left', md: 'center' },
      color: 'primary',
      font: 'serif',
      eyebrow: 'Rozdział 1',
      decoration: 'underline',
    },
    style: {
      margin: { top: { base: 's', lg: { custom: '4rem' } }, bottom: 'm' },
      padding: { left: 'xs', right: 'xs' },
      width: { base: 'normal', md: 'wide', xl: { max: '60rem' } },
      background: {
        type: 'image',
        src: 'https://img.example/a.jpg',
        overlay: 0.5,
        focalPoint: { x: 0.2, y: 0.8 },
      },
      radius: 'm',
      border: 's',
      shadow: 'l',
      animation: { type: 'slide', direction: 'left', delay: 200 },
      hidden: { mobile: true },
      anchor: 'start',
      className: 'my-heading',
      variant: 'fancy',
    },
    content: [
      { text: 'Moja podróż do ' },
      { text: 'Włoch', marks: [{ type: 'bold' }, { type: 'color', color: 'accent' }, { type: 'highlight' }] },
    ],
  },
  p('p', 'Lead', { props: { size: 'lead', dropCap: true, columnsFrom: 'md' } }),
  {
    id: 's',
    type: 'section',
    props: { contentWidth: 'wide', minHeight: { base: 'screen', md: '40rem' }, verticalAlign: 'center' },
    style: { background: { type: 'gradient', from: 'primary', to: 'accent', angle: 45 } },
    children: [
      {
        id: 'cols',
        type: 'columns',
        props: {
          layout: { base: '100', md: '33-67' },
          gap: { base: 's', lg: 'l' },
          verticalAlign: 'center',
          reverse: { md: true },
          dividers: true,
        },
        children: [
          { id: 'c1', type: 'column', props: { sticky: true, order: { md: 2 } }, children: [p('p1', 'one')] },
          { id: 'c2', type: 'column', props: {}, children: [p('p2', 'two')] },
        ],
      },
      {
        id: 'g',
        type: 'grid',
        props: { columns: { base: 1, md: 3 }, gap: 'm' },
        children: [p('g1', 'a'), p('g2', 'b')],
      },
    ],
  },
];

describe('ContentRenderer', () => {
  it('validates the kitchen-sink document with the default registry', () => {
    const result = validateDocument(doc(kitchenSink), defaultRegistry.validateOptions());
    expect(result.success ? [] : result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(validateStructure(defaultRegistry, doc(kitchenSink))).toEqual([]);
  });

  it('never renders concrete CSS properties inline, only --ce-* custom properties', () => {
    const html = render(kitchenSink);
    const declarations = inlineDeclarations(html);
    expect(declarations.length).toBeGreaterThan(10);
    for (const declaration of declarations) expect(declaration).toMatch(/^--ce-[\w-]+:/);
  });

  it('maps block style to classes and custom properties', () => {
    const html = render(kitchenSink.slice(0, 1));
    // The heading's anchor goes to the <h2>, not to the wrapper.
    expect(html.match(/id="start"/g)).toHaveLength(1);
    for (const cls of [
      'ce-block',
      'ce-heading',
      'ce-heading--level-2',
      'ce-heading--deco-underline',
      'ce-mt',
      'ce-lg-mt',
      'ce-mb',
      'ce-pl',
      'ce-pr',
      'ce-w-normal',
      'ce-md-w-wide',
      'ce-xl-w-custom',
      'ce-xl-w-max',
      'ce-align-left',
      'ce-md-align-center',
      'ce-bg-image',
      'ce-radius-m',
      'ce-border-s',
      'ce-shadow-l',
      'ce-anim-slide',
      'ce-anim-from-left',
      'ce-hide-mobile',
      'ce-variant-fancy',
      'my-heading',
    ]) {
      expect(html).toMatch(new RegExp(`class="[^"]*\\b${cls}\\b`));
    }
    expect(html).toContain('--ce-mt:var(--ce-space-s)');
    expect(html).toContain('--ce-lg-mt:4rem');
    expect(html).toContain('--ce-xl-w-max:60rem');
    expect(html).toContain('--ce-bg-image:url(&quot;https://img.example/a.jpg&quot;)');
    expect(html).toContain('--ce-bg-position:20% 80%');
    expect(html).toContain('--ce-anim-delay:200ms');
    expect(html).toContain('--ce-heading-size:var(--ce-text-4xl)');
    expect(html).toContain('<p class="ce-heading__eyebrow">Rozdział 1</p>');
    expect(html).toContain('<h2 class="ce-heading__text" id="start">');
    expect(render([{ ...kitchenSink[0]!, style: {} }])).toContain(
      '<h2 class="ce-heading__text" id="moja-podroz-do-wloch">',
    );
  });

  it('renders nested layout blocks with responsive classes', () => {
    const html = render(kitchenSink.slice(2));
    expect(html).toContain('<section class="ce-section');
    expect(html).toContain('ce-section--content-wide');
    expect(html).toContain('--ce-min-h:100svh');
    expect(html).toContain('--ce-md-min-h:40rem');
    expect(html).toContain('--ce-md-cols:1fr 2fr');
    expect(html).toContain('ce-md-cols-reverse-true');
    expect(html).toContain('ce-cols-valign-center');
    expect(html).toContain('ce-columns--dividers');
    expect(html).toContain('ce-column--sticky');
    expect(html).toContain('--ce-md-col-order:2');
    expect(html).toContain('--ce-md-grid-cols:repeat(3, minmax(0, 1fr))');
    expect(html).toContain('class="ce-columns__grid"');
  });

  it('uses the albatross technique for a custom switch point', () => {
    const html = render([
      {
        id: 'c',
        type: 'columns',
        props: { layout: '33-67', stackBelow: '50rem' },
        children: [
          { id: 'a', type: 'column', props: {}, children: [] },
          { id: 'b', type: 'column', props: {}, children: [] },
        ],
      },
    ]);
    expect(html).toContain('ce-columns--switch');
    expect(html).toContain('--ce-columns-switch:50rem;--ce-col-1-grow:1;--ce-col-2-grow:2');
    expect(html).not.toContain('--ce-cols:');
  });

  it('builds custom column tracks from the columns’ widths', () => {
    const html = render([
      {
        id: 'c',
        type: 'columns',
        props: { layout: { md: 'custom' } },
        children: [
          { id: 'a', type: 'column', props: { width: 3 }, children: [] },
          { id: 'b', type: 'column', props: { width: 1 }, children: [] },
        ],
      },
    ]);
    expect(html).toContain('--ce-md-cols:minmax(0, 3fr) minmax(0, 1fr)');
  });

  it('renders inline marks with stable nesting and merges adjacent links', () => {
    const html = render([
      {
        id: 'x',
        type: 'paragraph',
        props: {},
        content: [
          { text: 'a\nb', marks: [{ type: 'italic' }, { type: 'bold' }] },
          { text: 'link ', marks: [{ type: 'link', href: 'https://e.com', newTab: true }] },
          { text: 'bold', marks: [{ type: 'link', href: 'https://e.com', newTab: true }, { type: 'bold' }] },
          { text: 'x²', marks: [{ type: 'superscript' }, { type: 'code' }] },
          { text: 'bad', marks: [{ type: 'link', href: 'javascript:alert(1)' }] },
        ],
      },
    ]);
    expect(html).toContain('<strong><em>a<br/>b</em></strong>');
    expect(html).toContain(
      '<a href="https://e.com" class="ce-link" target="_blank" rel="noopener noreferrer">link <strong>bold</strong></a>',
    );
    expect(html).toContain('<sup><code class="ce-code-inline">x²</code></sup>');
    expect(html).toContain('bad</p>');
    expect(html).not.toContain('javascript:');
  });

  it('shows a fallback for unknown blocks only in dev mode', () => {
    const blocks = [{ id: 'u', type: 'mystery', props: {} }];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(render(blocks)).toBe('<div class="ce-document"></div>');
    expect(render(blocks, { dev: true })).toContain('Unknown block type “mystery”');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('applies project classNames per slot, per variant, as a function, and document classes', () => {
    const html = render(
      [
        {
          id: 'h',
          type: 'heading',
          props: { level: 3, eyebrow: 'E' },
          style: { variant: 'fancy' },
          classes: { root: 'mt-12', text: 'text-red-300 font-black' },
          content: [{ text: 'T' }],
        },
      ],
      {
        classNames: {
          '*': { slots: { root: 'all-blocks' } },
          heading: {
            slots: ({ props }) => ({ text: props.level === 3 ? 'h3-style' : 'other', eyebrow: 'eyebrow-x' }),
            variants: { fancy: { root: 'fancy-root', text: 'fancy-text' } },
          },
        },
      },
    );
    expect(html).toMatch(/class="ce-heading [^"]*all-blocks fancy-root mt-12"/);
    expect(html).toContain('class="ce-heading__eyebrow eyebrow-x"');
    expect(html).toContain('class="ce-heading__text h3-style fancy-text text-red-300 font-black"');
  });

  it('passes default and project classes to a custom merge function', () => {
    const merge = vi.fn((defaults: string, project: string) => `${defaults} | ${project}`);
    const html = render([p('a', 'x', { classes: { root: 'text-lg' } })], { mergeClasses: merge });
    expect(merge).toHaveBeenCalledWith('ce-paragraph ce-block', 'text-lg');
    expect(html).toContain('class="ce-paragraph ce-block | text-lg"');
  });

  it('lets projects override block components and primitives', () => {
    const html = render(
      [p('a', 'hello', { content: [{ text: 'go', marks: [{ type: 'link', href: '/x' }] }] })],
      {
        components: {
          blocks: {
            paragraph: ({ Default, ...props }) => (
              <div className="wrapper">
                <Default {...props} />
              </div>
            ),
          },
          Link: ({ href, children }) => (
            <a data-next-link href={href}>
              {children}
            </a>
          ),
        },
      },
    );
    expect(html).toContain(
      '<div class="wrapper"><p class="ce-paragraph ce-block"><a data-next-link="true" href="/x">go</a></p></div>',
    );
  });

  it('renders custom blocks defined with defineBlock', () => {
    const note = defineBlock({
      type: 'acme/note',
      category: 'text',
      props: z.object({ tone: z.enum(['calm', 'loud']) }),
      defaultProps: { tone: 'calm' },
      slots: ['root', 'label'],
      content: true,
      modifiers: (props) => [props.tone],
      render: ({ root, slot, content }) => (
        <aside {...root}>
          <b className={slot('label')}>Note</b>
          {content}
        </aside>
      ),
    });
    const registry = createDefaultRegistry([note]);
    const html = render([{ id: 'n', type: 'acme/note', props: {}, content: [{ text: 'Hi' }] }], { registry });
    expect(html).toContain(
      '<aside class="ce-acme-note ce-acme-note--calm ce-block"><b class="ce-acme-note__label">Note</b>Hi</aside>',
    );
    expect(() => defineBlock({ ...note, slots: ['label'] } as unknown as typeof note)).toThrow(/root/);
  });

  it('includes generated per-document CSS', () => {
    const html = render([], { generatedCss: { css: '.x{color:red}', hash: 'abc' } });
    expect(html).toContain('.x{color:red}');
  });
});

describe('nesting rules', () => {
  const block = (type: string, children: Block[] = []): Block => ({
    id: Math.random().toString(36).slice(2),
    type,
    props: {},
    children,
  });

  it('allows one level of container nesting by default', () => {
    const section = block('section');
    const columns = block('columns');
    const column = block('column');
    expect(canContain(defaultRegistry, null, 'section')).toBe(true);
    expect(canContain(defaultRegistry, section, 'columns')).toBe(true);
    expect(canContain(defaultRegistry, column, 'paragraph', [section, columns])).toBe(true);
    expect(canContain(defaultRegistry, column, 'grid', [section, columns])).toBe(false);
    expect(
      canContain(createDefaultRegistry([], { maxNestingDepth: 2 }), column, 'grid', [section, columns]),
    ).toBe(true);
  });

  it('enforces structural parents and allowed children', () => {
    expect(canContain(defaultRegistry, null, 'column')).toBe(false);
    expect(canContain(defaultRegistry, block('columns'), 'paragraph')).toBe(false);
    expect(canContain(defaultRegistry, block('paragraph'), 'paragraph')).toBe(false);
  });

  it('reports structural problems with paths', () => {
    const issues = validateStructure(
      defaultRegistry,
      doc([
        block('section', [block('columns', [block('column', [block('grid')])])]),
        block('column'),
        block('columns'),
      ]),
    );
    expect(issues.map((i) => [i.path, i.message])).toEqual([
      ['blocks[0].children[0].children[0].children[0]', 'Block "grid" is not allowed inside "column"'],
      ['blocks[1]', 'Block "column" is not allowed at this position'],
      ['blocks[2].children', 'At least 1 children required'],
    ]);
  });
});

describe('theme', () => {
  it('emits tokens as custom properties inside @layer ce.theme', () => {
    const css = themeToCss(defaultTheme);
    expect(css.startsWith('@layer ce.theme {')).toBe(true);
    expect(css).toContain('--ce-color-primary: #3b5bdb;');
    expect(css).toContain('--ce-color-primary-contrast: #ffffff;');
    expect(css).toContain('--ce-space-m: 1.75rem;');
    expect(css).toContain('--ce-text-m: clamp(1rem, 0.9583rem + 0.2083cqi, 1.125rem);');
    expect(css).toContain('--ce-button-primary-bg: var(--ce-color-primary);');
    expect(css).toContain('@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {');
    expect(css).toContain('.dark, [data-theme="dark"] { --ce-color-text: #e9e9ee;');
  });

  it('merges theme input with the defaults', () => {
    const theme = defineTheme({
      colors: { brand: { value: '#ff0066' } },
      breakpoints: { md: 800 },
      darkMode: 'class',
      fonts: {
        body: {
          family: 'Inter, sans-serif',
          files: [{ src: '/fonts/inter.woff2', format: 'woff2', weight: '100 900' }],
        },
      },
    });
    expect(theme.colors.primary).toEqual(defaultTheme.colors.primary);
    expect(theme.breakpoints).toEqual({ sm: 640, md: 800, lg: 1024, xl: 1280 });
    const css = themeToCss(theme, { selector: '.blog' });
    expect(css).toContain(
      '@font-face { font-family: Inter; src: url("/fonts/inter.woff2") format("woff2"); font-weight: 100 900;',
    );
    expect(css).toContain('.blog { --ce-font-body: Inter, sans-serif;');
    expect(css).not.toContain('prefers-color-scheme');
    expect(css).toContain('.dark .blog, .dark.blog, [data-theme="dark"] .blog, [data-theme="dark"].blog {');
  });
});

describe('responsiveCss', () => {
  it('generates container queries by default and media queries on request', () => {
    const css = responsiveCss({ rules: defaultRegistry.responsiveRules() });
    expect(css).toContain('.ce-mt { margin-block-start: var(--ce-mt); }');
    expect(css).toContain(
      '@container ce-doc (min-width: 768px) {\n.ce-md-mt { margin-block-start: var(--ce-md-mt); }',
    );
    expect(css).toContain('.ce-md-cols > .ce-columns__grid { grid-template-columns: var(--ce-md-cols); }');
    expect(css).toContain(
      ':where(.ce-md-cols-reverse-true) > .ce-columns__grid > :nth-child(1) { order: 6; }',
    );
    expect(css).toContain('.ce-lg-w-wide { grid-column: wide;');
    expect(css).toContain('@container ce-doc (max-width: 767.98px) { .ce-hide-mobile { display: none; } }');

    const media = responsiveCss({
      mode: 'media',
      theme: { breakpoints: { sm: 600, md: 900, lg: 1200, xl: 1500 } },
    });
    expect(media).toContain('@media (min-width: 900px) {');
    expect(media).not.toContain('@container');
  });
});
