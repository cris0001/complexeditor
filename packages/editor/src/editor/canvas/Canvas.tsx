import { useMemo, useRef, type MouseEvent, type PointerEvent } from 'react';
import { defaultTheme, themeToCss } from '../../core/theme';
import { responsiveCss } from '../../core/responsive-css';
import { cx } from '../../core/classes';
import { useDocument, useEditor, useEditorState } from '../context';
import { useEditorRenderContext } from './editorRenderContext';
import { Overlay } from './Overlay';

const DEVICE_WIDTH = { mobile: '390px', tablet: '820px', desktop: '100%' } as const;

/** The editable preview: the real renderer markup at the chosen device width. */
export function Canvas() {
  const { store, props, registry, t } = useEditor();
  const doc = useDocument();
  const device = useEditorState((s) => s.device);
  const showOutlines = useEditorState((s) => s.showOutlines);
  const frame = useRef<HTMLDivElement>(null);
  const ctx = useEditorRenderContext(doc);

  // Theme tokens scoped to the canvas, plus responsive rules when the theme has custom breakpoints.
  const css = useMemo(() => {
    const theme = props.theme;
    if (!theme) return '';
    const custom = JSON.stringify(theme.breakpoints) !== JSON.stringify(defaultTheme.breakpoints);
    return (
      themeToCss(theme, { selector: '.ce-ed-canvas' }) +
      (custom ? responsiveCss({ theme, rules: registry.responsiveRules() }) : '')
    );
  }, [props.theme, registry]);

  const blockAt = (target: EventTarget | null) =>
    (target as HTMLElement | null)?.closest<HTMLElement>('[data-ce-id]');

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('.ce-ed-actions, .ce-ed-empty__add')) return;
    const block = blockAt(target);
    const editing = store.getState().editing;
    if (!block) {
      store.set({ selection: null, editing: null, slash: null });
      return;
    }
    const id = block.dataset.ceId!;
    // Clicking the active text field keeps editing; anything else selects the block under the pointer.
    if (editing && target.closest('.ce-ed-inline--active')) return;
    store.set({
      selection: id,
      slash: null,
      ...(target.closest('.ce-ed-inline, .ce-ed-text') ? {} : { editing: null }),
    });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (store.getState().drag) return;
    const id = blockAt(event.target)?.dataset.ceId ?? null;
    if (store.getState().hovered !== id) store.set({ hovered: id });
  };

  // Links and buttons inside the canvas never navigate.
  const onClick = (event: MouseEvent) => {
    if (
      (event.target as HTMLElement).closest('a, button:not(.ce-ed-empty__add)') &&
      !(event.target as HTMLElement).closest('.ce-ed-actions')
    ) {
      event.preventDefault();
    }
  };

  return (
    <div
      className={cx('ce-ed-canvas', showOutlines && 'ce-ed-canvas--outlines')}
      data-device={device}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={() => store.set({ hovered: null })}
      onClick={onClick}
    >
      {css && <style>{css}</style>}
      <div className="ce-ed-frame" ref={frame} style={{ '--ce-ed-device-width': DEVICE_WIDTH[device] }}>
        <div className="ce-document" lang={props.contentLocale ?? props.translation?.current}>
          {ctx.renderBlocks(doc.blocks, null)}
        </div>
        <button
          type="button"
          className="ce-ed-append"
          onClick={() => {
            const last = doc.blocks[doc.blocks.length - 1];
            const lastEmpty = last?.type === 'paragraph' && !last.content?.length;
            if (lastEmpty) store.set({ focusRequest: { blockId: last.id, at: 'start' }, selection: last.id });
            else store.set({ slash: { target: { kind: 'after', blockId: null }, query: '' } });
          }}
        >
          + {t('addBlock')}
        </button>
        <Overlay frame={frame} />
      </div>
    </div>
  );
}
