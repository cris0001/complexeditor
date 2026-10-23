import { createContext, useContext, useMemo, useRef } from 'react';
import type { ContentDocument } from '../schema/types';
import type { AnyBlockDefinition, Registry } from '../core/types';
import { format } from '../i18n/renderer-messages';
import type { EditorMessageKey, EditorMessages } from '../i18n/editor-messages';
import { useStoreSelector, type EditorState, type EditorStore } from './state/store';
import type { EditorPermissions, EditorProps } from './types';
import { createActions, type Actions } from './actions';
import { createUploader, type Uploader } from './media/uploads';

export interface EditorContextValue {
  store: EditorStore;
  actions: Actions;
  uploader: Uploader;
  registry: Registry;
  props: EditorProps;
  permissions: Required<Pick<EditorPermissions, 'advanced' | 'customClasses' | 'slotClasses' | 'structure'>> &
    EditorPermissions;
  messages: EditorMessages;
  t: (key: EditorMessageKey, values?: Record<string, string | number>) => string;
  /** Localized label from a `{ pl, en }` object, falling back to English or the first value. */
  label: (value: Partial<Record<string, string>> | string | undefined, fallback?: string) => string;
  /** Block definitions the current user may insert. */
  insertable: AnyBlockDefinition[];
  /** Name of a block type in the UI language. */
  blockName: (type: string) => string;
  locale: string;
}

const EditorContext = createContext<EditorContextValue | null>(null);
export const EditorContextProvider = EditorContext.Provider;

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('complexeditor: editor components must be used inside <Editor>');
  return ctx;
}

export function useEditorState<T>(selector: (state: EditorState) => T): T {
  return useStoreSelector(useEditor().store, selector);
}

export const useDocument = (): ContentDocument => useEditorState((s) => s.history.present);

export function createLabel(locale: string) {
  const lang = locale.toLowerCase().split('-')[0]!;
  return (value: Partial<Record<string, string>> | string | undefined, fallback = ''): string => {
    if (value === undefined) return fallback;
    if (typeof value === 'string') return value;
    return value[locale] ?? value[lang] ?? value.en ?? Object.values(value).find(Boolean) ?? fallback;
  };
}

export function useCreateContextValue(
  store: EditorStore,
  registry: Registry,
  props: EditorProps,
  messages: EditorMessages,
): EditorContextValue {
  const locale = props.locale ?? 'en';
  // The uploader outlives prop changes (running uploads keep their callbacks and retry state).
  const latest = useRef({ props, messages });
  latest.current = { props, messages };
  const uploader = useMemo(
    () =>
      createUploader(
        store,
        () => latest.current.props,
        () => ({
          tooLarge: latest.current.messages.fileTooLarge,
          wrongType: latest.current.messages.fileWrongType,
        }),
      ),
    [store],
  );
  return useMemo(() => {
    const label = createLabel(locale);
    const allowed = props.permissions?.blocks;
    const isAllowed = (type: string) =>
      !allowed ? true : typeof allowed === 'function' ? allowed(type) : allowed.includes(type);
    const lang = locale.toLowerCase().split('-')[0]!;
    return {
      store,
      actions: createActions(store, registry),
      uploader,
      registry,
      props,
      permissions: {
        advanced: true,
        customClasses: true,
        slotClasses: false,
        structure: true,
        ...props.permissions,
      },
      messages,
      t: (key, values) => format(messages[key], values),
      label,
      insertable: registry.all().filter((def) => !def.hidden && !def.parents && isAllowed(def.type)),
      blockName: (type) => {
        const i18n = registry.get(type)?.i18n;
        return i18n?.[locale]?.name ?? i18n?.[lang]?.name ?? i18n?.en?.name ?? type;
      },
      locale,
    };
  }, [store, registry, props, messages, locale, uploader]);
}

/** Whether `block` (or a child type) may be inserted by the current user. */
export function useCanInsert(): (type: string) => boolean {
  const { insertable, registry } = useEditor();
  return (type) => insertable.some((def) => def.type === type) || Boolean(registry.get(type)?.parents);
}
