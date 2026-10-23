import type { Editor } from '@tiptap/core';
import { useEffect, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { sanitizeUrl } from '../../schema/url';
import type { MarkType } from '../../schema/types';
import { defaultTheme } from '../../core/theme';
import type { EditorMessageKey } from '../../i18n/editor-messages';
import { useEditor } from '../context';
import { UiIcon } from '../ui/icons';

const BUTTONS: {
  mark: MarkType;
  tiptap: string;
  label: EditorMessageKey;
  icon: string;
  shortcut?: string;
}[] = [
  { mark: 'bold', tiptap: 'bold', label: 'bold', icon: 'bold', shortcut: 'Ctrl+B' },
  { mark: 'italic', tiptap: 'italic', label: 'italic', icon: 'italic', shortcut: 'Ctrl+I' },
  { mark: 'underline', tiptap: 'underline', label: 'underline', icon: 'underline', shortcut: 'Ctrl+U' },
  { mark: 'strike', tiptap: 'strike', label: 'strike', icon: 'strike', shortcut: 'Ctrl+Shift+S' },
  { mark: 'code', tiptap: 'code', label: 'code', icon: 'code', shortcut: 'Ctrl+E' },
  {
    mark: 'superscript',
    tiptap: 'superscript',
    label: 'superscript',
    icon: 'superscript',
    shortcut: 'Ctrl+.',
  },
  { mark: 'subscript', tiptap: 'subscript', label: 'subscript', icon: 'subscript', shortcut: 'Ctrl+,' },
];

/** Floating formatting toolbar for the active inline field (shown while text is selected). */
export function FormatToolbar({ editor }: { editor: Editor }) {
  const { t, permissions, props, label } = useEditor();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [panel, setPanel] = useState<'link' | 'color' | 'highlight' | null>(null);
  const [href, setHref] = useState('');
  const [newTab, setNewTab] = useState(false);

  useEffect(() => {
    const update = () => rerender();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    editor.on('blur', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      editor.off('blur', update);
    };
  }, [editor]);

  // Ctrl+K opens the link editor.
  useEffect(() => {
    const dom = editor.view.dom;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openLink();
      }
    };
    dom.addEventListener('keydown', onKey);
    return () => dom.removeEventListener('keydown', onKey);
  });

  const allowed = (mark: MarkType) => !permissions.marks || permissions.marks.includes(mark);
  const { from, to, empty } = editor.state.selection;
  const show =
    !editor.isDestroyed &&
    (editor.isFocused || panel !== null) &&
    (!empty || panel !== null || editor.isActive('link'));
  if (!show) return null;

  const start = editor.view.coordsAtPos(from);
  const end = editor.view.coordsAtPos(to);
  const x = (start.left + end.right) / 2;
  const y = Math.min(start.top, end.top);
  const palette = Object.entries((props.theme ?? defaultTheme).colors);

  function openLink() {
    const attrs = editor.getAttributes('link') as { href?: string; target?: string };
    setHref(attrs.href ?? '');
    setNewTab(attrs.target === '_blank');
    setPanel('link');
  }

  function applyLink() {
    const url = sanitizeUrl(href.trim());
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!url) chain.unsetLink().run();
    else chain.setLink({ href: url, target: newTab ? '_blank' : null }).run();
    setPanel(null);
  }

  // The toolbar lives in <body> (not clipped by the canvas); `.ce-editor-portal` scopes editor styles.
  return createPortal(
    <div className="ce-editor-portal">
      <div
        className="ce-ed-format"
        role="toolbar"
        aria-label={t('actions')}
        style={{ '--ce-ed-x': `${x}px`, '--ce-ed-y': `${y}px` }}
        onMouseDown={(event) => {
          // Keep the text selection while clicking buttons.
          if ((event.target as HTMLElement).tagName !== 'INPUT') event.preventDefault();
        }}
      >
        {BUTTONS.filter((b) => allowed(b.mark)).map((b) => (
          <button
            key={b.mark}
            type="button"
            className="ce-ed-format__button"
            aria-pressed={editor.isActive(b.tiptap)}
            aria-label={t(b.label)}
            title={b.shortcut ? `${t(b.label)} (${b.shortcut})` : t(b.label)}
            onClick={() => editor.chain().focus().toggleMark(b.tiptap).run()}
          >
            <UiIcon name={b.icon} />
          </button>
        ))}
        {allowed('highlight') && (
          <button
            type="button"
            className="ce-ed-format__button"
            aria-pressed={editor.isActive('highlight')}
            aria-label={t('highlight')}
            title={t('highlight')}
            onClick={() => setPanel(panel === 'highlight' ? null : 'highlight')}
          >
            <UiIcon name="highlight" />
          </button>
        )}
        {allowed('color') && (
          <button
            type="button"
            className="ce-ed-format__button"
            aria-pressed={editor.isActive('paletteColor')}
            aria-label={t('textColor')}
            title={t('textColor')}
            onClick={() => setPanel(panel === 'color' ? null : 'color')}
          >
            <UiIcon name="color" />
          </button>
        )}
        {allowed('link') && (
          <button
            type="button"
            className="ce-ed-format__button"
            aria-pressed={editor.isActive('link')}
            aria-label={t('link')}
            title={`${t('link')} (Ctrl+K)`}
            onClick={openLink}
          >
            <UiIcon name="link" />
          </button>
        )}
        <button
          type="button"
          className="ce-ed-format__button"
          aria-label={t('clearFormatting')}
          title={t('clearFormatting')}
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
        >
          <UiIcon name="clear" />
        </button>

        {(panel === 'color' || panel === 'highlight') && (
          <div
            className="ce-ed-format__panel ce-ed-swatches"
            role="group"
            aria-label={t(panel === 'color' ? 'textColor' : 'highlight')}
          >
            <button
              type="button"
              className="ce-ed-swatch ce-ed-swatch--none"
              aria-label={t('none')}
              onClick={() => {
                const mark = panel === 'color' ? 'paletteColor' : 'highlight';
                editor.chain().focus().unsetMark(mark).run();
                setPanel(null);
              }}
            />
            {palette.map(([name, color]) => (
              <button
                key={name}
                type="button"
                className="ce-ed-swatch"
                style={{ '--ce-ed-swatch': `var(--ce-color-${name})` }}
                aria-label={label(color.label, name)}
                title={label(color.label, name)}
                onClick={() => {
                  const mark = panel === 'color' ? 'paletteColor' : 'highlight';
                  editor.chain().focus().setMark(mark, { color: name }).run();
                  setPanel(null);
                }}
              />
            ))}
          </div>
        )}

        {panel === 'link' && (
          <form
            className="ce-ed-format__panel ce-ed-format__link"
            onSubmit={(event) => {
              event.preventDefault();
              applyLink();
            }}
          >
            <input
              className="ce-ed-input"
              type="text"
              inputMode="url"
              autoFocus
              value={href}
              placeholder={t('linkPlaceholder')}
              aria-label={t('url')}
              aria-invalid={href.trim() !== '' && !sanitizeUrl(href.trim())}
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setPanel(null);
                  editor.commands.focus();
                }
              }}
            />
            <label className="ce-ed-check">
              <input type="checkbox" checked={newTab} onChange={(event) => setNewTab(event.target.checked)} />
              {t('openInNewTab')}
            </label>
            <button type="submit" className="ce-ed-button ce-ed-button--primary">
              {t('ok')}
            </button>
            {editor.isActive('link') && (
              <button
                type="button"
                className="ce-ed-button"
                onClick={() => {
                  editor.chain().focus().extendMarkRange('link').unsetLink().run();
                  setPanel(null);
                }}
              >
                {t('removeLink')}
              </button>
            )}
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
