import { useLayoutEffect, useRef } from 'react';
import type { Block } from '../../schema/types';
import { useEditor } from '../context';
import { setBlockField } from '../state/paths';

/**
 * Plain-text prop edited in place (eyebrow, quote author, button label…). Uncontrolled
 * `contenteditable="plaintext-only"` so typing never fights React re-renders.
 */
export function TextField({ block, prop }: { block: Block; prop: string }) {
  const { actions, store, t } = useEditor();
  const ref = useRef<HTMLSpanElement>(null);
  const value = typeof block.props[prop] === 'string' ? (block.props[prop] as string) : '';

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== value && document.activeElement !== el) el.textContent = value;
  }, [value]);

  return (
    <span
      ref={ref}
      className="ce-ed-text"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      data-placeholder={t('placeholderText')}
      data-empty={value ? undefined : ''}
      spellCheck
      onFocus={() => store.set({ selection: block.id, editing: null })}
      onInput={(event) => {
        const text = (event.currentTarget.textContent ?? '').replace(/\n/g, ' ');
        actions.update(
          block.id,
          (b) => ({ ...setBlockField(b, prop, text || undefined), untranslated: undefined }),
          `prop:${block.id}:${prop}`,
        );
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      // Buttons and links in the canvas must not navigate or submit.
      onClick={(event) => event.preventDefault()}
    />
  );
}
