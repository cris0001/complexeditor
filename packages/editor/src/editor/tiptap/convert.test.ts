import type { InlineContent, Mark } from '../../schema/types';
import { fromProseMirror, normalizeInline, sameInline, toProseMirror } from './convert';

const ALL_MARKS: Mark[] = [
  { type: 'bold' },
  { type: 'italic' },
  { type: 'underline' },
  { type: 'strike' },
  { type: 'code' },
  { type: 'superscript' },
  { type: 'subscript' },
  { type: 'highlight' },
  { type: 'highlight', color: 'accent' },
  { type: 'color', color: 'primary' },
  { type: 'link', href: 'https://e.com' },
  { type: 'link', href: '/x', newTab: true, rel: 'nofollow' },
];

const roundTrip = (content: InlineContent) => fromProseMirror(toProseMirror(content));

describe('Tiptap conversion', () => {
  it('converts to a single paragraph with marks and hard breaks', () => {
    expect(
      toProseMirror([
        { text: 'Hi ' },
        {
          text: 'there\nfriend',
          marks: [{ type: 'bold' }, { type: 'link', href: 'https://e.com', newTab: true }],
        },
      ]),
    ).toEqual({
      type: 'doc',
      content: [
        { type: 'text', text: 'Hi ' },
        {
          type: 'text',
          text: 'there',
          marks: [
            { type: 'link', attrs: { href: 'https://e.com', target: '_blank', rel: null } },
            { type: 'bold' },
          ],
        },
        {
          type: 'hardBreak',
          marks: [
            { type: 'link', attrs: { href: 'https://e.com', target: '_blank', rel: null } },
            { type: 'bold' },
          ],
        },
        {
          type: 'text',
          text: 'friend',
          marks: [
            { type: 'link', attrs: { href: 'https://e.com', target: '_blank', rel: null } },
            { type: 'bold' },
          ],
        },
      ],
    });
    expect(toProseMirror([])).toEqual({ type: 'doc' });
  });

  it.each(ALL_MARKS.map((mark) => [mark.type, mark] as const))('round-trips the %s mark', (_type, mark) => {
    const content: InlineContent = [{ text: 'a ' }, { text: 'marked', marks: [mark] }, { text: ' z' }];
    expect(roundTrip(content)).toEqual(normalizeInline(content));
  });

  it('round-trips every combination of two marks, line breaks and adjacent runs', () => {
    for (const a of ALL_MARKS) {
      for (const b of ALL_MARKS) {
        if (a.type === b.type) continue;
        const content: InlineContent = [
          { text: 'start\n', marks: [a] },
          { text: 'both', marks: [b, a] },
          { text: '\nend', marks: [b] },
          { text: '\n' },
        ];
        expect(roundTrip(content)).toEqual(normalizeInline(content));
      }
    }
  });

  it('normalizes: merges runs, orders marks, drops empty text and duplicates', () => {
    expect(
      normalizeInline([
        { text: 'a', marks: [{ type: 'italic' }, { type: 'bold' }] },
        { text: 'b', marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'bold' }] },
        { text: '' },
        { text: 'c', marks: [] },
      ]),
    ).toEqual([{ text: 'ab', marks: [{ type: 'bold' }, { type: 'italic' }] }, { text: 'c' }]);
  });

  it('drops marks outside the format and joins pasted paragraphs', () => {
    expect(
      fromProseMirror({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'one', marks: [{ type: 'fontFamily' }, { type: 'bold' }] }],
          },
          { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
        ],
      }),
    ).toEqual([{ text: 'one\n', marks: [{ type: 'bold' }] }, { text: 'two' }]);
  });

  it('compares inline content structurally', () => {
    expect(sameInline([{ text: 'a' }, { text: 'b' }], [{ text: 'ab' }])).toBe(true);
    expect(sameInline([{ text: 'a', marks: [{ type: 'bold' }] }], [{ text: 'a' }])).toBe(false);
  });
});
