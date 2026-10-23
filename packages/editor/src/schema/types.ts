import type { Responsive } from './responsive';

export type Locale = string;

/** Text per content language, e.g. `{ pl: 'Kot', en: 'Cat' }`. Used for media metadata and shared assets. */
export type LocalizedString = Partial<Record<Locale, string>>;

/** Name of a color from the theme palette (never a raw CSS color). */
export type PaletteColor = string;

export type Mark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'code' }
  | { type: 'superscript' }
  | { type: 'subscript' }
  | { type: 'highlight'; color?: PaletteColor }
  | { type: 'color'; color: PaletteColor }
  | { type: 'link'; href: string; newTab?: boolean; rel?: string };

export type MarkType = Mark['type'];

/** A run of inline text. A `\n` inside `text` is a hard line break. */
export interface TextNode {
  text: string;
  marks?: Mark[];
}

export type InlineContent = TextNode[];

/** Spacing token from the theme scale, or a custom CSS length. */
export type SpaceToken = 'none' | 'xs' | 's' | 'm' | 'l' | 'xl';
export type SpaceValue = SpaceToken | { custom: string };

export interface BoxSpacing {
  top?: Responsive<SpaceValue>;
  bottom?: Responsive<SpaceValue>;
  left?: Responsive<SpaceValue>;
  right?: Responsive<SpaceValue>;
}

export type WidthValue = 'normal' | 'wide' | 'full' | { max: string };
export type AlignValue = 'left' | 'center' | 'right';
export type LevelToken = 'none' | 's' | 'm' | 'l';

export type Background =
  | { type: 'color'; color: PaletteColor }
  | { type: 'gradient'; from: PaletteColor; to: PaletteColor; angle?: number }
  | { type: 'image'; src: string; overlay?: number; focalPoint?: FocalPoint };

export interface FocalPoint {
  /** 0–1, from left. */
  x: number;
  /** 0–1, from top. */
  y: number;
}

export interface Animation {
  type: 'fade' | 'slide' | 'zoom';
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Delay in milliseconds. */
  delay?: number;
}

/** Common style settings shared by every block (the "Style" panel). */
export interface BlockStyle {
  margin?: BoxSpacing;
  padding?: BoxSpacing;
  width?: Responsive<WidthValue>;
  align?: Responsive<AlignValue>;
  background?: Background;
  radius?: LevelToken;
  border?: LevelToken;
  shadow?: LevelToken;
  animation?: Animation;
  hidden?: { mobile?: boolean; tablet?: boolean; desktop?: boolean };
  anchor?: string;
  className?: string;
  /** Name of a style variant defined in the theme. */
  variant?: string;
}

/** Extra classes per named slot of a block, e.g. `{ root: 'mt-12', text: 'font-black' }`. */
export type BlockClasses = Record<string, string>;

export interface Block<TType extends string = string, TProps = Record<string, unknown>> {
  id: string;
  type: TType;
  props: TProps;
  style?: BlockStyle;
  classes?: BlockClasses;
  content?: InlineContent;
  children?: Block[];
}

export interface ContentDocument {
  version: number;
  blocks: Block[];
}
