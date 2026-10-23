import { useMemo } from 'react';
import type { ContentDocument } from '../../schema/types';
import type { BlockCategory, OutlineKind, RenderContext } from '../../core/types';
import { createRenderContext, renderBlock } from '../../renderer/render';
import { useEditor, useEditorState } from '../context';
import { EmptyZone } from './EmptyZone';
import { InlineField } from './InlineField';
import { TextField } from './TextField';

const CATEGORY_OUTLINE: Record<BlockCategory, OutlineKind> = {
  text: 'none',
  layout: 'layout',
  media: 'media',
  embed: 'embed',
  interactive: 'interactive',
  global: 'global',
};

/**
 * Render context for the canvas: the same block components as the public renderer, with editable
 * fields and data attributes on each block root (no wrapper elements, so the CSS stays 1:1).
 */
export function useEditorRenderContext(doc: ContentDocument): RenderContext {
  const { props, registry, blockName, globals } = useEditor();
  const device = useEditorState((s) => s.device);
  return useMemo(() => {
    const locale = props.contentLocale ?? props.translation?.current;
    // Global block content in the document's language (falls back to any available version).
    const globalContent: Record<string, ContentDocument['blocks']> = {};
    for (const [id, g] of Object.entries(globals)) {
      const blocks = (locale && g.blocks[locale]) ?? Object.values(g.blocks).find(Boolean);
      if (blocks) globalContent[id] = blocks;
    }
    const base = createRenderContext(doc, {
      registry,
      theme: props.theme,
      classNames: props.classNames,
      mergeClasses: props.mergeClasses,
      components: props.components,
      highlight: props.highlight,
      locale,
      globals: globalContent,
      dev: true,
    });
    // Static rendering (no editable fields, no islands) for global block content.
    const readonly: RenderContext = { ...base, mode: 'editor', previewDevice: device };
    const ctx: RenderContext = {
      ...base,
      mode: 'editor',
      previewDevice: device,
      readonly,
      decorateRoot: (block, def, root, depth) => {
        // Hidden-on-device blocks stay selectable in the editor (dimmed via CSS instead).
        const hidden = (['mobile', 'tablet', 'desktop'] as const).filter((d) => block.style?.hidden?.[d]);
        return {
          ...root,
          className: hidden.length
            ? root.className.replace(/\s?ce-hide-(mobile|tablet|desktop)/g, '')
            : root.className,
          'data-ce-id': block.id,
          'data-ce-outline': def.outline ?? CATEGORY_OUTLINE[def.category],
          'data-ce-hidden': hidden.length ? hidden.join(' ') : undefined,
          'data-ce-untranslated': block.untranslated ? '' : undefined,
          'data-ce-type-label': blockName(block.type),
          style: { ...root.style, '--ce-ed-depth': String(depth) },
        };
      },
      renderBlocks(blocks, parent) {
        if (!blocks.length && (parent === null || registry.get(parent.type)?.container)) {
          return <EmptyZone parentId={parent?.id ?? null} />;
        }
        return blocks.map((block) => renderBlock(block, this));
      },
      renderInline(block) {
        return <InlineField key={`inline-${block.id}`} block={block} ctx={this} />;
      },
      renderText(block, prop) {
        return <TextField key={`text-${block.id}-${prop}`} block={block} prop={prop} />;
      },
    };
    return ctx;
  }, [
    doc,
    device,
    registry,
    blockName,
    globals,
    props.theme,
    props.classNames,
    props.mergeClasses,
    props.components,
    props.highlight,
    props.contentLocale,
    props.translation,
  ]);
}
