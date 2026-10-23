import { createId } from '../../schema/ids';
import type { EditorStore, UploadTask } from '../state/store';
import type { MediaCallbacks, MediaItem, MediaType } from '../types';

export const mediaTypeOf = (file: File): MediaType =>
  file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';

const DEFAULT_ACCEPT: Record<MediaType, string> = {
  image: 'image/*',
  video: 'video/*',
  file: '*/*',
};

/** Checks a file against `accept` (`image/*`, `.pdf`, `application/zip`…). */
export function accepts(file: File, accept: string): boolean {
  return accept.split(',').some((rule) => {
    const r = rule.trim().toLowerCase();
    if (!r || r === '*/*' || r === '*') return true;
    if (r.startsWith('.')) return file.name.toLowerCase().endsWith(r);
    if (r.endsWith('/*')) return file.type.toLowerCase().startsWith(r.slice(0, -1));
    return file.type.toLowerCase() === r;
  });
}

export interface Uploader {
  /** Uploads one file; resolves with the media item, or null when cancelled / rejected. */
  upload(file: File): Promise<MediaItem | null>;
  cancel(id: string): void;
  retry(id: string): void;
  dismiss(id: string): void;
  accept(type: MediaType): string;
}

/** Upload manager: progress, cancel (AbortSignal), errors with retry; state lives in the editor store. */
export function createUploader(
  store: EditorStore,
  getCallbacks: () => MediaCallbacks,
  getMessages: () => { tooLarge: string; wrongType: string },
): Uploader {
  const controllers = new Map<string, AbortController>();
  const retries = new Map<string, () => void>();

  const patch = (id: string, value: Partial<UploadTask>) =>
    store.set((s) => ({ uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...value } : u)) }));
  const remove = (id: string) => store.set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) }));
  const acceptFor = (type: MediaType) => getCallbacks().accept?.[type] ?? DEFAULT_ACCEPT[type];

  function run(id: string, file: File, resolve: (item: MediaItem | null) => void) {
    const controller = new AbortController();
    controllers.set(id, controller);
    patch(id, { status: 'uploading', progress: 0, error: undefined });
    getCallbacks().onUpload!(file, {
      signal: controller.signal,
      onProgress: (p) => patch(id, { progress: Math.max(0, Math.min(1, p)) }),
    })
      .then((item) => {
        controllers.delete(id);
        patch(id, { status: 'done', progress: 1 });
        setTimeout(() => remove(id), 1500);
        resolve(item);
      })
      .catch((error: unknown) => {
        controllers.delete(id);
        if (controller.signal.aborted) {
          remove(id);
          resolve(null);
          return;
        }
        patch(id, { status: 'error', error: error instanceof Error ? error.message : String(error) });
        retries.set(id, () => run(id, file, resolve));
      });
  }

  return {
    upload(file) {
      return new Promise((resolve) => {
        if (!getCallbacks().onUpload) return resolve(null);
        const id = createId();
        const type = mediaTypeOf(file);
        store.set((s) => ({
          uploads: [...s.uploads, { id, name: file.name, progress: 0, status: 'uploading' }],
        }));
        if (!accepts(file, acceptFor(type))) {
          patch(id, { status: 'error', error: getMessages().wrongType });
          return resolve(null);
        }
        const { maxUploadSize } = getCallbacks();
        if (maxUploadSize && file.size > maxUploadSize) {
          patch(id, { status: 'error', error: getMessages().tooLarge });
          return resolve(null);
        }
        run(id, file, resolve);
      });
    },
    cancel(id) {
      controllers.get(id)?.abort();
    },
    retry(id) {
      retries.get(id)?.();
    },
    dismiss(id) {
      controllers.get(id)?.abort();
      remove(id);
    },
    accept: acceptFor,
  };
}
