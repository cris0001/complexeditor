import type { ComponentType, ReactNode } from 'react';
import type { z } from 'zod';
import type { Block, ContentDocument, LocalizedString } from '../schema/types';
import type { Theme } from './theme';
import type { ResponsiveRule } from './responsive-css';
import type { StyleAttributes } from './style';
import type { RendererMessageKey } from '../i18n/renderer-messages';

/** Palette groups in the editor's block picker. */
export type BlockCategory = 'text' | 'layout' | 'media' | 'embed' | 'interactive' | 'global';

/** Outline color group in the editor (spec §10). `none` = plain text, no outline. */
export type OutlineKind =
  'none' | 'section' | 'layout' | 'media' | 'embed' | 'interactive' | 'highlight' | 'global';

/** Attributes the renderer computes for a block's root element. Spread them onto the root. */
export interface RootAttributes {
  id?: string;
  className: string;
  /** Only `--ce-*` custom properties, never concrete CSS properties. */
  style?: Record<`--${string}`, string>;
  [dataAttribute: `data-${string}`]: string | undefined;
}

export interface ImageComponentProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  srcSet?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  className?: string;
  style?: Record<`--${string}`, string>;
  draggable?: boolean;
}

export interface LinkComponentProps {
  href: string;
  className?: string;
  /** Only `--ce-*` custom properties. */
  style?: Record<`--${string}`, string>;
  target?: string;
  rel?: string;
  children?: ReactNode;
}

/** Project-provided component overrides. */
export interface RendererComponents {
  /** Replace the default render component of any block type. Receives the default as `Default`. */
  blocks?: Record<string, ComponentType<BlockRenderProps & { Default: ComponentType<BlockRenderProps> }>>;
  /** Image element used by every block (e.g. a wrapper around `next/image`). */
  Image?: ComponentType<ImageComponentProps>;
  /** Link element used by inline links and buttons (e.g. `next/link`). */
  Link?: ComponentType<LinkComponentProps>;
}

/** A highlighted token run. `classes` are highlighter class names (e.g. `hljs-keyword`). */
export interface CodeToken {
  text: string;
  classes: string[];
}

/** Returns token runs for `code`, or `null` when the language is unknown (rendered as plain text). */
export type CodeHighlighter = (code: string, language: string | undefined) => CodeToken[] | null;

/** Extra classes per slot. */
export type SlotClasses = Record<string, string | undefined>;

export interface BlockClassNames {
  /** Classes per slot, or a function of the block's props. */
  slots?: SlotClasses | ((args: { props: Record<string, unknown>; block: Block }) => SlotClasses);
  /** Classes per style variant name (`style.variant`). */
  variants?: Record<string, SlotClasses>;
}

/** Project class configuration, shared by the renderer and the editor so the preview is 1:1. */
export type ClassNamesConfig = Record<string, BlockClassNames>;

/** Combines default `ce-*` classes with project classes. Plug in e.g. `tailwind-merge` here. */
export type MergeClasses = (defaults: string, project: string) => string;

export interface RenderContext {
  registry: Registry;
  theme?: Theme;
  classNames?: ClassNamesConfig;
  mergeClasses?: MergeClasses;
  components: Required<Pick<RendererComponents, 'Image' | 'Link'>> & Pick<RendererComponents, 'blocks'>;
  /** Anchor ids of headings, computed once per document. */
  headingAnchors: ReadonlyMap<string, string>;
  /** `render` on the public site, `editor` inside the editor canvas. */
  mode: 'render' | 'editor';
  /** Content language of the document (for `lang`-aware formatting). */
  locale?: string;
  /** Development mode: show fallbacks for unknown blocks. */
  dev: boolean;
  /** Translated renderer string (`{name}` placeholders are replaced from `values`). */
  t: (key: RendererMessageKey, values?: Record<string, string | number>) => string;
  /** Syntax highlighter for code blocks. */
  highlight: CodeHighlighter;
  /** Renders child blocks (the editor wraps them with selection and drop zones). */
  renderBlocks: (blocks: readonly Block[], parent: Block | null) => ReactNode;
  /** Renders inline content (the editor substitutes an editable field). */
  renderInline: (block: Block) => ReactNode;
  /** Renders a plain-text prop (the editor substitutes an editable field). */
  renderText: (block: Block, prop: string) => ReactNode;
  /** Depth of the block being rendered (0 = top level). */
  depth: number;
  /** Parent of the block being rendered (null at the top level). */
  parent: Block | null;
  /** Editor only: adds attributes (selection hooks, outline data) to each block's root. */
  decorateRoot?: (block: Block, def: BlockDefinition, root: RootAttributes, depth: number) => RootAttributes;
  /** Editor only: the device being previewed (art direction cannot use container queries). */
  previewDevice?: 'mobile' | 'tablet' | 'desktop';
}

export interface BlockRenderProps<P = Record<string, unknown>, S extends string = string> {
  block: Block<string, P>;
  /** Props merged with the definition's defaults. */
  props: P;
  /** Attributes for the root element. */
  root: RootAttributes;
  /** Class names for a slot (`ce-{type}__{slot}` + project classes + document classes). */
  slot: (name: Exclude<S, 'root'>, ...modifiers: (string | false | null | undefined)[]) => string;
  /** Rendered inline content of the block. */
  content: ReactNode;
  /** Rendered child blocks. */
  children: ReactNode;
  /** Rendered plain-text prop. */
  text: (prop: Extract<keyof P, string>) => ReactNode;
  ctx: RenderContext;
}

/** Declarative inspector field (rendered by the editor; see the editor docs for every field type). */
export interface InspectorField {
  type: string;
  /** Path inside `props` (dot notation), or `style.*` for common style settings. */
  name: string;
  label?: LocalizedString;
  /** Show on the "Advanced" tab instead of "Basic". */
  advanced?: boolean;
  responsive?: boolean;
  /** Show the field only when this returns true. */
  when?: (props: Record<string, unknown>) => boolean;
  [option: string]: unknown;
}

export interface BlockI18n {
  name: string;
  description?: string;
  /** Extra strings used by the block's inspector or editor UI. */
  [key: string]: string | undefined;
}

export interface ContainerRules {
  /** Counts toward the nesting depth limit (section, columns, grid…). */
  nests?: boolean;
  /** Allowed child types. Omit to allow any non-structural block. */
  allowedChildren?: readonly string[];
  /** Template for a new child created by the editor (e.g. a new column). */
  defaultChild?: () => Omit<Block, 'id'>;
  minChildren?: number;
  maxChildren?: number;
}

export interface BlockDefinition<
  TType extends string = string,
  TProps extends Record<string, unknown> = Record<string, unknown>,
  TSlots extends string = string,
> {
  type: TType;
  category: BlockCategory;
  outline?: OutlineKind;
  /** Name of a built-in editor icon or a component. */
  icon?: string | ComponentType<{ size?: number }>;
  /** Zod schema for `props`. */
  props: z.ZodType<TProps>;
  defaultProps: TProps;
  /** Named parts of the block. `root` is always present. */
  slots: readonly TSlots[];
  /** The block holds inline rich text in `content`. */
  content?: boolean;
  /** Plain-string props that hold visible text (for search, translation and inline editing). */
  textProps?: readonly Extract<keyof TProps, string>[];
  /** The block holds child blocks. */
  container?: ContainerRules;
  /** Structural part of a parent (column, list item…): hidden from the picker, only valid inside `parents`. */
  parents?: readonly string[];
  /** Root modifier classes (`ce-{type}--{modifier}`) computed from props. */
  modifiers?: (props: TProps) => (string | false | null | undefined)[];
  /** Extra root classes and custom properties computed from props (e.g. via `addResponsive`). */
  attributes?: (props: TProps, ctx: RenderContext, block: Block<string, TProps>) => StyleAttributes;
  /** Responsive CSS rules this block relies on (included in the generated stylesheet). */
  responsive?: readonly ResponsiveRule[];
  render: ComponentType<BlockRenderProps<TProps, TSlots>>;
  /** Initial block created by the editor (defaults to `{ props: defaultProps }`). */
  create?: () => Omit<Block<TType>, 'id'>;
  inspector?: readonly InspectorField[];
  i18n?: Record<string, BlockI18n>;
  /** Hide from the editor's block picker (structural or deprecated blocks). */
  hidden?: boolean;
  /** Search keywords for the picker and slash menu. */
  keywords?: readonly string[];
  /** Short description of the current settings for the editor label (e.g. "33/67"). */
  summary?: (props: TProps) => string | undefined;
}

/**
 * A definition with any props type. Definitions are invariant in their props, so heterogeneous
 * lists (registries) need `any` here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBlockDefinition = BlockDefinition<string, any, any>;

export interface Registry {
  get(type: string): BlockDefinition | undefined;
  has(type: string): boolean;
  all(): readonly BlockDefinition[];
  /** Options for `validateDocument` derived from the registered blocks. */
  validateOptions(): { blockProps: Record<string, z.ZodType>; knownTypes: string[] };
  textProps(): Record<string, readonly string[]>;
  /** Common style rules plus the responsive rules of every registered block. */
  responsiveRules(): ResponsiveRule[];
  maxNestingDepth: number;
}

export type { ContentDocument };
