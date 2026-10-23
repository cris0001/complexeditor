import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, useEditorState } from '../context';
import { findBlock } from '../state/operations';
import { useDrag } from '../dnd/useDrag';
import { UiIcon } from '../ui/icons';
import { copyBlocksToClipboard } from '../clipboard';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/** Box of a block element relative to the overlay's positioned parent. */
function useBlockBox(frame: RefObject<HTMLElement | null>, id: string | null): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    if (!id) {
      setBox(null);
      return;
    }
    let raf = 0;
    const measure = () => {
      const root = frame.current;
      const el = root?.querySelector<HTMLElement>(`[data-ce-id="${CSS.escape(id)}"]`);
      let next: Box | null = null;
      if (root && el) {
        const r = el.getBoundingClientRect();
        const base = root.getBoundingClientRect();
        next = { top: r.top - base.top, left: r.left - base.left, width: r.width, height: r.height };
      }
      setBox((prev) => (sameBox(prev, next) ? prev : next));
      raf = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [frame, id]);
  return box;
}

/**
 * Hover and selection boxes (solid, with the block's label), the action bar of the selected block,
 * the drop indicator and the drag ghost. Dashed category outlines are pure CSS on the blocks.
 */
export function Overlay({ frame }: { frame: RefObject<HTMLElement | null> }) {
  const { t, actions, store, blockName, registry, permissions, props, globals } = useEditor();
  const selection = useEditorState((s) => s.selection);
  const hovered = useEditorState((s) => s.hovered);
  const drag = useEditorState((s) => s.drag);
  const doc = useEditorState((s) => s.history.present);
  const selectedBox = useBlockBox(frame, selection);
  const hoverBox = useBlockBox(frame, hovered !== selection ? hovered : null);
  const startDrag = useDrag();
  const barRef = useRef<HTMLDivElement>(null);

  const label = (id: string | null) => {
    if (!id) return '';
    const block = findBlock(doc, id)?.block;
    if (!block) return '';
    const summary = registry.get(block.type)?.summary?.(block.props as never);
    return summary ? `${blockName(block.type)} ${summary}` : blockName(block.type);
  };

  const selected = selection ? findBlock(doc, selection) : undefined;
  const base = frame.current?.getBoundingClientRect();
  const indicator = drag?.result?.indicator;
  const structural = Boolean(selected && registry.get(selected.block.type)?.parents);
  const siblings = selected ? (selected.parent?.children ?? doc.blocks) : [];

  return (
    <div className="ce-ed-overlay" aria-hidden={drag ? true : undefined}>
      {hoverBox && !drag && (
        <div className="ce-ed-box ce-ed-box--hover" style={vars(hoverBox)}>
          <span className="ce-ed-box__label">{label(hovered)}</span>
        </div>
      )}
      {selectedBox && selected && (
        <div className="ce-ed-box ce-ed-box--selected" style={vars(selectedBox)}>
          {!drag && (
            <div
              ref={barRef}
              className="ce-ed-actions"
              role="toolbar"
              aria-label={t('actions')}
              data-below={selectedBox.top < 44 ? '' : undefined}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <span className="ce-ed-actions__label">{label(selection)}</span>
              {selected.parent && (
                <ActionButton
                  icon="parent"
                  label={t('selectParent')}
                  onClick={() => actions.selectParent(selected.block.id)}
                />
              )}
              {permissions.structure && (
                <>
                  <ActionButton
                    icon="arrow-up"
                    label={t('moveUp')}
                    disabled={selected.index === 0}
                    onClick={() => actions.move(selected.block.id, -1)}
                  />
                  <ActionButton
                    icon="arrow-down"
                    label={t('moveDown')}
                    disabled={selected.index >= siblings.length - 1}
                    onClick={() => actions.move(selected.block.id, 1)}
                  />
                  <button
                    type="button"
                    className="ce-ed-actions__button ce-ed-actions__drag"
                    aria-label={t('drag')}
                    title={t('drag')}
                    onPointerDown={(event) =>
                      startDrag(event, { kind: 'move', id: selected.block.id, label: label(selection) })
                    }
                  >
                    <UiIcon name="grip" />
                  </button>
                  <ActionButton
                    icon="copy"
                    label={t('duplicate')}
                    onClick={() => actions.duplicate(selected.block.id)}
                  />
                  {!structural && (
                    <ActionButton
                      icon="paste"
                      label={t('copy')}
                      onClick={() => void copyBlocksToClipboard([selected.block], registry)}
                    />
                  )}
                  {!structural && props.onSaveStyle && (
                    <ActionButton
                      icon="bookmark"
                      label={t('saveAsStyle')}
                      onClick={() => store.set({ dialog: { kind: 'saveStyle', blockId: selected.block.id } })}
                    />
                  )}
                  {!structural && props.onSaveGlobalBlock && (
                    <ActionButton
                      icon="global"
                      label={t('saveAsGlobal')}
                      onClick={() =>
                        store.set({ dialog: { kind: 'saveGlobal', blockId: selected.block.id } })
                      }
                    />
                  )}
                  {selected.block.type === 'global' && typeof selected.block.props.ref === 'string' && (
                    <>
                      {props.onSaveGlobalBlock && (
                        <ActionButton
                          icon="settings"
                          label={t('editGlobal')}
                          onClick={() =>
                            store.set({
                              dialog: { kind: 'editGlobal', globalId: selected.block.props.ref as string },
                            })
                          }
                        />
                      )}
                      <ActionButton
                        icon="parent"
                        label={t('detachGlobal')}
                        onClick={() =>
                          actions.detachGlobal(
                            selected.block.id,
                            globals,
                            props.contentLocale ?? props.translation?.current,
                          )
                        }
                      />
                    </>
                  )}
                  <ActionButton
                    icon="trash"
                    label={t('delete')}
                    danger
                    onClick={() => actions.remove([selected.block.id])}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}
      {indicator && base && (
        <div
          className={`ce-ed-drop ce-ed-drop--${indicator.kind}`}
          style={vars({
            top: indicator.y - base.top,
            left: indicator.x - base.left,
            width: indicator.width,
            height: indicator.height,
          })}
        />
      )}
      {drag &&
        createPortal(
          <div className="ce-editor-portal">
            <div className="ce-ed-ghost" style={{ '--ce-ed-x': `${drag.x}px`, '--ce-ed-y': `${drag.y}px` }}>
              {drag.source.label}
              {!drag.result && <span className="ce-ed-ghost__invalid"> — {t('notAllowedHere')}</span>}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

const vars = (box: Box) => ({
  '--ce-ed-top': `${box.top}px`,
  '--ce-ed-left': `${box.left}px`,
  '--ce-ed-width': `${box.width}px`,
  '--ce-ed-height': `${box.height}px`,
});

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`ce-ed-actions__button${danger ? ' ce-ed-actions__button--danger' : ''}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <UiIcon name={icon} />
    </button>
  );
}
