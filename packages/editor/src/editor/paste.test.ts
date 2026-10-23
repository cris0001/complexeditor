// @vitest-environment jsdom
import { defaultRegistry } from '../blocks/index';
import { validateDocument } from '../schema/validate';
import { validateStructure, createRegistry } from '../core/registry';
import { heading, paragraph } from '../blocks/index';
import type { Block } from '../schema/types';
import { htmlToBlocks, isMultiBlock, textToBlocks } from './paste';
import { parseClipboardBlocks, serializeBlocks } from './clipboard';

const strip = (blocks: Block[]): unknown =>
  blocks.map(({ id: _id, children, ...rest }) => ({
    ...rest,
    ...(children ? { children: strip(children) } : {}),
  }));

function expectValid(blocks: Block[]) {
  const doc = { version: 1, blocks };
  const result = validateDocument(doc, defaultRegistry.validateOptions());
  expect(result.success ? [] : result.errors).toEqual([]);
  expect(validateStructure(defaultRegistry, doc)).toEqual([]);
}

describe('htmlToBlocks', () => {
  it('converts a typical web page fragment', () => {
    const blocks = htmlToBlocks(
      `<h1>Title</h1>
       <p>Hello <strong>bold</strong> and <a href="https://e.com" target="_blank">link</a>.<br>Next line</p>
       <script>alert(1)</script>
       <ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul>
       <ol><li>First</li></ol>
       <blockquote>Quote</blockquote>
       <pre><code class="language-ts">const a = 1;\n</code></pre>
       <hr>
       <figure><img src="https://img.example/a.jpg" alt="A" width="800" height="600"><figcaption>Cap</figcaption></figure>
       <table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>
       <p><a href="javascript:alert(1)">bad</a> <span style="color:red;font-family:Comic">plain</span></p>`,
      defaultRegistry,
    );
    expect(strip(blocks)).toEqual([
      { type: 'heading', props: { level: 2 }, content: [{ text: 'Title' }] },
      {
        type: 'paragraph',
        props: {},
        content: [
          { text: 'Hello ' },
          { text: 'bold', marks: [{ type: 'bold' }] },
          { text: ' and ' },
          { text: 'link', marks: [{ type: 'link', href: 'https://e.com', newTab: true }] },
          { text: '.\nNext line' },
        ],
      },
      {
        type: 'list',
        props: { style: 'bullet' },
        children: [
          { type: 'list-item', props: {}, content: [{ text: 'One' }] },
          {
            type: 'list-item',
            props: {},
            content: [{ text: 'Two' }],
            children: [{ type: 'list-item', props: {}, content: [{ text: 'Nested' }] }],
          },
        ],
      },
      {
        type: 'list',
        props: { style: 'number' },
        children: [{ type: 'list-item', props: {}, content: [{ text: 'First' }] }],
      },
      { type: 'quote', props: { variant: 'line' }, content: [{ text: 'Quote' }] },
      { type: 'code', props: { code: 'const a = 1;', language: 'ts', copyButton: true } },
      { type: 'separator', props: { variant: 'line', size: 'm' } },
      {
        type: 'image',
        props: {
          image: { src: 'https://img.example/a.jpg', alt: 'A', width: 800, height: 600 },
          aspect: 'original',
          captionPosition: 'below',
        },
        content: [{ text: 'Cap' }],
      },
      {
        type: 'table',
        props: { headerRow: true, mobile: 'scroll' },
        children: [
          {
            type: 'table-row',
            props: {},
            children: [
              { type: 'table-cell', props: {}, content: [{ text: 'A' }] },
              { type: 'table-cell', props: {}, content: [{ text: 'B' }] },
            ],
          },
          {
            type: 'table-row',
            props: {},
            children: [
              { type: 'table-cell', props: {}, content: [{ text: '1' }] },
              { type: 'table-cell', props: {}, content: [] },
            ],
          },
        ],
      },
      { type: 'paragraph', props: {}, content: [{ text: 'bad plain' }] },
    ]);
    expectValid(blocks);
  });

  it('handles Google Docs markup', () => {
    const blocks = htmlToBlocks(
      `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1">
        <p dir="ltr"><span style="font-weight:700;">Bold</span><span style="font-weight:400;"> normal </span><span style="font-style:italic;">it</span></p>
        <h2><span>Section</span></h2>
       </b>`,
      defaultRegistry,
    );
    expect(strip(blocks)).toEqual([
      {
        type: 'paragraph',
        props: {},
        content: [
          { text: 'Bold', marks: [{ type: 'bold' }] },
          { text: ' normal ' },
          { text: 'it', marks: [{ type: 'italic' }] },
        ],
      },
      { type: 'heading', props: { level: 2 }, content: [{ text: 'Section' }] },
    ]);
  });

  it('handles Word lists and Office tags', () => {
    const blocks = htmlToBlocks(
      `<p class="MsoNormal">Intro<o:p></o:p></p>
       <p class="MsoListParagraphCxSpFirst" style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">·<span>  </span></span>Apple</p>
       <p class="MsoListParagraphCxSpLast" style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">·</span>Pear</p>`,
      defaultRegistry,
    );
    expect(strip(blocks)).toEqual([
      { type: 'paragraph', props: {}, content: [{ text: 'Intro' }] },
      {
        type: 'list',
        props: { style: 'bullet' },
        children: [
          { type: 'list-item', props: {}, content: [{ text: 'Apple' }] },
          { type: 'list-item', props: {}, content: [{ text: 'Pear' }] },
        ],
      },
    ]);
  });

  it('falls back to paragraphs when a block type is not registered', () => {
    const registry = createRegistry([heading, paragraph]);
    expect(strip(htmlToBlocks('<blockquote>Q</blockquote><ul><li>x</li></ul>', registry))).toEqual([
      { type: 'paragraph', props: {}, content: [{ text: 'Q' }] },
      { type: 'paragraph', props: {}, content: [{ text: 'x' }] },
    ]);
  });

  it('splits plain text into paragraphs', () => {
    expect(strip(textToBlocks('One\nline\n\n\nTwo'))).toEqual([
      { type: 'paragraph', props: {}, content: [{ text: 'One\nline' }] },
      { type: 'paragraph', props: {}, content: [{ text: 'Two' }] },
    ]);
    expect(isMultiBlock(textToBlocks('a'))).toBe(false);
    expect(isMultiBlock(textToBlocks('a\n\nb'))).toBe(true);
  });
});

describe('block clipboard', () => {
  const blocks: Block[] = [
    { id: 'a', type: 'heading', props: { level: 2 }, content: [{ text: 'Zażółć <b>' }] },
    {
      id: 'l',
      type: 'list',
      props: { style: 'bullet' },
      children: [{ id: 'i', type: 'list-item', props: {}, content: [{ text: 'x' }] }],
    },
  ];

  it('round-trips through JSON and HTML', () => {
    const { json, html, text } = serializeBlocks(blocks, defaultRegistry);
    expect(text).toBe('Zażółć <b>\nx');
    expect(html).not.toContain('<b>');
    expect(parseClipboardBlocks({ json }, defaultRegistry)).toEqual(blocks);
    expect(parseClipboardBlocks({ html: `<meta charset="utf-8">${html}` }, defaultRegistry)).toEqual(blocks);
  });

  it('rejects foreign or invalid payloads', () => {
    expect(parseClipboardBlocks({ html: '<p>hi</p>' }, defaultRegistry)).toBeNull();
    expect(
      parseClipboardBlocks(
        { json: '{"complexeditor":1,"blocks":[{"id":"x","type":"paragraph","props":{},"html":"<b>"}]}' },
        defaultRegistry,
      ),
    ).toBeNull();
    expect(
      parseClipboardBlocks(
        { json: '{"complexeditor":1,"blocks":[{"id":"x","type":"column","props":{}}]}' },
        defaultRegistry,
      ),
    ).toBeNull();
  });
});
