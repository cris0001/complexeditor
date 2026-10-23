import { z } from 'zod';
import {
  DOCUMENT_VERSION,
  MigrationError,
  createId,
  documentToPlainText,
  extractHeadings,
  isResponsiveObject,
  migrate,
  parseDocument,
  EMBED_SCRIPTS,
  parseEmbedUrl,
  readingTime,
  resolveResponsive,
  safeParseDocument,
  sanitizeUrl,
  schemas,
  setResponsive,
  slugify,
  validateDocument,
  type Block,
  type ContentDocument,
} from './index';

const heading = (id: string, text: string, props: Record<string, unknown> = { level: 2 }): Block => ({
  id,
  type: 'heading',
  props,
  content: [{ text }],
});

const doc = (blocks: Block[]): ContentDocument => ({ version: DOCUMENT_VERSION, blocks });

describe('responsive values', () => {
  it('detects responsive objects', () => {
    expect(isResponsiveObject({ base: 1, md: 2 })).toBe(true);
    expect(isResponsiveObject(3)).toBe(false);
    expect(isResponsiveObject({ max: '10px' })).toBe(false);
    expect(isResponsiveObject({})).toBe(false);
  });

  it('inherits mobile-first', () => {
    const value = { base: 'left', md: 'center' };
    expect(resolveResponsive(value, 'base')).toBe('left');
    expect(resolveResponsive(value, 'sm')).toBe('left');
    expect(resolveResponsive(value, 'xl')).toBe('center');
    expect(resolveResponsive('right', 'lg')).toBe('right');
    expect(resolveResponsive({ md: 1 }, 'sm')).toBeUndefined();
  });

  it('sets and resets per breakpoint, collapsing to a plain value', () => {
    let value = setResponsive<string>('left', 'md', 'center');
    expect(value).toEqual({ base: 'left', md: 'center' });
    value = setResponsive(value, 'md', undefined);
    expect(value).toBe('left');
    expect(setResponsive(value, 'base', undefined)).toBeUndefined();
  });
});

describe('sanitizeUrl', () => {
  it.each([
    'https://example.com/a?b=1',
    'http://x.pl',
    'mailto:a@b.pl',
    'tel:+48123',
    '/blog/post',
    '#toc',
    '?q=1',
  ])('accepts %s', (url) => expect(sanitizeUrl(url)).toBe(url));

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html;base64,xxx',
    'vbscript:msgbox',
    '//evil.com',
    '',
  ])('rejects %j', (url) => expect(sanitizeUrl(url)).toBeUndefined());

  it('can forbid relative URLs', () => {
    expect(sanitizeUrl('/a', { allowRelative: false })).toBeUndefined();
  });
});

describe('parseEmbedUrl', () => {
  it.each([
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'youtube',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/abc_123', 'youtube', 'https://www.youtube-nocookie.com/embed/abc_123'],
    ['https://vimeo.com/76979871', 'vimeo', 'https://player.vimeo.com/video/76979871'],
    [
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
      'spotify',
      'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
    ],
    [
      'https://www.google.com/maps/embed?pb=!1m18',
      'google-maps',
      'https://www.google.com/maps/embed?pb=!1m18',
    ],
    [
      'https://codepen.io/jane/pen/abcDEF',
      'codepen',
      'https://codepen.io/jane/embed/abcDEF?default-tab=result',
    ],
  ])('parses %s', (url, provider, embedUrl) => {
    expect(parseEmbedUrl(url)).toMatchObject({ kind: 'iframe', provider, embedUrl });
  });

  it.each([
    ['https://x.com/jack/status/20', 'x', 'https://twitter.com/jack/status/20', EMBED_SCRIPTS.x],
    ['https://twitter.com/jack/status/20?s=1', 'x', 'https://twitter.com/jack/status/20', EMBED_SCRIPTS.x],
    [
      'https://www.instagram.com/reel/Cabc-123/?igsh=x',
      'instagram',
      'https://www.instagram.com/reel/Cabc-123/',
      EMBED_SCRIPTS.instagram,
    ],
  ])('parses script embed %s', (url, provider, canonicalUrl, scriptUrl) => {
    expect(parseEmbedUrl(url)).toEqual({
      kind: 'script',
      provider,
      id: expect.any(String),
      canonicalUrl,
      scriptUrl,
    });
  });

  it.each([
    'https://x.com/jack"><script>/status/1',
    'https://evil.com/watch?v=x',
    'javascript:alert(1)',
    'https://youtube.com.evil.com/watch?v=x',
    'nope',
  ])('rejects %s', (url) => expect(parseEmbedUrl(url)).toBeNull());

  it('respects a narrower allow-list', () => {
    expect(parseEmbedUrl('https://vimeo.com/1', ['youtube'])).toBeNull();
  });
});

describe('text helpers', () => {
  const sample = doc([
    heading('a', 'Moja podróż do Włoch'),
    {
      id: 'p',
      type: 'paragraph',
      props: {},
      content: [{ text: 'Jeden ' }, { text: 'dwa', marks: [{ type: 'bold' }] }],
    },
    {
      id: 'q',
      type: 'quote',
      props: { author: 'Ktoś Mądry' },
      content: [{ text: 'trzy cztery' }],
    },
    {
      id: 's',
      type: 'section',
      props: {},
      children: [
        heading('b', 'Moja podróż do Włoch', { level: 3 }),
        heading('c', 'Własna', { level: 2, anchor: 'own' }),
      ],
    },
  ]);

  it('extracts plain text including registered text props', () => {
    expect(documentToPlainText(sample, { textProps: { quote: ['author'] } })).toBe(
      'Moja podróż do Włoch\nJeden dwa\nKtoś Mądry\ntrzy cztery\nMoja podróż do Włoch\nWłasna',
    );
  });

  it('computes reading time', () => {
    expect(readingTime(sample)).toEqual({ words: 13, minutes: 1 });
    expect(readingTime(sample, { textProps: { quote: ['author'] } }).words).toBe(15);
    expect(readingTime(doc([]))).toEqual({ words: 0, minutes: 0 });
  });

  it('slugifies Polish text', () => {
    expect(slugify('Zażółć gęślą jaźń! Łódź')).toBe('zazolc-gesla-jazn-lodz');
  });

  it('extracts headings with unique anchors', () => {
    expect(extractHeadings(sample)).toEqual([
      { blockId: 'a', level: 2, text: 'Moja podróż do Włoch', anchor: 'moja-podroz-do-wloch' },
      { blockId: 'b', level: 3, text: 'Moja podróż do Włoch', anchor: 'moja-podroz-do-wloch-2' },
      { blockId: 'c', level: 2, text: 'Własna', anchor: 'own' },
    ]);
    expect(extractHeadings(sample, { maxLevel: 2 }).map((h) => h.blockId)).toEqual(['a', 'c']);
  });
});

describe('validateDocument', () => {
  it('accepts a full valid document', () => {
    const input = doc([
      {
        id: 'h1',
        type: 'heading',
        props: { level: 2, align: { base: 'left', md: 'center' } },
        style: {
          margin: { top: { base: 's', lg: { custom: '4rem' } } },
          width: 'wide',
          background: { type: 'gradient', from: 'primary', to: 'accent', angle: 90 },
          hidden: { mobile: true },
          anchor: 'intro',
        },
        classes: { root: 'mt-12 md:mt-20', text: 'text-red-300 font-black' },
        content: [
          { text: 'Moja podróż do ' },
          { text: 'Włoch', marks: [{ type: 'bold' }, { type: 'color', color: 'primary' }] },
          {
            text: 'link',
            marks: [{ type: 'link', href: 'https://example.com', newTab: true, rel: 'noopener' }],
          },
        ],
      },
    ]);
    const result = validateDocument(input);
    expect(result.success).toBe(true);
  });

  it('reports readable paths', () => {
    const result = validateDocument({
      version: 1,
      blocks: [
        {
          id: 's',
          type: 'section',
          props: {},
          children: [
            {
              id: 'x',
              type: 'paragraph',
              props: {},
              content: [{ text: 'a', marks: [{ type: 'link', href: 'javascript:alert(1)' }] }],
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toContainEqual({
      path: 'blocks[0].children[0].content[0].marks[0].href',
      message: 'Unsafe or invalid URL',
    });
  });

  it.each([
    [{ style: { margin: { top: { custom: '10px; color: red' } } } }, 'blocks[0].style.margin.top'],
    [{ classes: { root: 'a" onclick="x' } }, 'blocks[0].classes.root'],
    [{ style: { background: { type: 'color', color: '#fff; x' } } }, 'blocks[0].style.background.color'],
    [{ html: '<b>raw</b>' }, 'blocks[0]'],
  ])('rejects unsafe or unknown data %#', (extra, path) => {
    const result = validateDocument(doc([{ id: 'a', type: 'paragraph', props: {}, ...extra } as Block]));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.some((e) => e.path.startsWith(path))).toBe(true);
  });

  it('detects duplicate ids', () => {
    const result = validateDocument(
      doc([heading('a', 'x'), { id: 's', type: 'section', props: {}, children: [heading('a', 'y')] }]),
    );
    expect(!result.success && result.errors[0]).toMatchObject({
      path: 'blocks[1].children[0].id',
      blockId: 'a',
    });
  });

  it('validates props with per-type schemas and warns on unknown types', () => {
    const blockProps = { heading: z.object({ level: z.union([z.literal(2), z.literal(3), z.literal(4)]) }) };
    const knownTypes = ['heading'];
    const bad = validateDocument(doc([heading('a', 'x', { level: 7 })]), { blockProps, knownTypes });
    expect(!bad.success && bad.errors[0]?.path).toBe('blocks[0].props.level');

    const unknown = validateDocument(doc([{ id: 'z', type: 'mystery', props: {} }]), {
      blockProps,
      knownTypes,
    });
    expect(unknown.success).toBe(true);
    expect(unknown.warnings[0]).toMatchObject({ path: 'blocks[0].type', blockId: 'z' });
  });
});

describe('migrations', () => {
  it('returns current documents unchanged', () => {
    const input = doc([heading('a', 'x')]);
    expect(migrate(input)).toEqual(input);
  });

  it('applies migrations in order without mutating input', () => {
    const input = { version: 1, items: [{ kind: 'p' }] };
    const result = migrate(input, {
      targetVersion: 3,
      migrations: [
        {
          from: 2,
          migrate: (d) => ({
            ...d,
            blocks: (d.blocks as unknown[]).map((b) => ({ ...(b as object), props: {} })),
          }),
        },
        {
          from: 1,
          migrate: ({ items, ...rest }) => ({
            ...rest,
            blocks: (items as { kind: string }[]).map((item, i) => ({ id: `b${i}`, type: item.kind })),
          }),
        },
      ],
    });
    expect(result).toEqual({ version: 3, blocks: [{ id: 'b0', type: 'p', props: {} }] });
    expect(input).toEqual({ version: 1, items: [{ kind: 'p' }] });
  });

  it('rejects missing, newer or unmigratable versions', () => {
    expect(() => migrate({ blocks: [] })).toThrow(MigrationError);
    expect(() => migrate({ version: 99, blocks: [] })).toThrow(/newer/);
    expect(() => migrate({ version: 1 }, { targetVersion: 2, migrations: [] })).toThrow(
      /No migration from version 1/,
    );
    expect(() => migrate(null)).toThrow(MigrationError);
  });

  it('parseDocument migrates and validates', () => {
    expect(parseDocument(doc([]))).toEqual(doc([]));
    expect(() => parseDocument({ version: 1, blocks: [{ id: '!', type: 'x', props: {} }] })).toThrow(
      /blocks\[0\]\.id/,
    );
    expect(safeParseDocument({ version: 5, blocks: [] })).toMatchObject({
      success: false,
      errors: [{ path: 'version' }],
    });
  });
});

describe('isSafeClassList', () => {
  it.each([
    'mt-12 md:mt-20',
    "content-['x']",
    'content-["→"] after:content-[\'a_b\']',
    'grid-cols-[1fr_2fr] bg-[#fff]',
    '[mask-type:luminance]',
    '!font-bold -mt-2 w-1/2 hover:[&>*]:underline',
  ])('accepts %s', (value) => expect(schemas.isSafeClassList(value)).toBe(true));

  it.each([
    'a" onclick="x',
    "content-'x'",
    "content-['x]",
    'w-[10px',
    'w-]10px[',
    'bg-[red;color:blue]',
    'x<script>',
    '[a{b}]',
    'a\\b',
  ])('rejects %s', (value) => expect(schemas.isSafeClassList(value)).toBe(false));
});

describe('createId', () => {
  it('creates unique valid ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId()));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]{12}$/);
  });
});
