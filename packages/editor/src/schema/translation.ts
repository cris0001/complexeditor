import type { Block, ContentDocument } from './types';

/** JSON with sorted object keys, so equal documents always serialize the same way. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** 64-bit FNV-1a as hex (two 32-bit halves). Fast, synchronous, good enough for change detection. */
export function hashString(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/**
 * Hash of a document version (ignores the `untranslated` markers). Store it with a translation
 * when it is made from this source; a different hash later means the translation is outdated.
 */
export function translationHash(doc: ContentDocument): string {
  const strip = (blocks: Block[]): Block[] =>
    blocks.map(({ untranslated: _u, children, ...rest }) => ({
      ...rest,
      ...(children ? { children: strip(children) } : {}),
    }));
  return hashString(stableStringify({ version: doc.version, blocks: strip(doc.blocks) }));
}

export interface CopyForTranslationOptions {
  /** Mark every block with text as `untranslated` (default true); the editor clears it on edit. */
  markUntranslated?: boolean;
  /** Text props per block type (`registry.textProps()`), so blocks with only plain-text props are marked too. */
  textProps?: Record<string, readonly string[]>;
}

/**
 * "Copy from PL": the same layout, settings and classes, ready for translating the texts.
 * Block ids are kept, which lets projects relate blocks across language versions.
 */
export function copyForTranslation(
  source: ContentDocument,
  options: CopyForTranslationOptions = {},
): ContentDocument {
  const mark = options.markUntranslated ?? true;
  const copy = (blocks: Block[]): Block[] =>
    blocks.map((block) => {
      const hasText =
        Boolean(block.content?.some((node) => node.text.trim())) ||
        (options.textProps?.[block.type] ?? []).some(
          (prop) => typeof block.props[prop] === 'string' && block.props[prop],
        );
      const next: Block = structuredClone({ ...block, children: undefined });
      delete next.children;
      if (mark && hasText) next.untranslated = true;
      else delete next.untranslated;
      if (block.children) next.children = copy(block.children);
      return next;
    });
  return { version: source.version, blocks: copy(source.blocks) };
}

/** Ids of blocks still marked as untranslated. */
export function untranslatedBlocks(doc: ContentDocument): string[] {
  const ids: string[] = [];
  const visit = (blocks: Block[]) =>
    blocks.forEach((b) => {
      if (b.untranslated) ids.push(b.id);
      if (b.children) visit(b.children);
    });
  visit(doc.blocks);
  return ids;
}
