import { Mark, mergeAttributes, type AnyExtension } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Code from '@tiptap/extension-code';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import Strike from '@tiptap/extension-strike';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import { isSafeUrl } from '../../schema/url';
import type { MarkType } from '../../schema/types';

const TOKEN = /^[a-z][a-z0-9-]{0,63}$/i;

/** Palette color: same markup as the renderer (class + custom property, never an inline color). */
export const PaletteColor = Mark.create({
  name: 'paletteColor',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-ce-color'),
        renderHTML: (attrs) => {
          const color = typeof attrs.color === 'string' && TOKEN.test(attrs.color) ? attrs.color : null;
          return color ? { 'data-ce-color': color, style: `--ce-text-color: var(--ce-color-${color})` } : {};
        },
      },
    };
  },
  parseHTML: () => [{ tag: 'span[data-ce-color]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes({ class: 'ce-color' }, HTMLAttributes), 0],
});

/** Highlight with an optional palette color, rendered like the renderer's `<mark class="ce-mark">`. */
export const PaletteHighlight = Mark.create({
  name: 'highlight',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-ce-color'),
        renderHTML: (attrs) => {
          const color = typeof attrs.color === 'string' && TOKEN.test(attrs.color) ? attrs.color : null;
          return color ? { 'data-ce-color': color, style: `--ce-mark: var(--ce-color-${color})` } : {};
        },
      },
    };
  },
  parseHTML: () => [{ tag: 'mark' }],
  renderHTML: ({ HTMLAttributes }) => ['mark', mergeAttributes({ class: 'ce-mark' }, HTMLAttributes), 0],
});

/** Inline-only document: the editable element sits inside the block's own markup. */
const InlineDocument = Document.extend({ content: 'inline*' });

export interface InlineExtensionsOptions {
  /** Marks the editor may use (permissions); defaults to all. */
  marks?: readonly MarkType[];
}

/**
 * Tiptap extensions for inline editing. MIT-licensed extensions only. Mark order matches the
 * renderer's nesting order (outermost first), so the editor DOM equals the published markup.
 */
export function inlineExtensions({ marks }: InlineExtensionsOptions = {}): AnyExtension[] {
  const allowed = (type: MarkType) => !marks || marks.includes(type);
  const list: AnyExtension[] = [InlineDocument, Text, HardBreak.configure({ keepMarks: true })];
  if (allowed('link')) {
    list.push(
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        HTMLAttributes: { class: 'ce-link', target: null, rel: null },
        isAllowedUri: (url) => isSafeUrl(url),
        shouldAutoLink: (url) => isSafeUrl(url),
      }).extend({ inclusive: false }),
    );
  }
  if (allowed('color')) list.push(PaletteColor);
  if (allowed('highlight')) list.push(PaletteHighlight);
  if (allowed('bold')) list.push(Bold);
  if (allowed('italic')) list.push(Italic);
  if (allowed('underline')) list.push(Underline);
  if (allowed('strike')) list.push(Strike);
  if (allowed('superscript')) list.push(Superscript);
  if (allowed('subscript')) list.push(Subscript);
  if (allowed('code')) list.push(Code.configure({ HTMLAttributes: { class: 'ce-code-inline' } }));
  return list;
}
