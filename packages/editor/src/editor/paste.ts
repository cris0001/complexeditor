import { createId } from '../schema/ids';
import { sanitizeUrl } from '../schema/url';
import type { Block, InlineContent, Mark } from '../schema/types';
import type { Registry } from '../core/types';
import { normalizeInline } from './tiptap/convert';

const SKIP = new Set([
  'SCRIPT',
  'STYLE',
  'META',
  'LINK',
  'TITLE',
  'HEAD',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'NOSCRIPT',
  'TEMPLATE',
  'SVG',
  'BUTTON',
  'INPUT',
  'SELECT',
  'TEXTAREA',
]);
const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'PRE',
  'TABLE',
  'HR',
  'FIGURE',
  'SECTION',
  'ARTICLE',
  'HEADER',
  'FOOTER',
  'MAIN',
  'ASIDE',
  'IMG',
  'DL',
]);

const BLOCK_SELECTOR = [...BLOCK_TAGS]
  .filter((tag) => tag !== 'IMG')
  .join(',')
  .toLowerCase();

const block = (type: string, props: Record<string, unknown> = {}, extra: Partial<Block> = {}): Block => ({
  id: createId(),
  type,
  props,
  ...extra,
});

/** Marks implied by an inline element (tags and the inline styles Word / Google Docs use). */
function marksOf(el: HTMLElement, inherited: Mark[]): Mark[] {
  const marks = [...inherited];
  const add = (mark: Mark) => {
    if (!marks.some((m) => m.type === mark.type)) marks.push(mark);
  };
  const remove = (type: Mark['type']) => {
    const i = marks.findIndex((m) => m.type === type);
    if (i >= 0) marks.splice(i, 1);
  };
  const tag = el.tagName;
  const style = el.style;
  if (tag === 'STRONG' || tag === 'B') add({ type: 'bold' });
  if (tag === 'EM' || tag === 'I') add({ type: 'italic' });
  if (tag === 'U' || tag === 'INS') add({ type: 'underline' });
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') add({ type: 'strike' });
  if (tag === 'CODE' || tag === 'KBD' || tag === 'SAMP') add({ type: 'code' });
  if (tag === 'SUP') add({ type: 'superscript' });
  if (tag === 'SUB') add({ type: 'subscript' });
  if (tag === 'MARK') add({ type: 'highlight' });
  if (tag === 'A') {
    const href = sanitizeUrl(el.getAttribute('href'));
    if (href && !href.startsWith('#'))
      add({ type: 'link', href, ...(el.getAttribute('target') === '_blank' ? { newTab: true } : {}) });
  }
  // Inline styles (Google Docs wraps everything in <b style="font-weight:normal">).
  const weight = style.fontWeight;
  if (weight === 'normal' || weight === '400') remove('bold');
  else if (weight === 'bold' || Number(weight) >= 600) add({ type: 'bold' });
  if (style.fontStyle === 'italic') add({ type: 'italic' });
  else if (style.fontStyle === 'normal') remove('italic');
  const decoration = `${style.textDecoration} ${style.textDecorationLine}`;
  if (decoration.includes('underline')) add({ type: 'underline' });
  if (decoration.includes('line-through')) add({ type: 'strike' });
  if (style.verticalAlign === 'super') add({ type: 'superscript' });
  if (style.verticalAlign === 'sub') add({ type: 'subscript' });
  return marks;
}

/** Inline content of a node (blocks inside are flattened into line breaks). */
function inline(node: Node, marks: Mark[] = []): InlineContent {
  const out: InlineContent = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      // `\s` includes non-breaking spaces.
      const text = (child.textContent ?? '').replace(/\s+/g, ' ');
      if (text) out.push({ text, marks: marks.length ? marks : undefined });
      return;
    }
    if (!(child instanceof HTMLElement) || SKIP.has(child.tagName)) return;
    // Word list bullets ("·", "1.") live in spans marked mso-list:Ignore.
    if (/mso-list:\s*ignore/i.test(child.getAttribute('style') ?? '')) return;
    if (child.tagName === 'BR') {
      out.push({ text: '\n', marks: marks.length ? marks : undefined });
      return;
    }
    out.push(...inline(child, marksOf(child, marks)));
    if (BLOCK_TAGS.has(child.tagName) && child.nextSibling) out.push({ text: '\n' });
  });
  return out;
}

function trimInline(content: InlineContent): InlineContent {
  const result = normalizeInline(content);
  const first = result[0];
  if (first) first.text = first.text.replace(/^[ \n]+/, '');
  const last = result[result.length - 1];
  if (last) last.text = last.text.replace(/[ \n]+$/, '');
  return normalizeInline(result);
}

const hasText = (content: InlineContent) => content.some((n) => n.text.trim());

function listItems(list: HTMLElement): Block[] {
  const items: Block[] = [];
  list.childNodes.forEach((child) => {
    if (!(child instanceof HTMLElement) || child.tagName !== 'LI') return;
    const nested = Array.from(child.children).filter(
      (c) => c.tagName === 'UL' || c.tagName === 'OL',
    ) as HTMLElement[];
    const clone = child.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(':scope > ul, :scope > ol').forEach((n) => n.remove());
    const content = trimInline(inline(clone));
    const checkbox = child.querySelector<HTMLInputElement>(':scope > input[type="checkbox"]');
    items.push(
      block('list-item', checkbox ? { checked: checkbox.checked } : {}, {
        content,
        ...(nested.length ? { children: nested.flatMap(listItems) } : {}),
      }),
    );
  });
  return items;
}

function tableBlock(table: HTMLTableElement): Block | null {
  const rows = Array.from(table.rows).map((row) =>
    block(
      'table-row',
      {},
      {
        children: Array.from(row.cells).map((cell) =>
          block('table-cell', {}, { content: trimInline(inline(cell)) }),
        ),
      },
    ),
  );
  if (!rows.length) return null;
  // Make every row as wide as the widest one.
  const width = Math.max(...rows.map((r) => r.children!.length));
  for (const row of rows) {
    while (row.children!.length < width) row.children!.push(block('table-cell', {}, { content: [] }));
  }
  const headerRow =
    Boolean(table.tHead) || Array.from(table.rows[0]?.cells ?? []).every((c) => c.tagName === 'TH');
  return block('table', { headerRow, mobile: 'scroll' }, { children: rows });
}

function imageBlock(img: HTMLImageElement, caption?: InlineContent): Block | null {
  const src = sanitizeUrl(img.getAttribute('src'), { allowRelative: false });
  // data: and blob: images are not stored in documents (they would need an upload first).
  if (!src) return null;
  const width = Number(img.getAttribute('width')) || undefined;
  const height = Number(img.getAttribute('height')) || undefined;
  return block(
    'image',
    {
      image: {
        src,
        alt: img.getAttribute('alt') ?? '',
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      },
      aspect: 'original',
      captionPosition: 'below',
    },
    caption && hasText(caption) ? { content: caption } : {},
  );
}

/** Converts one DOM container into blocks. */
function convert(root: ParentNode, out: Block[]): void {
  let wordList: { block: Block; ordered: boolean } | null = null;
  const pending: Node[] = [];

  const flushInline = () => {
    if (!pending.length) return;
    const wrapper = document.createElement('div');
    pending.forEach((n) => wrapper.appendChild(n.cloneNode(true)));
    pending.length = 0;
    const content = trimInline(inline(wrapper));
    if (hasText(content)) out.push(block('paragraph', {}, { content }));
  };

  root.childNodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      if (node.nodeType === 3 && node.textContent?.trim()) pending.push(node);
      return;
    }
    if (SKIP.has(node.tagName)) return;
    if (!BLOCK_TAGS.has(node.tagName)) {
      // Inline wrappers around blocks (Google Docs wraps everything in <b>) are containers.
      if (node.querySelector(BLOCK_SELECTOR)) {
        flushInline();
        convert(node, out);
        return;
      }
      // Images inside inline wrappers still become image blocks.
      const img = node.tagName === 'IMG' ? (node as HTMLImageElement) : node.querySelector('img');
      if (img && !node.textContent?.trim()) {
        flushInline();
        const image = imageBlock(img);
        if (image) out.push(image);
        return;
      }
      pending.push(node);
      return;
    }
    flushInline();

    const className = node.getAttribute('class') ?? '';
    const isWordList = node.tagName === 'P' && /MsoListParagraph/i.test(className);
    if (!isWordList) wordList = null;

    switch (node.tagName) {
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6': {
        const content = trimInline(inline(node));
        const level = Math.min(4, Math.max(2, Number(node.tagName[1]) || 2));
        if (hasText(content)) out.push(block('heading', { level }, { content }));
        return;
      }
      case 'UL':
      case 'OL': {
        const items = listItems(node);
        if (!items.length) return;
        const checklist = node.querySelector('input[type="checkbox"]');
        out.push(
          block(
            'list',
            { style: checklist ? 'check' : node.tagName === 'OL' ? 'number' : 'bullet' },
            { children: items },
          ),
        );
        return;
      }
      case 'BLOCKQUOTE': {
        const content = trimInline(inline(node));
        if (hasText(content)) out.push(block('quote', { variant: 'line' }, { content }));
        return;
      }
      case 'PRE': {
        const code = node.textContent ?? '';
        const language = /language-([\w-]+)/.exec(node.querySelector('code')?.className ?? '')?.[1] ?? 'text';
        if (code.trim())
          out.push(block('code', { code: code.replace(/\n$/, ''), language, copyButton: true }));
        return;
      }
      case 'TABLE': {
        const table = tableBlock(node as HTMLTableElement);
        if (table) out.push(table);
        return;
      }
      case 'HR':
        out.push(block('separator', { variant: 'line', size: 'm' }));
        return;
      case 'IMG': {
        const image = imageBlock(node as HTMLImageElement);
        if (image) out.push(image);
        return;
      }
      case 'FIGURE': {
        const img = node.querySelector('img');
        const caption = node.querySelector('figcaption');
        if (img) {
          const image = imageBlock(img, caption ? trimInline(inline(caption)) : undefined);
          if (image) out.push(image);
          return;
        }
        convert(node, out);
        return;
      }
      case 'P': {
        const content = trimInline(inline(node));
        if (isWordList) {
          const ordered =
            /^\s*\d+[.)]/.test(node.textContent ?? '') && /mso-list/i.test(node.getAttribute('style') ?? '');
          if (!wordList) {
            wordList = {
              block: block('list', { style: ordered ? 'number' : 'bullet' }, { children: [] }),
              ordered,
            };
            out.push(wordList.block);
          }
          wordList.block.children!.push(block('list-item', {}, { content }));
          return;
        }
        const img = node.querySelector('img');
        if (img && !node.textContent?.trim()) {
          const image = imageBlock(img);
          if (image) out.push(image);
          return;
        }
        if (hasText(content)) out.push(block('paragraph', {}, { content }));
        return;
      }
      default:
        // Generic containers (div, section…): recurse.
        convert(node, out);
    }
  });
  flushInline();
}

/** Converts pasted HTML (Word, Google Docs, web pages) into blocks of types present in `registry`. */
export function htmlToBlocks(html: string, registry: Registry): Block[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Word's conditional comments and Office namespaces.
  doc.querySelectorAll('o\\:p, xml').forEach((n) => n.remove());
  const out: Block[] = [];
  convert(doc.body, out);
  return out.flatMap((b) => fallback(b, registry));
}

/** Plain text: blank lines separate paragraphs; single newlines become line breaks. */
export function textToBlocks(text: string): Block[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => block('paragraph', {}, { content: [{ text: part }] }));
}

/** Projects without some block types still get the text (as paragraphs). */
function fallback(b: Block, registry: Registry): Block[] {
  if (registry.has(b.type)) return [b];
  if (b.content?.length) return [block('paragraph', {}, { content: b.content })];
  return (b.children ?? []).flatMap((child) => fallback(child, registry));
}

/** Whether pasted HTML needs block conversion (more than one block, or a non-paragraph block). */
export function isMultiBlock(blocks: Block[]): boolean {
  return blocks.length > 1 || (blocks.length === 1 && blocks[0]!.type !== 'paragraph');
}
