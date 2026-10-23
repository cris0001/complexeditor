import { documentToPlainText } from '../schema/text';
import type { Block } from '../schema/types';
import { validateDocument } from '../schema/validate';
import type { Registry } from '../core/types';
import { validateStructure } from '../core/registry';

/** Custom clipboard type (works inside one browser tab family; HTML carries a copy for other cases). */
export const CLIPBOARD_MIME = 'application/x-complexeditor+json';
const HTML_ATTR = 'data-complexeditor';

interface Payload {
  complexeditor: 1;
  blocks: Block[];
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): string {
  const binary = atob(value);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function serializeBlocks(
  blocks: Block[],
  registry: Registry,
): { json: string; html: string; text: string } {
  const json = JSON.stringify({ complexeditor: 1, blocks } satisfies Payload);
  const text = documentToPlainText({ version: 1, blocks }, { textProps: registry.textProps() });
  const escaped = text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`).replace(/\n/g, '<br>');
  // Other editors get readable text; complexeditor reads the blocks from the attribute.
  const html = `<div ${HTML_ATTR}="${toBase64(json)}">${escaped}</div>`;
  return { json, html, text };
}

/** Blocks from clipboard data, validated against the schema and registry; null when not ours or invalid. */
export function parseClipboardBlocks(
  data: { json?: string; html?: string },
  registry: Registry,
): Block[] | null {
  let raw = data.json;
  if (!raw && data.html?.includes(HTML_ATTR)) {
    const match = new RegExp(`${HTML_ATTR}="([A-Za-z0-9+/=]+)"`).exec(data.html);
    if (match) {
      try {
        raw = fromBase64(match[1]!);
      } catch {
        return null;
      }
    }
  }
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as Partial<Payload>;
    if (payload.complexeditor !== 1 || !Array.isArray(payload.blocks)) return null;
    const doc = { version: 1, blocks: payload.blocks };
    const result = validateDocument(doc, registry.validateOptions());
    if (!result.success) return null;
    // Structural children (columns, list items…) are fine inside their parents; reject loose ones.
    if (validateStructure(registry, result.document).some((issue) => !issue.path.includes('.children')))
      return null;
    return result.document.blocks;
  } catch {
    return null;
  }
}

/** Writes blocks to the system clipboard (action bar "Copy" button). */
export async function copyBlocksToClipboard(blocks: Block[], registry: Registry): Promise<void> {
  const { html, text } = serializeBlocks(blocks, registry);
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
  } else {
    await navigator.clipboard?.writeText(text);
  }
}

/** Fills a copy/cut event with blocks (Ctrl+C on a selected block). */
export function writeBlocksToEvent(event: ClipboardEvent, blocks: Block[], registry: Registry): void {
  const { json, html, text } = serializeBlocks(blocks, registry);
  event.clipboardData?.setData(CLIPBOARD_MIME, json);
  event.clipboardData?.setData('text/html', html);
  event.clipboardData?.setData('text/plain', text);
  event.preventDefault();
}
