import type { ReactNode } from 'react';
import type { Block, ContentDocument, LocalizedString, MarkType } from '../schema/types';
import type {
  ClassNamesConfig,
  CodeHighlighter,
  MergeClasses,
  Registry,
  RendererComponents,
} from '../core/types';
import type { Theme } from '../core/theme';
import type { EditorMessages } from '../i18n/editor-messages';

// ---------------------------------------------------------------------------------------------
// Media (the library never stores files itself; the project provides these callbacks)
// ---------------------------------------------------------------------------------------------

export type MediaType = 'image' | 'video' | 'file';

export interface MediaItem {
  id: string;
  url: string;
  type: MediaType;
  name?: string;
  mime?: string;
  /** Bytes. */
  size?: number;
  width?: number;
  height?: number;
  /** Responsive variants (`srcset`) produced by the project, if any. */
  srcSet?: string;
  /** Small preview for the media library grid. */
  thumbnailUrl?: string;
  /** Alternative text per content language. */
  alt?: LocalizedString;
  caption?: LocalizedString;
  createdAt?: string;
}

export interface UploadContext {
  /** Aborted when the editor cancels the upload. */
  signal: AbortSignal;
  /** Report progress from 0 to 1. */
  onProgress(progress: number): void;
}

export interface MediaQuery {
  query?: string;
  cursor?: string;
  type?: MediaType;
}

export interface MediaPage {
  items: MediaItem[];
  nextCursor?: string;
}

export interface MediaCallbacks {
  /** Without it the editor works in link-only mode. */
  onUpload?: (file: File, ctx: UploadContext) => Promise<MediaItem>;
  onListMedia?: (query: MediaQuery) => Promise<MediaPage>;
  onDeleteMedia?: (id: string) => Promise<void>;
  onUpdateMedia?: (
    id: string,
    patch: Partial<Pick<MediaItem, 'alt' | 'caption' | 'name'>>,
  ) => Promise<MediaItem>;
  /** Accepted file types for uploads (input `accept`). */
  accept?: Partial<Record<MediaType, string>>;
  /** Max upload size in bytes (checked before calling `onUpload`). */
  maxUploadSize?: number;
}

// ---------------------------------------------------------------------------------------------
// Reuse: saved styles, global blocks, templates
// ---------------------------------------------------------------------------------------------

/** A named preset of a block's settings (props except text, style and classes). */
export interface SavedStyle {
  id: string;
  name: string;
  blockType: string;
  props?: Record<string, unknown>;
  style?: Block['style'];
  classes?: Block['classes'];
}

/** Reusable block maintained in one place. Documents reference it with a `global` block. */
export interface GlobalBlock {
  id: string;
  name: string;
  /** Content per content language. */
  blocks: Partial<Record<string, Block[]>>;
  updatedAt?: string;
}

export interface Template {
  id: string;
  name: LocalizedString;
  description?: LocalizedString;
  /** Document per content language (falls back to any available language). */
  documents: Partial<Record<string, ContentDocument>>;
  thumbnailUrl?: string;
}

export interface ReuseCallbacks {
  savedStyles?: SavedStyle[];
  onSaveStyle?: (style: Omit<SavedStyle, 'id'>) => Promise<SavedStyle>;
  onDeleteStyle?: (id: string) => Promise<void>;
  globalBlocks?: GlobalBlock[];
  /** Loads one global block (used when a document references a block not in `globalBlocks`). */
  onLoadGlobalBlock?: (id: string) => Promise<GlobalBlock | undefined>;
  onSaveGlobalBlock?: (block: Omit<GlobalBlock, 'id'> & { id?: string }) => Promise<GlobalBlock>;
  templates?: Template[];
}

// ---------------------------------------------------------------------------------------------
// Translation (content language)
// ---------------------------------------------------------------------------------------------

export interface TranslationConfig {
  /** Languages the project publishes in, e.g. `['pl', 'en']`. */
  locales: string[];
  /** Language of the document being edited. */
  current: string;
  /** Switch to the other language version (the host loads that document). */
  onSwitch?: (locale: string) => void;
  /** Source document for "Copy from …" (usually the default language version). */
  source?: { locale: string; document: ContentDocument; hash?: string };
  /** Hash of the source when this translation was last synced (for the outdated warning). */
  translatedFromHash?: string;
}

// ---------------------------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------------------------

export interface EditorPermissions {
  /** Allowed block types (default: all registered). */
  blocks?: readonly string[] | ((type: string) => boolean);
  /** Show the "Advanced" inspector tab (default true). */
  advanced?: boolean;
  /** Return false to hide an inspector field (`name` as in the definition, e.g. `style.margin`). */
  fields?: (blockType: string, field: string) => boolean;
  /** "Custom CSS class" field: `false` hides it, an array restricts it to those classes. Default true. */
  customClasses?: boolean | readonly string[];
  /** Per-slot class fields in the Advanced tab (default false; Tailwind live mode needs it). */
  slotClasses?: boolean;
  /** Inline formatting the editor may use (default all). */
  marks?: readonly MarkType[];
  /** Delete / structure changes (default true). */
  structure?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Editor props
// ---------------------------------------------------------------------------------------------

export interface EditorProps extends MediaCallbacks, ReuseCallbacks {
  /** Initial document. Passing a different object later (e.g. another post) resets the editor. */
  value?: ContentDocument;
  /** Called on every change (already validated by the editor's operations). */
  onChange?: (doc: ContentDocument) => void;
  /** Autosave target; called after `autosaveDelay` ms without changes. */
  onSave?: (doc: ContentDocument) => Promise<void> | void;
  /** Debounce for `onSave` in ms (default 1500). `false` disables autosave (manual save button). */
  autosaveDelay?: number | false;

  registry?: Registry;
  theme?: Theme;
  classNames?: ClassNamesConfig;
  mergeClasses?: MergeClasses;
  components?: RendererComponents;
  highlight?: CodeHighlighter;

  /** Editor UI language (default `en`). */
  locale?: string;
  /** Override single UI strings. */
  messages?: Partial<EditorMessages>;
  /** Extra UI languages. */
  dictionaries?: Record<string, Partial<EditorMessages>>;

  /** Content language (renderer strings, number formatting, alt texts of media). */
  contentLocale?: string;
  translation?: TranslationConfig;

  permissions?: EditorPermissions;

  /** Tailwind live mode (see `complexeditor/tailwind`). */
  tailwind?: TailwindEditorOptions;

  className?: string;
  /** Extra content for the top toolbar (e.g. a "Publish" button). */
  toolbar?: ReactNode;
}

/** Options for Tailwind live mode, provided by `complexeditor/tailwind`. */
export interface TailwindEditorOptions {
  /** Compiles a set of classes to CSS in the browser. */
  compile: (classes: string[]) => Promise<string>;
  /** Class names for autocomplete. */
  suggestions?: () => Promise<string[]>;
  /** Validates a single class; returns an error message key or null. */
  validate?: (className: string) => 'arbitraryNotAllowed' | 'unknownClass' | null;
  /** Reason the mode is unavailable (e.g. Tailwind v3). */
  unavailable?: string;
}
