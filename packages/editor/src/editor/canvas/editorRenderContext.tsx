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
  const { props, registry } = useEditor();
  const device = useEditorState((s) => s.device);
  return useMemo(() => {
    const base = createRenderContext(doc, {
      registry,
      theme: props.theme,
      classNames: props.classNames,
      mergeClasses: props.mergeClasses,
      components: props.components,
      highlight: props.highlight,
      locale: props.contentLocale ?? props.translation?.current,
      dev: true,
    });
    const ctx: RenderContext = {
      ...base,
      mode: 'editor',
      previewDevice: device,
      decorateRoot: (block, def, root, depth) => ({
        ...root,
        'data-ce-id': block.id,
        'data-ce-outline': def.outline ?? CATEGORY_OUTLINE[def.category],
        style: { ...root.style, '--ce-ed-depth': String(depth) },
      }),
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
    props.theme,
    props.classNames,
    props.mergeClasses,
    props.components,
    props.highlight,
    props.contentLocale,
    props.translation,
  ]);
}
