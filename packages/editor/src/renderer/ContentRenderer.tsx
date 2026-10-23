import { migrate, needsMigration } from '../schema/migrate';
import type { ContentDocument } from '../schema/types';
import { defaultRegistry } from '../blocks/index';
import { cx } from '../core/classes';
import { createRenderContext, type RenderOptions } from './render';

export interface GeneratedCss {
  css: string;
  /** Stable hash of `css`, used to de-duplicate the `<style>` element. */
  hash: string;
}

export interface ContentRendererProps extends Partial<RenderOptions> {
  document: ContentDocument;
  className?: string;
  /** Per-document CSS (e.g. compiled Tailwind classes from live mode), hoisted by React 19. */
  generatedCss?: GeneratedCss;
}

/**
 * Renders a document to React elements. Works in React Server Components: no hooks, no context,
 * no editor code. Interactive blocks render static HTML plus small client islands.
 */
export function ContentRenderer({
  document,
  registry = defaultRegistry,
  className,
  generatedCss,
  ...options
}: ContentRendererProps) {
  const doc = needsMigration(document) ? migrate(document) : document;
  const ctx = createRenderContext(doc, { registry, ...options });
  return (
    <div className={cx('ce-document', className)} lang={options.locale}>
      {ctx.renderBlocks(doc.blocks, null)}
      {generatedCss?.css && (
        <style href={`ce-${generatedCss.hash}`} precedence="ce">
          {generatedCss.css}
        </style>
      )}
    </div>
  );
}
