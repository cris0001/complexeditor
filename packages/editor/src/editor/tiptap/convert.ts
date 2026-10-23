import type { InlineContent, Mark, TextNode } from '../../schema/types';

/** Minimal ProseMirror JSON shapes used by the conversion (no Tiptap import needed here). */
export interface PMMark {
  type: string;
  attrs?: Record<string, unknown>;
}
export interface PMNode {
  type: string;
  text?: string;
  marks?: PMMark[];
  attrs?: Record<string, unknown>;
  content?: PMNode[];
}

/** Canonical mark order (also used for comparing mark sets). */
const MARK_ORDER: Mark['type'][] = [
  'link',
  'color',
  'highlight',
  'bold',
  'italic',
  'underline',
  'strike',
  'superscript',
  'subscript',
  'code',
];

function canonicalMark(mark: Mark): Mark {
  switch (mark.type) {
    case 'link': {
      const result: Mark = { type: 'link', href: mark.href };
      if (mark.newTab) result.newTab = true;
      if (mark.rel) result.rel = mark.rel;
      return result;
    }
    case 'highlight':
      return mark.color ? { type: 'highlight', color: mark.color } : { type: 'highlight' };
    case 'color':
      return { type: 'color', color: mark.color };
    default:
      return { type: mark.type };
  }
}

export function canonicalMarks(marks: readonly Mark[] | undefined): Mark[] | undefined {
  if (!marks?.length) return undefined;
  const byType = new Map<Mark['type'], Mark>();
  for (const mark of marks) byType.set(mark.type, canonicalMark(mark));
  return [...byType.values()].sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type));
}

const marksKey = (marks: readonly Mark[] | undefined) => JSON.stringify(marks ?? []);

/**
 * Canonical inline content: sorted, de-duplicated marks; adjacent runs with equal marks merged; no
 * empty runs. A line break carries the formatting of the text before it (its own formatting is
 * invisible), so `{bold "a"}{"\n"}` and `{bold "a\n"}` are the same content.
 */
export function normalizeInline(content: InlineContent | undefined): InlineContent {
  const out: TextNode[] = [];
  const push = (text: string, marks: Mark[] | undefined) => {
    const last = out[out.length - 1];
    if (last && marksKey(last.marks) === marksKey(marks)) last.text += text;
    else out.push(marks ? { text, marks } : { text });
  };
  for (const node of content ?? []) {
    if (!node.text) continue;
    const marks = canonicalMarks(node.marks);
    for (const part of node.text.split(/(\n)/)) {
      if (!part) continue;
      if (part === '\n' && out.length) push(part, out[out.length - 1]!.marks);
      else push(part, marks);
    }
  }
  return out;
}

function toPMMark(mark: Mark): PMMark {
  switch (mark.type) {
    case 'link':
      return {
        type: 'link',
        attrs: { href: mark.href, target: mark.newTab ? '_blank' : null, rel: mark.rel ?? null },
      };
    case 'highlight':
      return { type: 'highlight', attrs: { color: mark.color ?? null } };
    case 'color':
      return { type: 'paletteColor', attrs: { color: mark.color } };
    default:
      return { type: mark.type };
  }
}

function fromPMMark(mark: PMMark): Mark | undefined {
  const attrs = mark.attrs ?? {};
  switch (mark.type) {
    case 'link': {
      if (typeof attrs.href !== 'string') return undefined;
      const result: Mark = { type: 'link', href: attrs.href };
      if (attrs.target === '_blank') result.newTab = true;
      if (typeof attrs.rel === 'string' && attrs.rel) result.rel = attrs.rel;
      return result;
    }
    case 'highlight':
      return typeof attrs.color === 'string' && attrs.color
        ? { type: 'highlight', color: attrs.color }
        : { type: 'highlight' };
    case 'paletteColor':
      return typeof attrs.color === 'string' ? { type: 'color', color: attrs.color } : undefined;
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strike':
    case 'code':
    case 'superscript':
    case 'subscript':
      return { type: mark.type };
    default:
      // Marks outside our format are dropped (e.g. from pasted content).
      return undefined;
  }
}

/** Our inline content → ProseMirror document with a single paragraph. `\n` becomes a hard break. */
export function toProseMirror(content: InlineContent | undefined): PMNode {
  const nodes: PMNode[] = [];
  for (const node of normalizeInline(content)) {
    const marks = node.marks?.map(toPMMark);
    node.text.split('\n').forEach((part, i) => {
      if (i > 0) nodes.push({ type: 'hardBreak', ...(marks ? { marks } : {}) });
      if (part) nodes.push({ type: 'text', text: part, ...(marks ? { marks } : {}) });
    });
  }
  return { type: 'doc', content: [{ type: 'paragraph', ...(nodes.length ? { content: nodes } : {}) }] };
}

/** ProseMirror document → our inline content (canonical). Multiple paragraphs are joined with `\n`. */
export function fromProseMirror(doc: PMNode): InlineContent {
  const runs: TextNode[] = [];
  (doc.content ?? []).forEach((paragraph, p) => {
    if (p > 0) runs.push({ text: '\n', marks: runs[runs.length - 1]?.marks });
    for (const node of paragraph.content ?? []) {
      const marks = node.marks?.map(fromPMMark).filter((m): m is Mark => Boolean(m));
      if (node.type === 'text' && node.text) runs.push({ text: node.text, marks });
      // A hard break keeps the formatting of the text around it, so it merges back into the same run.
      else if (node.type === 'hardBreak')
        runs.push({ text: '\n', marks: marks?.length ? marks : runs[runs.length - 1]?.marks });
    }
  });
  return normalizeInline(runs);
}

/** Equality of two inline contents after normalization (used to skip no-op updates). */
export const sameInline = (a: InlineContent | undefined, b: InlineContent | undefined) =>
  JSON.stringify(normalizeInline(a)) === JSON.stringify(normalizeInline(b));
