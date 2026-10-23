import { useSyncExternalStore } from 'react';
import type { ContentDocument } from '../../schema/types';
import type { DragState } from '../dnd/useDrag';
import type { MediaItem, MediaType } from '../types';
import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  undo,
  type CommitOptions,
  type History,
} from './history';

export type Device = 'mobile' | 'tablet' | 'desktop';
export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface UploadTask {
  id: string;
  name: string;
  /** 0–1. */
  progress: number;
  status: 'uploading' | 'error' | 'done';
  error?: string;
}

/** Modal dialogs of the editor. */
export type EditorDialog =
  | { kind: 'saveStyle'; blockId: string }
  | { kind: 'saveGlobal'; blockId: string }
  | { kind: 'media'; mediaType: MediaType; multiple: boolean; onSelect: (items: MediaItem[]) => void }
  | { kind: 'template'; templateId: string; locale: string }
  | { kind: 'editGlobal'; globalId: string }
  | { kind: 'shortcuts' };

/** Where the block picker (slash menu) inserts: replace an empty paragraph, inside a container, or after a block. */
export type SlashTarget =
  | { kind: 'replace'; blockId: string }
  | { kind: 'inside'; parentId: string | null }
  | { kind: 'after'; blockId: string | null };

export interface EditorState {
  history: History;
  /** Selected block id. */
  selection: string | null;
  hovered: string | null;
  device: Device;
  showOutlines: boolean;
  leftTab: 'blocks' | 'structure';
  inspectorTab: 'basic' | 'advanced';
  saveStatus: SaveStatus;
  saveError?: string;
  /** Block whose text field has focus (keyboard shortcuts behave differently while typing). */
  editing: string | null;
  /** Slash menu anchored to a block. */
  slash: { target: SlashTarget; query: string } | null;
  /** Id of a block whose inline field should take focus after the next render. */
  focusRequest: { blockId: string; at: 'start' | 'end' | number } | null;
  /** Drag & drop in progress. */
  drag: DragState | null;
  dialog: EditorDialog | null;
  /** Files being uploaded (shown in the upload tray). */
  uploads: UploadTask[];
}

type Listener = () => void;

export interface EditorStore {
  getState(): EditorState;
  subscribe(listener: Listener): () => void;
  /** Shallow state update (not undoable). */
  set(patch: Partial<EditorState> | ((state: EditorState) => Partial<EditorState>)): void;
  /** Replaces the document as one undo step (or merges into the previous step with the same `group`). */
  change(
    update: (doc: ContentDocument) => ContentDocument,
    options?: CommitOptions & { select?: string | null },
  ): void;
  undo(): void;
  redo(): void;
  /** Resets document and history (e.g. when the host loads another post). */
  reset(doc: ContentDocument): void;
}

export function createEditorStore(doc: ContentDocument, initial: Partial<EditorState> = {}): EditorStore {
  let state: EditorState = {
    history: createHistory(doc),
    selection: null,
    hovered: null,
    device: 'desktop',
    showOutlines: true,
    leftTab: 'blocks',
    inspectorTab: 'basic',
    saveStatus: 'idle',
    editing: null,
    slash: null,
    focusRequest: null,
    drag: null,
    dialog: null,
    uploads: [],
    ...initial,
  };
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((listener) => listener());
  const setState = (next: EditorState) => {
    if (next === state) return;
    state = next;
    emit();
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(patch) {
      const value = typeof patch === 'function' ? patch(state) : patch;
      setState({ ...state, ...value });
    },
    change(update, { select, ...options } = {}) {
      const next = update(state.history.present);
      const history = commit(state.history, next, options);
      if (history === state.history && select === undefined) return;
      setState({
        ...state,
        history,
        saveStatus: history === state.history ? state.saveStatus : 'dirty',
        ...(select !== undefined ? { selection: select } : {}),
      });
    },
    undo() {
      if (canUndo(state.history)) setState({ ...state, history: undo(state.history), saveStatus: 'dirty' });
    },
    redo() {
      if (canRedo(state.history)) setState({ ...state, history: redo(state.history), saveStatus: 'dirty' });
    },
    reset(next) {
      setState({
        ...state,
        history: createHistory(next),
        selection: null,
        hovered: null,
        saveStatus: 'idle',
      });
    },
  };
}

/** Subscribes a component to a slice of the editor state. */
export function useStoreSelector<T>(store: EditorStore, selector: (state: EditorState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
