import { useCallback, useEffect, useRef, useState } from 'react';
import { isSafeUrl, sanitizeUrl } from '../../schema/url';
import { formatBytes } from '../../blocks/shared';
import { useEditor } from '../context';
import { Dialog } from '../dialogs/Dialog';
import type { MediaItem, MediaType } from '../types';
import { UiIcon } from '../ui/icons';

interface Props {
  mediaType: MediaType;
  multiple: boolean;
  onSelect: (items: MediaItem[]) => void;
}

/**
 * Media library: grid with search and infinite scroll, single or multiple selection, alt text and
 * caption per content language, delete, upload (button or drop) and insert by link.
 */
export function MediaLibrary({ mediaType, multiple, onSelect }: Props) {
  const { t, props, store, uploader } = useEditor();
  const [tab, setTab] = useState<'library' | 'link'>(props.onListMedia ? 'library' : 'link');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const request = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const close = () => store.set({ dialog: null });
  const finish = (chosen: MediaItem[]) => {
    close();
    if (chosen.length) onSelect(chosen);
  };

  const load = useCallback(
    async (reset: boolean) => {
      if (!props.onListMedia) return;
      const id = ++request.current;
      setLoading(true);
      setError(false);
      try {
        const page = await props.onListMedia({
          query: query || undefined,
          cursor: reset ? undefined : cursor,
          type: mediaType,
        });
        if (id !== request.current) return;
        setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
        setCursor(page.nextCursor);
        setHasMore(Boolean(page.nextCursor));
      } catch {
        if (id === request.current) setError(true);
      } finally {
        if (id === request.current) setLoading(false);
      }
    },
    [props, query, cursor, mediaType],
  );

  // New search: debounce, then reload from the first page.
  useEffect(() => {
    const timer = setTimeout(() => void load(true), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mediaType]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !loading) void load(false);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, load]);

  const toggle = (item: MediaItem) => {
    if (!multiple) return finish([item]);
    setSelected((s) => (s.includes(item.id) ? s.filter((id) => id !== item.id) : [...s, item.id]));
  };

  const uploadFiles = async (files: File[]) => {
    const uploaded: MediaItem[] = [];
    await Promise.all(
      files.map(async (file) => {
        const item = await uploader.upload(file);
        if (item) uploaded.push(item);
      }),
    );
    if (!uploaded.length) return;
    setItems((prev) => [...uploaded, ...prev]);
    if (multiple) setSelected((s) => [...s, ...uploaded.map((u) => u.id)]);
    else finish([uploaded[0]!]);
  };

  const editingItem = items.find((i) => i.id === editing);

  return (
    <Dialog
      wide
      title={t('mediaLibrary')}
      onClose={close}
      footer={
        multiple && tab === 'library' ? (
          <>
            <button type="button" className="ce-ed-button" onClick={close}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="ce-ed-button ce-ed-button--primary"
              disabled={!selected.length}
              onClick={() => finish(selected.map((id) => items.find((i) => i.id === id)!).filter(Boolean))}
            >
              {t('insertSelected', { count: selected.length })}
            </button>
          </>
        ) : undefined
      }
    >
      <div className="ce-ed-tabs" role="tablist">
        {props.onListMedia && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'library'}
            className="ce-ed-tabs__tab"
            onClick={() => setTab('library')}
          >
            {t('media')}
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'link'}
          className="ce-ed-tabs__tab"
          onClick={() => setTab('link')}
        >
          {t('fromLink')}
        </button>
      </div>

      {tab === 'link' && (
        <form
          className="ce-ed-stack ce-ed-media-link"
          onSubmit={(event) => {
            event.preventDefault();
            const url = sanitizeUrl(link.trim());
            if (url) finish([{ id: '', url, type: mediaType, name: url.split('/').pop() }]);
          }}
        >
          {!props.onUpload && <p className="ce-ed-hint">{t('linkOnlyMode')}</p>}
          <input
            className="ce-ed-input"
            autoFocus
            inputMode="url"
            value={link}
            placeholder={t('linkPlaceholder')}
            aria-label={t('url')}
            aria-invalid={link.trim() !== '' && !isSafeUrl(link.trim())}
            onChange={(event) => setLink(event.target.value)}
          />
          <button
            type="submit"
            className="ce-ed-button ce-ed-button--primary"
            disabled={!isSafeUrl(link.trim())}
          >
            {t('insert')}
          </button>
        </form>
      )}

      {tab === 'library' && (
        <div
          className="ce-ed-library"
          data-drag-over={dragOver ? '' : undefined}
          onDragOver={(event) => {
            if (!props.onUpload || !event.dataTransfer.types.includes('Files')) return;
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            if (!props.onUpload) return;
            event.preventDefault();
            setDragOver(false);
            void uploadFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <div className="ce-ed-library__bar">
            <input
              className="ce-ed-input"
              type="search"
              value={query}
              placeholder={t('searchMedia')}
              aria-label={t('searchMedia')}
              onChange={(event) => setQuery(event.target.value)}
            />
            {props.onUpload && (
              <>
                <button
                  type="button"
                  className="ce-ed-button ce-ed-button--primary"
                  onClick={() => fileInput.current?.click()}
                >
                  <UiIcon name="upload" /> {t('upload')}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  multiple={multiple}
                  accept={uploader.accept(mediaType)}
                  onChange={(event) => {
                    void uploadFiles(Array.from(event.target.files ?? []));
                    event.target.value = '';
                  }}
                />
              </>
            )}
          </div>
          {dragOver && <div className="ce-ed-library__drop">{t('dropFiles')}</div>}
          {error && (
            <p className="ce-ed-error">
              {t('error')}{' '}
              <button type="button" className="ce-ed-button" onClick={() => void load(true)}>
                {t('retry')}
              </button>
            </p>
          )}
          {!loading && !error && items.length === 0 && <p className="ce-ed-muted">{t('noMedia')}</p>}
          <ul
            className="ce-ed-library__grid"
            role="listbox"
            aria-multiselectable={multiple}
            aria-label={t('mediaLibrary')}
          >
            {items.map((item) => (
              <li
                key={item.id}
                className="ce-ed-library__item"
                role="option"
                aria-selected={selected.includes(item.id)}
              >
                <button
                  type="button"
                  className="ce-ed-library__thumb"
                  onClick={() => toggle(item)}
                  title={item.name}
                >
                  {item.type === 'image' ? (
                    <img
                      src={sanitizeUrl(item.thumbnailUrl ?? item.url)}
                      alt={item.alt?.[props.contentLocale ?? 'en'] ?? ''}
                      loading="lazy"
                    />
                  ) : (
                    <span className="ce-ed-library__file">
                      <UiIcon name={item.type === 'video' ? 'video' : 'file'} size={28} />
                      {item.name}
                    </span>
                  )}
                  {selected.includes(item.id) && (
                    <span className="ce-ed-library__check">
                      <UiIcon name="check" size={14} />
                    </span>
                  )}
                </button>
                <div className="ce-ed-library__meta">
                  <span>
                    {item.width && item.height
                      ? t('dimensions', { width: item.width, height: item.height })
                      : item.size
                        ? formatBytes(item.size)
                        : ''}
                  </span>
                  {(props.onUpdateMedia || props.onDeleteMedia) && (
                    <button
                      type="button"
                      className="ce-ed-icon-button"
                      aria-label={t('mediaSettings')}
                      onClick={() => setEditing(item.id)}
                    >
                      <UiIcon name="settings" size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div ref={sentinel} className="ce-ed-library__sentinel">
            {loading && <UiIcon name="loading" className="ce-ed-spin" />}
            {!loading && hasMore && items.length > 0 && (
              <button type="button" className="ce-ed-button" onClick={() => void load(false)}>
                {t('loadMore')}
              </button>
            )}
          </div>
        </div>
      )}

      {editingItem && (
        <MediaDetails
          item={editingItem}
          onClose={() => setEditing(null)}
          onSaved={(updated) => setItems((list) => list.map((i) => (i.id === updated.id ? updated : i)))}
          onDeleted={() => {
            setItems((list) => list.filter((i) => i.id !== editingItem.id));
            setSelected((s) => s.filter((id) => id !== editingItem.id));
            setEditing(null);
          }}
        />
      )}
    </Dialog>
  );
}

/** Alt text and caption per content language, plus delete. */
function MediaDetails({
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  item: MediaItem;
  onClose: () => void;
  onSaved: (item: MediaItem) => void;
  onDeleted: () => void;
}) {
  const { t, props } = useEditor();
  const locales =
    props.translation?.locales ?? [props.contentLocale ?? 'pl', 'en'].filter((v, i, a) => a.indexOf(v) === i);
  const [alt, setAlt] = useState(item.alt ?? {});
  const [caption, setCaption] = useState(item.caption ?? {});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(false);

  return (
    <section className="ce-ed-media-details" aria-label={item.name ?? item.url}>
      <img src={sanitizeUrl(item.thumbnailUrl ?? item.url)} alt="" />
      <div className="ce-ed-stack">
        {locales.map((locale) => (
          <div key={locale} className="ce-ed-stack">
            <label className="ce-ed-field">
              <span className="ce-ed-field__label">
                {t('altText')} ({locale.toUpperCase()})
              </span>
              <input
                className="ce-ed-input"
                value={alt[locale] ?? ''}
                onChange={(e) => setAlt({ ...alt, [locale]: e.target.value })}
              />
            </label>
            <label className="ce-ed-field">
              <span className="ce-ed-field__label">
                {t('caption')} ({locale.toUpperCase()})
              </span>
              <input
                className="ce-ed-input"
                value={caption[locale] ?? ''}
                onChange={(e) => setCaption({ ...caption, [locale]: e.target.value })}
              />
            </label>
          </div>
        ))}
        {error && <p className="ce-ed-error">{t('error')}</p>}
        <div className="ce-ed-inline-controls">
          {props.onUpdateMedia && (
            <button
              type="button"
              className="ce-ed-button ce-ed-button--primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(false);
                try {
                  onSaved(await props.onUpdateMedia!(item.id, { alt, caption }));
                  onClose();
                } catch {
                  setError(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('save')}
            </button>
          )}
          <button type="button" className="ce-ed-button" onClick={onClose}>
            {t('cancel')}
          </button>
          {props.onDeleteMedia &&
            (confirmDelete ? (
              <>
                <span>{t('deleteMediaConfirm')}</span>
                <button
                  type="button"
                  className="ce-ed-button ce-ed-button--danger"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await props.onDeleteMedia!(item.id);
                      onDeleted();
                    } catch {
                      setError(true);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t('yes')}
                </button>
                <button type="button" className="ce-ed-button" onClick={() => setConfirmDelete(false)}>
                  {t('no')}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="ce-ed-button ce-ed-button--danger"
                onClick={() => setConfirmDelete(true)}
              >
                {t('deleteMedia')}
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}
