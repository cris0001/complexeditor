export {
  editorMessages,
  getEditorMessages,
  type EditorMessageKey,
  type EditorMessages,
} from './editor-messages';
export {
  rendererMessages,
  getRendererMessages,
  format,
  type RendererMessageKey,
  type RendererMessages,
} from './renderer-messages';

/** UI languages shipped with the library. */
export type Locale = 'pl' | 'en';
export const LOCALES: readonly Locale[] = ['pl', 'en'];
