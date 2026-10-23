import { renderToStaticMarkup } from 'react-dom/server';
import { documentToPlainText } from '../schema/text';
import type { Block, ContentDocument } from '../schema/types';
import { validateDocument } from '../schema/validate';
import { ContentRenderer, defaultRegistry, validateStructure } from '../renderer/index';
import { jsonLd } from './index';

let seq = 0;
const id = () => `b${++seq}`;
const text = (value: string) => [{ text: value }];
const p = (value: string): Block => ({ id: id(), type: 'paragraph', props: {}, content: text(value) });
const img = (n: number) => ({
  src: `https://img.example/${n}.jpg`,
  alt: `Alt ${n}`,
  width: 1200,
  height: 800,
});

export const allBlocks: Block[] = [
  { id: id(), type: 'heading', props: { level: 2, eyebrow: 'Intro' }, content: text('Heading') },
  {
    id: id(),
    type: 'paragraph',
    props: { size: 'lead' },
    content: text('Lead text'),
    style: { animation: { type: 'fade' } },
  },
  {
    id: id(),
    type: 'quote',
    props: { variant: 'pull', author: 'Ada', source: 'Notes', sourceUrl: 'https://e.com' },
    content: text('Quote'),
  },
  {
    id: id(),
    type: 'callout',
    props: { variant: 'warning', title: 'Careful', collapsible: true },
    children: [p('Inside callout')],
  },
  {
    id: id(),
    type: 'code',
    props: {
      code: 'const x = 1;\nconsole.log(x);\n',
      language: 'javascript',
      filename: 'a.js',
      lineNumbers: true,
      highlightLines: [2],
    },
  },
  { id: id(), type: 'separator', props: { variant: 'dots' } },
  {
    id: id(),
    type: 'list',
    props: { style: 'check', columns: { md: 2 } },
    children: [
      { id: id(), type: 'list-item', props: { checked: true }, content: text('Done') },
      {
        id: id(),
        type: 'list-item',
        props: { checked: false },
        content: text('Todo'),
        children: [{ id: id(), type: 'list-item', props: {}, content: text('Sub') }],
      },
    ],
  },
  {
    id: id(),
    type: 'table',
    props: {
      headerRow: true,
      striped: true,
      mobile: 'cards',
      columnAlign: [null, 'right'],
      caption: 'Prices',
    },
    children: [
      {
        id: id(),
        type: 'table-row',
        props: {},
        children: [
          { id: id(), type: 'table-cell', props: {}, content: text('Item') },
          { id: id(), type: 'table-cell', props: {}, content: text('Price') },
        ],
      },
      {
        id: id(),
        type: 'table-row',
        props: {},
        children: [
          { id: id(), type: 'table-cell', props: {}, content: text('Pizza') },
          { id: id(), type: 'table-cell', props: {}, content: text('12 €') },
        ],
      },
    ],
  },
  {
    id: id(),
    type: 'image',
    props: {
      image: img(1),
      mobileImage: img(2),
      aspect: '16/9',
      focalPoint: { x: 0.3, y: 0.6 },
      captionPosition: 'overlay',
      lightbox: true,
      hover: 'zoom',
    },
    content: text('Caption'),
  },
  {
    id: id(),
    type: 'gallery',
    props: {
      items: [1, 2, 3].map((n) => ({ id: `g${n}`, image: img(n), caption: `Photo ${n}` })),
      layout: { base: 'slider', lg: 'grid' },
      slidesPerView: { base: 1.2, md: 2 },
      autoplay: 5,
      loop: true,
      thumbnails: true,
      lightbox: true,
    },
  },
  {
    id: id(),
    type: 'before-after',
    props: { before: img(1), after: img(2), orientation: 'vertical', start: 30 },
  },
  {
    id: id(),
    type: 'hero',
    props: { media: { type: 'image', image: img(4) }, parallax: true },
    children: [{ id: id(), type: 'heading', props: { level: 2, size: '5xl' }, content: text('Hero') }],
  },
  {
    id: id(),
    type: 'video',
    props: { source: { type: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ' }, title: 'Song' },
  },
  {
    id: id(),
    type: 'video',
    props: { source: { type: 'file', src: 'https://cdn.example/v.mp4' }, background: true },
  },
  { id: id(), type: 'embed', props: { url: 'https://x.com/jack/status/20' } },
  { id: id(), type: 'embed', props: { url: 'https://open.spotify.com/track/abc123', loadOn: 'visible' } },
  {
    id: id(),
    type: 'file',
    props: { file: { src: 'https://cdn.example/guide.pdf', name: 'guide.pdf', size: 2_500_000 } },
  },
  {
    id: id(),
    type: 'buttons',
    props: { align: 'center', fullWidthMobile: true },
    children: [
      {
        id: id(),
        type: 'button',
        props: {
          label: 'Buy',
          href: 'https://shop.example',
          variant: 'primary',
          icon: 'arrow-right',
          iconPosition: 'end',
          newTab: true,
        },
      },
      { id: id(), type: 'button', props: { label: 'More', href: '/more', variant: 'outline', size: 's' } },
    ],
  },
  {
    id: id(),
    type: 'accordion',
    props: { allowMultiple: false, faqSchema: true },
    children: [
      { id: id(), type: 'accordion-item', props: { title: 'Why </script>?' }, children: [p('Because.')] },
      { id: id(), type: 'accordion-item', props: { title: 'How?' }, children: [p('Like this.')] },
    ],
  },
  {
    id: id(),
    type: 'tabs',
    props: {},
    children: [
      { id: id(), type: 'tab', props: { title: 'One' }, children: [p('First')] },
      { id: id(), type: 'tab', props: { title: 'Two' }, children: [p('Second')] },
    ],
  },
  {
    id: id(),
    type: 'card',
    props: { image: img(5), title: 'Card', layout: 'horizontal', linkCard: true },
    content: text('Card text'),
    children: [{ id: id(), type: 'button', props: { label: 'Read', href: '/read' } }],
  },
  {
    id: id(),
    type: 'stats',
    props: { columns: { base: 1, md: 3 }, animate: true },
    children: [
      { id: id(), type: 'stat', props: { value: 1234.5, decimals: 1, suffix: '+', label: 'Users' } },
      { id: id(), type: 'stat', props: { value: 99, suffix: '%', label: 'Uptime', icon: 'zap' } },
    ],
  },
  {
    id: id(),
    type: 'timeline',
    props: { layout: 'alternate' },
    children: [
      { id: id(), type: 'timeline-item', props: { date: '2024', title: 'Start' }, children: [p('Began')] },
      {
        id: id(),
        type: 'timeline-item',
        props: { date: '2025', title: 'Growth', icon: 'rocket' },
        children: [p('Grew')],
      },
    ],
  },
];

const doc: ContentDocument = { version: 1, blocks: allBlocks };
const html = renderToStaticMarkup(<ContentRenderer document={doc} locale="en" dev={false} />);

describe('built-in blocks', () => {
  it('every block type is covered by the kitchen sink', () => {
    const used = new Set<string>();
    const visit = (blocks: Block[]) =>
      blocks.forEach((b) => {
        used.add(b.type);
        if (b.children) visit(b.children);
      });
    visit(allBlocks);
    const missing = defaultRegistry
      .all()
      .map((d) => d.type)
      .filter((type) => !used.has(type) && !['section', 'columns', 'column', 'grid'].includes(type));
    expect(missing).toEqual([]);
  });

  it('validates and passes structure rules', () => {
    const result = validateDocument(doc, defaultRegistry.validateOptions());
    expect(result.success ? [] : result.errors).toEqual([]);
    expect(validateStructure(defaultRegistry, doc)).toEqual([]);
  });

  it('never renders concrete CSS properties inline', () => {
    const declarations = [...html.matchAll(/style="([^"]*)"/g)].flatMap((m) =>
      m[1]!
        .replaceAll('&quot;', '"')
        .split(/;(?=--|$)/)
        .filter(Boolean),
    );
    expect(declarations.length).toBeGreaterThan(5);
    for (const declaration of declarations) expect(declaration).toMatch(/^--ce-[\w-]+:/);
  });

  it('extracts searchable text including text props', () => {
    const plain = documentToPlainText(doc, { textProps: defaultRegistry.textProps() });
    for (const s of ['Ada', 'Careful', 'Buy', 'Why </script>?', 'Two', 'Users', '2025', 'Prices', 'Sub']) {
      expect(plain).toContain(s);
    }
  });

  it('renders text blocks', () => {
    expect(html).toContain('<figure class="ce-quote ce-quote--pull ce-block">');
    expect(html).toContain('<a href="https://e.com"><cite class="ce-quote__source">Notes</cite></a>');
    expect(html).toMatch(
      /<details class="ce-callout ce-callout--warning ce-callout--collapsible ce-block"><summary/,
    );
    expect(html).toContain('<span class="hljs-keyword">const</span>');
    expect(html).toContain('class="ce-code__line ce-code__line--highlighted"');
    expect(html).toContain('data-ce-island="copy"');
    expect(html).toContain('<hr class="ce-separator ce-separator--dots ce-separator--size-m ce-block"/>');
  });

  it('renders lists and tables semantically', () => {
    expect(html).toMatch(/<ul class="ce-list__items"><li class="ce-list__item"><svg[^>]*ce-list__marker/);
    expect(html).toContain('ce-md-list-cols');
    expect(html).toContain('<th scope="col" class="ce-table__headerCell">Item</th>');
    expect(html).toContain(
      '<td data-label="Price" class="ce-table__cell ce-table__cell--align-right">12 €</td>',
    );
    expect(html).toContain('<caption class="ce-table__caption">Prices</caption>');
  });

  it('renders media with art direction, focal point and lazy loading', () => {
    expect(html).toContain(
      '<source media="(max-width: 767.98px)" srcSet="https://img.example/2.jpg" width="1200" height="800"/>',
    );
    expect(html).toContain('--ce-focal:30% 60%');
    expect(html).toContain('--ce-aspect:16 / 9');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('href="https://img.example/1.jpg" class="ce-image__frame" data-ce-lightbox=""');
    expect(html).toContain('data-ce-island="lightbox"');
  });

  it('renders the gallery once with responsive layouts and slider controls', () => {
    expect(html).toContain('ce-gallery-slider ce-lg-gallery-grid');
    expect(html).toContain('--ce-gallery-spv:1.2;--ce-md-gallery-spv:2');
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-label="Slide 2 of 3"');
    expect(html).toContain('class="ce-gallery__arrow ce-gallery__arrow--toggle"');
    expect(html).toContain('class="ce-gallery__thumbs"');
    expect(html).toMatch(/data-ce-island="slider"/);
  });

  it('renders before/after, hero, video and embeds without loading third parties', () => {
    expect(html).toContain('aria-orientation="vertical" value="30"/>');
    expect(html).toContain('--ce-ba-pos:30%');
    expect(html).toContain(
      'class="ce-hero ce-hero--valign-center ce-hero--content-normal ce-hero--parallax ce-block',
    );
    expect(html).toContain(
      'href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" class="ce-video__play" aria-label="Play video: Song"',
    );
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('platform.twitter.com/widgets.js');
    expect(html).toContain(
      '<blockquote class="twitter-tweet" data-dnt="true"><a href="https://twitter.com/jack/status/20">',
    );
    expect(html).toContain('Load content from Spotify');
    expect(html).toMatch(/autoPlay="" muted="" loop=""/);
    expect(html).toContain('download="guide.pdf"');
    expect(html).toContain('PDF · 2.4 MB');
  });

  it('renders interactive blocks with native, accessible markup', () => {
    expect(html).toContain(
      'href="https://shop.example" class="ce-button ce-button--variant-primary ce-button--size-m ce-block"',
    );
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('--ce-btn-bg:var(--ce-button-primary-bg)');
    expect(html).toMatch(/<details class="ce-accordion-item ce-block" name="ce-accordion-b\d+">/);
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).not.toContain('</script>?');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('ce-card--link');
    expect(html).toContain('data-ce-value="1234.5"');
    expect(html).toContain('1,234.5');
    expect(html).toContain('<ol class="ce-timeline ce-timeline--alternate ce-block">');
  });

  it('adds the scroll animation island only when needed', () => {
    expect(html).toContain('data-ce-island="animations"');
    const plainDoc = renderToStaticMarkup(
      <ContentRenderer document={{ version: 1, blocks: [p('x')] }} dev={false} />,
    );
    expect(plainDoc).not.toContain('ce-island');
  });

  it('localizes renderer strings', () => {
    const pl = renderToStaticMarkup(<ContentRenderer document={doc} locale="pl" dev={false} />);
    expect(pl).toContain('Następny slajd');
    expect(pl).toContain('1234,5');
  });

  it('escapes JSON-LD', () => {
    expect(jsonLd({ a: '</script><b>' })).toBe('{"a":"\\u003c/script>\\u003cb>"}');
  });
});
