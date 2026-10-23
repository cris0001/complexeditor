import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type { ContentDocument } from '../schema/types';
import { createEmptyDocument } from '../schema/parse';
import { migrate, needsMigration } from '../schema/migrate';
import { defaultRegistry } from '../blocks/index';
import { cx } from '../core/classes';
import { getEditorMessages } from '../i18n/editor-messages';
import { EditorContextProvider, useCreateContextValue, type EditorContextValue } from './context';
import { Canvas } from './canvas/Canvas';
import { LeftPanel } from './panels/LeftPanel';
import { Toolbar } from './panels/Toolbar';
import { Inspector } from './inspector/Inspector';
import { SlashMenu } from './menus/SlashMenu';
import { EditorDialogs } from './dialogs/EditorDialogs';
import { UploadTray } from './media/UploadTray';
import { insertFiles } from './media/insertFiles';
import { createEditorStore } from './state/store';
import { findBlock, type DropTarget } from './state/operations';
import { parseClipboardBlocks, writeBlocksToEvent, CLIPBOARD_MIME } from './clipboard';
import { htmlToBlocks, textToBlocks } from './paste';
import { useStoreSelector } from './state/store';
import type { EditorProps } from './types';

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The block editor. Uncontrolled: it owns the document and reports changes through `onChange`
 * and `onSave` (debounced autosave). Passing a different `value` object resets it.
 */
export function Editor(props: EditorProps) {
  const registry = props.registry ?? defaultRegistry;
  const initial = useMemo(() => {
    const doc = props.value ?? createEmptyDocument();
    return needsMigration(doc) ? migrate(doc) : doc;
  }, [props.value]);
  const [store] = useState(() => createEditorStore(initial));
  const loaded = useRef(initial);
  if (loaded.current !== initial) {
    loaded.current = initial;
    store.reset(initial);
  }
  const messages = useMemo(
    () => getEditorMessages(props.locale, props.messages, props.dictionaries),
    [props.locale, props.messages, props.dictionaries],
  );
  const ctx = useCreateContextValue(store, registry, props, messages);

  useOnChange(ctx);
  const saveNow = useAutosave(ctx);
  useShortcuts(ctx, saveNow);
  const onDrop = useFileDrop(ctx);

  const device = useStoreSelector(store, (s) => s.device);

  return (
    <EditorContextProvider value={ctx}>
      <div
        className={cx('ce-editor', props.className)}
        data-device={device}
        onDragOver={onDrop.over}
        onDrop={onDrop.drop}
      >
        <Toolbar onSaveNow={saveNow} />
        <div className="ce-ed-layout">
          <LeftPanel />
          <main className="ce-ed-main" aria-label={messages.inspector}>
            <Canvas />
          </main>
          <Inspector />
        </div>
        <SlashMenu />
        <EditorDialogs />
        <UploadTray />
      </div>
    </EditorContextProvider>
  );
}

/** Calls `onChange` after every document change (not on load or reset). */
function useOnChange({ store, props }: EditorContextValue) {
  const onChange = useRef(props.onChange);
  onChange.current = props.onChange;
  useEffect(() => {
    let previous = store.getState().history.present;
    return store.subscribe(() => {
      const doc = store.getState().history.present;
      if (doc !== previous && store.getState().saveStatus !== 'idle') onChange.current?.(doc);
      previous = doc;
    });
  }, [store]);
}

/** Debounced `onSave` with status; returns "save now" for the manual button and Ctrl+S. */
function useAutosave({ store, props }: EditorContextValue): () => void {
  const latest = useRef(props);
  latest.current = props;
  const saving = useRef<Promise<void> | null>(null);

  const save = useCallback(async () => {
    const { onSave } = latest.current;
    if (!onSave) return;
    const doc: ContentDocument = store.getState().history.present;
    if (saving.current) await saving.current.catch(() => {});
    store.set({ saveStatus: 'saving', saveError: undefined });
    const run = Promise.resolve(onSave(doc));
    saving.current = run;
    try {
      await run;
      // Edits made while saving keep the status "dirty".
      if (store.getState().history.present === doc) store.set({ saveStatus: 'saved' });
      else store.set({ saveStatus: 'dirty' });
    } catch (error) {
      store.set({ saveStatus: 'error', saveError: error instanceof Error ? error.message : String(error) });
    } finally {
      saving.current = null;
    }
  }, [store]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let previous = store.getState().history.present;
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      if (state.history.present === previous) return;
      previous = state.history.present;
      const delay = latest.current.autosaveDelay ?? 1500;
      if (delay === false || state.saveStatus === 'idle') return;
      clearTimeout(timer);
      timer = setTimeout(() => void save(), delay);
    });
    // Warn before leaving with unsaved changes.
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const status = store.getState().saveStatus;
      if (latest.current.onSave && (status === 'dirty' || status === 'saving' || status === 'error'))
        event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      unsubscribe();
      clearTimeout(timer);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [store, save]);

  return useCallback(() => void save(), [save]);
}

/** Where pasted or dropped content goes: after the selected block (or at the end). */
function targetAfterSelection(ctx: EditorContextValue): DropTarget {
  const doc = ctx.store.getState().history.present;
  const id = ctx.store.getState().selection;
  const location = id ? findBlock(doc, id) : undefined;
  if (!location) return { parentId: null, index: doc.blocks.length };
  return { parentId: location.parent?.id ?? null, index: location.index + 1 };
}

function useShortcuts(ctx: EditorContextValue, saveNow: () => void) {
  const latest = useRef(ctx);
  latest.current = ctx;

  useEffect(() => {
    const inEditor = (target: EventTarget | null) =>
      Boolean((target as HTMLElement | null)?.closest?.('.ce-editor, .ce-editor-portal'));
    const isField = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return Boolean(
        el?.closest?.(
          'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]',
        ),
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const { store, actions } = latest.current;
      if (!inEditor(event.target) && !inEditor(document.activeElement)) return;
      const mod = isMac() ? event.metaKey : event.ctrlKey;
      const key = event.key.toLowerCase();
      const state = store.getState();

      // Document history works everywhere, including while typing (Tiptap has no own history here).
      if (
        mod &&
        key === 'z' &&
        !event.shiftKey &&
        !(event.target as HTMLElement).closest('input, textarea')
      ) {
        event.preventDefault();
        store.undo();
        return;
      }
      if (
        mod &&
        ((key === 'z' && event.shiftKey) || key === 'y') &&
        !(event.target as HTMLElement).closest('input, textarea')
      ) {
        event.preventDefault();
        store.redo();
        return;
      }
      if (mod && key === 's') {
        event.preventDefault();
        saveNow();
        return;
      }
      if (isField(event.target) || state.editing || state.slash || state.dialog) return;

      const id = state.selection;
      if (event.key === '?') {
        store.set({ dialog: { kind: 'shortcuts' } });
        event.preventDefault();
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        store.set({ slash: { target: { kind: 'after', blockId: id }, query: '' } });
        return;
      }
      if (!id) return;
      const location = findBlock(state.history.present, id);
      if (!location) return;
      if (event.key === 'Delete' || event.key === 'Backspace') actions.remove([id]);
      else if (mod && key === 'd') actions.duplicate(id);
      else if (event.altKey && event.key === 'ArrowUp') actions.move(id, -1);
      else if (event.altKey && event.key === 'ArrowDown') actions.move(id, 1);
      else if (event.key === 'Escape') {
        if (location.parent) actions.selectParent(id);
        else store.set({ selection: null });
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const siblings = location.parent?.children ?? state.history.present.blocks;
        const next = siblings[location.index + (event.key === 'ArrowDown' ? 1 : -1)];
        if (next) store.set({ selection: next.id });
      } else if (event.key === 'Enter') {
        const def = latest.current.registry.get(location.block.type);
        if (def?.content) store.set({ focusRequest: { blockId: id, at: 'end' } });
        else if (location.block.children?.[0]) store.set({ selection: location.block.children[0].id });
      } else return;
      event.preventDefault();
    };

    const blocksForCopy = () => {
      const { store } = latest.current;
      const state = store.getState();
      if (state.editing || !state.selection) return null;
      const found = findBlock(state.history.present, state.selection);
      if (!found || latest.current.registry.get(found.block.type)?.parents) return null;
      return found.block;
    };

    const onCopy = (event: ClipboardEvent) => {
      if (!inEditor(document.activeElement) || isField(document.activeElement)) return;
      const block = blocksForCopy();
      if (block) writeBlocksToEvent(event, [block], latest.current.registry);
    };
    const onCut = (event: ClipboardEvent) => {
      if (!inEditor(document.activeElement) || isField(document.activeElement)) return;
      const block = blocksForCopy();
      if (!block) return;
      writeBlocksToEvent(event, [block], latest.current.registry);
      latest.current.actions.remove([block.id]);
    };
    const onPaste = (event: ClipboardEvent) => {
      const current = latest.current;
      if (
        !inEditor(document.activeElement) ||
        isField(document.activeElement) ||
        current.store.getState().editing
      )
        return;
      const data = event.clipboardData;
      if (!data) return;
      const files = Array.from(data.files);
      if (files.length && current.props.onUpload) {
        event.preventDefault();
        insertFiles(current, files, targetAfterSelection(current));
        return;
      }
      const ours = parseClipboardBlocks(
        { json: data.getData(CLIPBOARD_MIME), html: data.getData('text/html') },
        current.registry,
      );
      const html = data.getData('text/html');
      const blocks =
        ours ?? (html ? htmlToBlocks(html, current.registry) : textToBlocks(data.getData('text/plain')));
      if (!blocks.length) return;
      event.preventDefault();
      current.actions.insertBlocksAt(blocks, targetAfterSelection(current));
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
    };
  }, [saveNow]);
}

/** Files dragged from the desktop onto the canvas. */
function useFileDrop(ctx: EditorContextValue) {
  return {
    over: (event: DragEvent) => {
      if (
        ctx.props.onUpload &&
        event.dataTransfer.types.includes('Files') &&
        (event.target as HTMLElement).closest('.ce-ed-canvas')
      ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }
    },
    drop: (event: DragEvent) => {
      if (!ctx.props.onUpload || !event.dataTransfer.files.length) return;
      if (!(event.target as HTMLElement).closest('.ce-ed-canvas')) return;
      event.preventDefault();
      const blockEl = (event.target as HTMLElement).closest<HTMLElement>('[data-ce-id]');
      const doc = ctx.store.getState().history.present;
      const location = blockEl ? findBlock(doc, blockEl.dataset.ceId!) : undefined;
      const target = location
        ? { parentId: location.parent?.id ?? null, index: location.index + 1 }
        : { parentId: null, index: doc.blocks.length };
      insertFiles(ctx, Array.from(event.dataTransfer.files), target);
    },
  };
}
