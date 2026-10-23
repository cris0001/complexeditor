import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { foldDiacritics as fold } from '../../schema/text';
import type { AnyBlockDefinition } from '../../core/types';
import { useDocument, useEditor, useEditorState } from '../context';
import { canDrop, createBlock, findBlock, insertionPointAfter } from '../state/operations';
import type { SlashTarget } from '../state/store';
import { UiIcon } from '../ui/icons';

/** Block search shared by the slash menu and the palette. */
export function useBlockSearch(query: string): AnyBlockDefinition[] {
  const { insertable, blockName, registry } = useEditor();
  return useMemo(() => {
    const q = fold(query.trim());
    if (!q) return insertable;
    return insertable.filter((def) => {
      const i18n = Object.values(def.i18n ?? {}).flatMap((m) => [m.name, m.description ?? '']);
      const haystack = [def.type, blockName(def.type), ...i18n, ...(def.keywords ?? [])].map(fold).join(' ');
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
    // registry identity changes with the definitions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, insertable, blockName, registry]);
}

/** Popup block picker opened by "/" in an empty paragraph or by the "+" buttons. */
export function SlashMenu() {
  const { store, registry, actions, t, blockName } = useEditor();
  const slash = useEditorState((s) => s.slash);
  const doc = useDocument();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);

  const target = slash?.target;
  const allowed = useBlockSearch(query).filter((def) => (target ? fits(def.type, target) : false));

  function fits(type: string, where: SlashTarget): boolean {
    if (where.kind === 'inside') return canDrop(registry, doc, type, { parentId: where.parentId, index: 0 });
    if (where.kind === 'replace') {
      const location = findBlock(doc, where.blockId);
      if (!location) return false;
      return canDrop(registry, doc, type, { parentId: location.parent?.id ?? null, index: location.index });
    }
    return insertionPointAfter(registry, doc, where.blockId, type) !== null;
  }

  useEffect(() => {
    setQuery(slash?.query ?? '');
    setActive(0);
  }, [slash]);

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!slash || !target) return null;

  const close = () => store.set({ slash: null });
  const choose = (type: string) => {
    close();
    if (target.kind === 'replace') actions.transform(target.blockId, type);
    else if (target.kind === 'inside')
      actions.insertBlocksAt([createBlock(registry, type)], { parentId: target.parentId, index: 0 });
    else actions.insert(type, target.blockId);
  };

  // Anchor next to the block (or the canvas end).
  const anchorId = target.kind === 'inside' ? target.parentId : target.blockId;
  const anchor = anchorId
    ? document.querySelector(`[data-ce-id="${CSS.escape(anchorId)}"]`)
    : document.querySelector('.ce-ed-append');
  const rect = anchor?.getBoundingClientRect();
  const position = rect
    ? {
        '--ce-ed-x': `${Math.max(8, rect.left)}px`,
        '--ce-ed-y': `${Math.min(window.innerHeight - 340, rect.top + Math.min(rect.height, 40) + 6)}px`,
      }
    : {};

  return createPortal(
    <div className="ce-editor-portal">
      <div className="ce-ed-slash" style={position} role="dialog" aria-label={t('insertBlock')}>
        <input
          className="ce-ed-input"
          autoFocus
          value={query}
          placeholder={t('slashHint')}
          aria-label={t('searchBlocks')}
          aria-controls="ce-ed-slash-list"
          aria-activedescendant={allowed[active] ? `ce-ed-slash-${allowed[active].type}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onBlur={(event) => {
            if (!event.relatedTarget?.closest('.ce-ed-slash')) close();
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') setActive((i) => Math.min(allowed.length - 1, i + 1));
            else if (event.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1));
            else if (event.key === 'Enter' && allowed[active]) choose(allowed[active].type);
            else if (event.key === 'Escape') {
              close();
              if (target.kind === 'replace')
                store.set({ focusRequest: { blockId: target.blockId, at: 'end' } });
            } else return;
            event.preventDefault();
          }}
        />
        <ul className="ce-ed-slash__list" id="ce-ed-slash-list" role="listbox" ref={list}>
          {allowed.length === 0 && <li className="ce-ed-slash__empty">{t('noBlocksFound')}</li>}
          {allowed.map((def, i) => (
            <li
              key={def.type}
              id={`ce-ed-slash-${def.type}`}
              role="option"
              aria-selected={i === active}
              className="ce-ed-slash__item"
              onMouseEnter={() => setActive(i)}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(def.type);
              }}
            >
              <UiIcon name={typeof def.icon === 'string' ? def.icon : undefined} />
              <span>{blockName(def.type)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
