'use client';

import { useEffect, useMemo, useState } from 'react';
import { Editor, type MediaItem } from 'complexeditor/editor';
import { ContentRenderer } from 'complexeditor/renderer';
import type { ContentDocument } from 'complexeditor/schema';
import { SAMPLE_DOCS, SAMPLE_IMAGES } from '@/lib/sample-docs';

type Lang = 'pl' | 'en';
const STORAGE_KEY = 'complexeditor-playground';

function load(): Record<Lang, ContentDocument> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<Lang, ContentDocument>;
  } catch {
    // Private mode or corrupted data: start from the samples.
  }
  return structuredClone(SAMPLE_DOCS);
}

/** Uploads stay in the browser: object URLs with simulated progress. */
async function fakeUpload(
  file: File,
  ctx: { signal: AbortSignal; onProgress(p: number): void },
): Promise<MediaItem> {
  for (let i = 1; i <= 10; i++) {
    if (ctx.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise((resolve) => setTimeout(resolve, 80));
    ctx.onProgress(i / 10);
  }
  const url = URL.createObjectURL(file);
  const size = await new Promise<{ width?: number; height?: number }>((resolve) => {
    if (!file.type.startsWith('image/')) return resolve({});
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({});
    img.src = url;
  });
  return {
    id: crypto.randomUUID(),
    url,
    type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
    name: file.name,
    size: file.size,
    mime: file.type,
    ...size,
  };
}

export function Playground() {
  const [docs, setDocs] = useState<Record<Lang, ContentDocument> | null>(null);
  const [lang, setLang] = useState<Lang>('pl');
  const [uiLocale, setUiLocale] = useState<Lang>('pl');
  const [view, setView] = useState<'edit' | 'preview' | 'json'>('edit');
  const [media, setMedia] = useState<MediaItem[]>(SAMPLE_IMAGES);
  const [version, setVersion] = useState(0);

  useEffect(() => setDocs(load()), []);

  const save = (next: ContentDocument) => {
    setDocs((prev) => {
      const all = { ...prev!, [lang]: next };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch {
        // Quota exceeded or storage disabled: keep the in-memory copy.
      }
      return all;
    });
  };

  // The editor resets when `value` changes identity: only on language switch or reset.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => docs?.[lang], [lang, version, docs === null]);

  if (!docs || !value) return null;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-2 text-sm">
        <strong className="mr-2">complexeditor playground</strong>
        <div className="flex rounded-md border border-slate-200 p-0.5">
          {(['edit', 'preview', 'json'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded px-2 py-1 ${view === v ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              {v === 'edit' ? 'Editor' : v === 'preview' ? 'Preview' : 'JSON'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-slate-600">
          UI
          <select
            value={uiLocale}
            onChange={(e) => setUiLocale(e.target.value as Lang)}
            className="rounded border border-slate-200 px-1 py-0.5"
          >
            <option value="pl">PL</option>
            <option value="en">EN</option>
          </select>
        </label>
        <button
          type="button"
          className="ml-auto rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50"
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            setDocs(structuredClone(SAMPLE_DOCS));
            setVersion((x) => x + 1);
          }}
        >
          Reset
        </button>
      </header>
      <div className="min-h-0 flex-1">
        {view === 'edit' && (
          <Editor
            value={value}
            locale={uiLocale}
            contentLocale={lang}
            translation={{
              locales: ['pl', 'en'],
              current: lang,
              onSwitch: (next) => {
                setLang(next as Lang);
                setVersion((x) => x + 1);
              },
              source: lang === 'en' ? { locale: 'pl', document: docs.pl } : undefined,
            }}
            onSave={save}
            autosaveDelay={600}
            onUpload={async (file, ctx) => {
              const item = await fakeUpload(file, ctx);
              setMedia((list) => [item, ...list]);
              return item;
            }}
            onListMedia={async ({ query, type }) => ({
              items: media.filter((m) => (!type || m.type === type) && (!query || m.name?.includes(query))),
            })}
            onUpdateMedia={async (mediaId, patch) => {
              const next = media.map((m) => (m.id === mediaId ? { ...m, ...patch } : m));
              setMedia(next);
              return next.find((m) => m.id === mediaId)!;
            }}
            onDeleteMedia={async (mediaId) => setMedia((list) => list.filter((m) => m.id !== mediaId))}
          />
        )}
        {view === 'preview' && (
          <div className="h-full overflow-auto py-8">
            <ContentRenderer document={docs[lang]} locale={lang} />
          </div>
        )}
        {view === 'json' && (
          <pre className="h-full overflow-auto bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(docs[lang], null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
