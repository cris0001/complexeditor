import type { ComponentType, ReactNode } from 'react';
import { extractHeadings } from '../schema/text';
import type { Block, ContentDocument } from '../schema/types';
import { createSlotResolver } from '../core/classes';
import { styleToAttributes } from '../core/style';
import type {
  BlockDefinition,
  BlockRenderProps,
  ClassNamesConfig,
  ImageComponentProps,
  LinkComponentProps,
  MergeClasses,
  Registry,
  RenderContext,
  RendererComponents,
  RootAttributes,
} from '../core/types';
import type { Theme } from '../core/theme';
import { renderInlineContent } from './inline';

const DefaultImage = ({ draggable, ...props }: ImageComponentProps) => (
  <img {...props} alt={props.alt} draggable={draggable} decoding="async" />
);

const DefaultLink = ({ children, ...props }: LinkComponentProps) => <a {...props}>{children}</a>;

export interface RenderOptions {
  registry: Registry;
  theme?: Theme;
  classNames?: ClassNamesConfig;
  mergeClasses?: MergeClasses;
  components?: RendererComponents;
  locale?: string;
  /** Show visible fallbacks for unknown blocks. Defaults to `process.env.NODE_ENV !== 'production'`. */
  dev?: boolean;
}

const isDev = () => typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

const warned = new Set<string>();
function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[complexeditor] ${message}`);
}

/** Root attributes: `ce-block`, style classes, definition attributes and `--ce-*` custom properties. */
export function rootAttributes(
  def: BlockDefinition,
  block: Block,
  props: Record<string, unknown>,
  ctx: RenderContext,
  slot: ReturnType<typeof createSlotResolver>,
): RootAttributes {
  const style = styleToAttributes(block.style);
  const own = def.attributes?.(props, ctx, block);
  const vars = { ...style.vars, ...own?.vars };
  const modifiers = def.modifiers?.(props) ?? [];
  return {
    id: block.style?.anchor,
    className: slot('root', ['ce-block', ...style.classes, ...(own?.classes ?? [])], modifiers),
    style: Object.keys(vars).length ? vars : undefined,
  };
}

function UnknownBlock({ block, ctx }: { block: Block; ctx: RenderContext }) {
  if (!ctx.dev) return null;
  return (
    <div className="ce-block ce-unknown" role="note" data-ce-type={block.type}>
      Unknown block type “{block.type}”
    </div>
  );
}

/** Renders a single block with its definition (or the override from `components.blocks`). */
export function renderBlock(block: Block, ctx: RenderContext): ReactNode {
  const def = ctx.registry.get(block.type);
  if (!def) {
    if (ctx.dev) warnOnce(`Unknown block type "${block.type}" (id ${block.id})`);
    return <UnknownBlock key={block.id} block={block} ctx={ctx} />;
  }
  const props = { ...def.defaultProps, ...block.props };
  const slotFor = createSlotResolver(ctx, def, block, props);
  const childCtx: RenderContext = { ...ctx, depth: ctx.depth + 1 };
  const renderProps: BlockRenderProps = {
    block,
    props,
    root: rootAttributes(def, block, props, ctx, slotFor),
    slot: (name, ...modifiers) => slotFor(name, [], modifiers),
    content: def.content ? ctx.renderInline(block) : null,
    children: block.children?.length ? childCtx.renderBlocks(block.children, block) : null,
    text: (prop) => ctx.renderText(block, prop),
    ctx: childCtx,
  };
  const Render = def.render as ComponentType<BlockRenderProps>;
  const Override = ctx.components.blocks?.[block.type];
  if (Override) return <Override key={block.id} {...renderProps} Default={Render} />;
  return <Render key={block.id} {...renderProps} />;
}

export function createRenderContext(document: ContentDocument, options: RenderOptions): RenderContext {
  const anchors = new Map(
    extractHeadings(document, { maxLevel: 6 }).map((heading) => [heading.blockId, heading.anchor]),
  );
  const ctx: RenderContext = {
    registry: options.registry,
    theme: options.theme,
    classNames: options.classNames,
    mergeClasses: options.mergeClasses,
    components: {
      Image: options.components?.Image ?? DefaultImage,
      Link: options.components?.Link ?? DefaultLink,
      blocks: options.components?.blocks,
    },
    headingAnchors: anchors,
    mode: 'render',
    locale: options.locale,
    dev: options.dev ?? isDev(),
    depth: 0,
    renderBlocks(blocks, _parent) {
      return blocks.map((block) => renderBlock(block, this));
    },
    renderInline(block) {
      return renderInlineContent(block.content, this);
    },
    renderText(block, prop) {
      const value = block.props[prop];
      return typeof value === 'string' ? value : null;
    },
  };
  return ctx;
}
