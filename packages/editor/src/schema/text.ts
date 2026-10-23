import type { Block, ContentDocument, InlineContent } from './types';

export function inlineToPlainText(content: InlineContent | undefined): string {
  return content ? content.map((node) => node.text).join('') : '';
}

export interface TextExtractionOptions {
  /**
   * Plain-string props that carry visible text, per block type (e.g. `{ quote: ['author'] }`).
   * The block registry provides this automatically; pass it when using the helper directly.
   */
  textProps?: Record<string, readonly string[]>;
}

/** Walks every block depth-first. Return `false` from the visitor to skip a block's children. */
export function walkBlocks(
  blocks: readonly Block[],
  visit: (block: Block, parents: readonly Block[]) => void | false,
  parents: readonly Block[] = [],
): void {
  for (const block of blocks) {
    if (visit(block, parents) === false) continue;
    if (block.children) walkBlocks(block.children, visit, [...parents, block]);
  }
}

/** Visible text of the document, one block per line. Useful for search indexes and excerpts. */
export function documentToPlainText(doc: ContentDocument, options: TextExtractionOptions = {}): string {
  const lines: string[] = [];
  walkBlocks(doc.blocks, (block) => {
    for (const key of options.textProps?.[block.type] ?? []) {
      const value = block.props[key];
      if (typeof value === 'string' && value.trim()) lines.push(value.trim());
    }
    const text = inlineToPlainText(block.content).trim();
    if (text) lines.push(text);
  });
  return lines.join('\n');
}

export function countWords(text: string): number {
  return text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

export interface ReadingTime {
  words: number;
  /** Rounded up, at least 1 for a non-empty document. */
  minutes: number;
}

export function readingTime(
  doc: ContentDocument,
  { wordsPerMinute = 200, ...options }: TextExtractionOptions & { wordsPerMinute?: number } = {},
): ReadingTime {
  const words = countWords(documentToPlainText(doc, options));
  return { words, minutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / wordsPerMinute)) };
}

// Combining marks left after NFKD normalization (U+0300–U+036F).
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

/** Lowercase text without diacritics (also Polish ł), for search and slugs. */
export function foldDiacritics(text: string): string {
  return text.normalize('NFKD').replace(COMBINING_MARKS, '').replace(/[łŁ]/g, 'l').toLowerCase();
}

/** Turns text into an anchor id: lowercase ASCII, diacritics removed. */
export function slugify(text: string): string {
  return foldDiacritics(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface HeadingEntry {
  blockId: string;
  level: number;
  text: string;
  /** Unique anchor id (explicit `props.anchor` or one derived from the text). */
  anchor: string;
}

/** Extracts headings for a table of contents. Anchors are de-duplicated with `-2`, `-3`… suffixes. */
export function extractHeadings(
  doc: ContentDocument,
  { maxLevel = 4 }: { maxLevel?: number } = {},
): HeadingEntry[] {
  const used = new Map<string, number>();
  const headings: HeadingEntry[] = [];
  walkBlocks(doc.blocks, (block) => {
    if (block.type !== 'heading') return;
    const level = typeof block.props.level === 'number' ? block.props.level : 2;
    const text = inlineToPlainText(block.content).trim();
    const explicit = typeof block.props.anchor === 'string' ? block.props.anchor : undefined;
    const base = explicit || block.style?.anchor || slugify(text) || 'section';
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    if (level <= maxLevel) {
      headings.push({ blockId: block.id, level, text, anchor: count === 0 ? base : `${base}-${count + 1}` });
    }
  });
  return headings;
}
