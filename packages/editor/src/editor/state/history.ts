import type { ContentDocument } from '../../schema/types';

export interface History {
  past: ContentDocument[];
  present: ContentDocument;
  future: ContentDocument[];
  /** Key and time of the last change, used to merge consecutive edits (typing) into one step. */
  lastGroup?: { key: string; at: number };
}

export interface CommitOptions {
  /** Changes with the same key within `mergeWindow` ms become one undo step. */
  group?: string;
  now?: number;
}

export const HISTORY_LIMIT = 200;
const MERGE_WINDOW = 1000;

export const createHistory = (doc: ContentDocument): History => ({ past: [], present: doc, future: [] });

export function commit(
  history: History,
  doc: ContentDocument,
  { group, now = Date.now() }: CommitOptions = {},
): History {
  if (doc === history.present) return history;
  const merge =
    group !== undefined && history.lastGroup?.key === group && now - history.lastGroup.at < MERGE_WINDOW;
  return {
    past: merge ? history.past : [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: doc,
    future: [],
    lastGroup: group === undefined ? undefined : { key: group, at: now },
  };
}

export function undo(history: History): History {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
}

export function redo(history: History): History {
  const [next, ...future] = history.future;
  if (!next) return history;
  return { past: [...history.past, history.present], present: next, future };
}

export const canUndo = (history: History) => history.past.length > 0;
export const canRedo = (history: History) => history.future.length > 0;
