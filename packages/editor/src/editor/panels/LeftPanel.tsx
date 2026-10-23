import { useState, type KeyboardEvent } from 'react';
import type { Block } from '../../schema/types';
import type { BlockCategory } from '../../core/types';
import type { EditorMessageKey } from '../../i18n/editor-messages';
import { useDocument, useEditor, useEditorState } from '../context';
import { useDrag } from '../dnd/useDrag';
import { useBlockSearch } from '../menus/SlashMenu';
import { findBlock, type BlockTemplate } from '../state/operations';
import { UiIcon } from '../ui/icons';

const CATEGORIES: { category: BlockCategory; label: EditorMessageKey }[] = [
  { category: 'text', label: 'categoryText' },
  { category: 'layout', label: 'categoryLayout' },
  { category: 'media', label: 'categoryMedia' },
  { category: 'embed', label: 'categoryEmbed' },
  { category: 'interactive', label: 'categoryInteractive' },
  { category: 'global', label: 'categoryGlobal' },
];

export function LeftPanel() {
  const { t, store } = useEditor();
  const tab = useEditorState((s) => s.leftTab);
  return (
    <aside className="ce-ed-left" aria-label={t('blocks')}>
      <div className="ce-ed-tabs" role="tablist">
        {(['blocks', 'structure'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`ce-ed-left-${value}`}
            aria-selected={tab === value}
            aria-controls={`ce-ed-left-panel-${value}`}
            className="ce-ed-tabs__tab"
            onClick={() => store.set({ leftTab: value })}
          >
            {t(value)}
          </button>
        ))}
      </div>
      <div
        className="ce-ed-left__body"
        role="tabpanel"
        id={`ce-ed-left-panel-${tab}`}
        aria-labelledby={`ce-ed-left-${tab}`}
      >
        {tab === 'blocks' ? <Palette /> : <StructureTree />}
      </div>
    </aside>
  );
}

function Palette() {
  const { t, actions, store, blockName, props, label } = useEditor();
  const [query, setQuery] = useState('');
  const results = useBlockSearch(query);
  const startDrag = useDrag();
  const insert = (type: string) => actions.insert(type, store.getState().selection);
  const insertTemplate = (template: BlockTemplate) => {
    const { selection } = store.getState();
    const doc = store.getState().history.present;
    const location = selection ? findBlock(doc, selection) : undefined;
    const target = location
      ? { parentId: location.parent?.id ?? null, index: location.index + 1 }
      : { parentId: null, index: doc.blocks.length };
    actions.insertBlocksAt([template as Block], target);
  };
  const lang = props.contentLocale ?? props.translation?.current ?? 'en';

  const item = (
    key: string,
    icon: string | undefined,
    name: string,
    onInsert: () => void,
    onDrag: Parameters<typeof startDrag>[1],
  ) => (
    <li key={key}>
      <button
        type="button"
        className="ce-ed-palette__item"
        onClick={onInsert}
        onPointerDown={(event) => startDrag(event, onDrag)}
        title={name}
      >
        <UiIcon name={icon} size={18} />
        <span>{name}</span>
      </button>
    </li>
  );

  const styles = (props.savedStyles ?? []).filter(
    (s) => !query || s.name.toLowerCase().includes(query.toLowerCase()),
  );
  const globals = (props.globalBlocks ?? []).filter(
    (g) => !query || g.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="ce-ed-palette">
      <input
        className="ce-ed-input ce-ed-palette__search"
        type="search"
        value={query}
        placeholder={t('searchBlocks')}
        aria-label={t('searchBlocks')}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) insert(results[0].type);
        }}
      />
      {results.length === 0 && !styles.length && !globals.length && (
        <p className="ce-ed-muted">{t('noBlocksFound')}</p>
      )}
      {CATEGORIES.map(({ category, label: categoryLabel }) => {
        const defs = results.filter((def) => def.category === category);
        if (!defs.length) return null;
        return (
          <section key={category} className="ce-ed-palette__group">
            <h3 className="ce-ed-palette__heading">{t(categoryLabel)}</h3>
            <ul className="ce-ed-palette__grid">
              {defs.map((def) =>
                item(
                  def.type,
                  typeof def.icon === 'string' ? def.icon : undefined,
                  blockName(def.type),
                  () => insert(def.type),
                  {
                    kind: 'new',
                    type: def.type,
                    label: blockName(def.type),
                  },
                ),
              )}
            </ul>
          </section>
        );
      })}
      {globals.length > 0 && (
        <section className="ce-ed-palette__group">
          <h3 className="ce-ed-palette__heading">{t('globalBlocks')}</h3>
          <ul className="ce-ed-palette__grid">
            {globals.map((g) => {
              const template: BlockTemplate = { type: 'global', props: { ref: g.id } };
              return item(`global-${g.id}`, 'global', g.name, () => insertTemplate(template), {
                kind: 'new',
                type: 'global',
                template,
                label: g.name,
              });
            })}
          </ul>
        </section>
      )}
      {styles.length > 0 && (
        <section className="ce-ed-palette__group">
          <h3 className="ce-ed-palette__heading">{t('savedStyles')}</h3>
          <ul className="ce-ed-palette__grid">
            {styles.map((s) => {
              const template: BlockTemplate = {
                type: s.blockType,
                props: s.props ?? {},
                style: s.style,
                classes: s.classes,
              };
              return item(`style-${s.id}`, 'bookmark', s.name, () => insertTemplate(template), {
                kind: 'new',
                type: s.blockType,
                template,
                label: s.name,
              });
            })}
          </ul>
        </section>
      )}
      {(props.templates?.length ?? 0) > 0 && (
        <section className="ce-ed-palette__group">
          <h3 className="ce-ed-palette__heading">{t('templates')}</h3>
          <ul className="ce-ed-palette__list">
            {props.templates!.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  className="ce-ed-palette__template"
                  onClick={() =>
                    store.set({ dialog: { kind: 'template', templateId: template.id, locale: lang } })
                  }
                >
                  <UiIcon name="template" size={18} />
                  <span>{label(template.name)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StructureTree() {
  const doc = useDocument();
  const { t } = useEditor();
  if (!doc.blocks.length) return <p className="ce-ed-muted">{t('emptyStructure')}</p>;
  return (
    <ul className="ce-ed-tree" role="tree" aria-label={t('structure')}>
      {doc.blocks.map((block) => (
        <TreeNode key={block.id} block={block} depth={0} />
      ))}
    </ul>
  );
}

function TreeNode({ block, depth }: { block: Block; depth: number }) {
  const { store, blockName, actions, registry, t } = useEditor();
  const selected = useEditorState((s) => s.selection === block.id);
  const [open, setOpen] = useState(true);
  const startDrag = useDrag();
  const children = block.children ?? [];
  const def = registry.get(block.type);
  const text = block.content?.map((n) => n.text).join('') ?? '';
  const preview = text.trim().slice(0, 40);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' && children.length && !open) setOpen(true);
    else if (event.key === 'ArrowLeft' && open && children.length) setOpen(false);
    else if (event.key === 'Delete') actions.remove([block.id]);
    else if (event.key === 'ArrowUp' && event.altKey) actions.move(block.id, -1);
    else if (event.key === 'ArrowDown' && event.altKey) actions.move(block.id, 1);
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      // Move focus between visible rows.
      const rows = Array.from(document.querySelectorAll<HTMLElement>('.ce-ed-tree__row'));
      const index = rows.indexOf(event.currentTarget as HTMLElement);
      rows[index + (event.key === 'ArrowDown' ? 1 : -1)]?.focus();
    } else return;
    event.preventDefault();
  };

  return (
    <li
      role="treeitem"
      aria-expanded={children.length ? open : undefined}
      aria-selected={selected}
      aria-level={depth + 1}
    >
      <div
        className="ce-ed-tree__row"
        data-ce-tree-id={block.id}
        data-outline={def?.outline ?? def?.category}
        data-untranslated={block.untranslated ? '' : undefined}
        tabIndex={selected ? 0 : -1}
        style={{ '--ce-ed-tree-depth': String(depth) }}
        onClick={() => {
          store.set({ selection: block.id, editing: null });
          document
            .querySelector(`[data-ce-id="${CSS.escape(block.id)}"]`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }}
        onPointerDown={(event) =>
          startDrag(event, { kind: 'move', id: block.id, label: blockName(block.type) })
        }
        onMouseEnter={() => store.set({ hovered: block.id })}
        onMouseLeave={() => store.set({ hovered: null })}
        onKeyDown={onKeyDown}
        onFocus={() => store.set({ selection: block.id })}
      >
        {children.length > 0 ? (
          <button
            type="button"
            className="ce-ed-tree__toggle"
            aria-label={open ? t('collapse') : t('expand')}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(!open);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <UiIcon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
          </button>
        ) : (
          <span className="ce-ed-tree__toggle" />
        )}
        <UiIcon name={typeof def?.icon === 'string' ? def.icon : undefined} size={14} />
        <span className="ce-ed-tree__name">{blockName(block.type)}</span>
        {preview && <span className="ce-ed-tree__preview">{preview}</span>}
      </div>
      {children.length > 0 && open && (
        <ul role="group">
          {children.map((child) => (
            <TreeNode key={child.id} block={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
