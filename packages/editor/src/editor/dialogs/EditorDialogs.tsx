import { useMemo, useState } from 'react';
import type { Block, ContentDocument } from '../../schema/types';
import { Editor } from '../Editor';
import { useDocument, useEditor, useEditorState } from '../context';
import { findBlock, withNewIds } from '../state/operations';
import { MediaLibrary } from '../media/MediaLibrary';
import { Dialog } from './Dialog';

/** Renders whichever dialog is open in the editor state. */
export function EditorDialogs() {
  const dialog = useEditorState((s) => s.dialog);
  if (!dialog) return null;
  switch (dialog.kind) {
    case 'saveStyle':
      return <SaveStyleDialog blockId={dialog.blockId} />;
    case 'saveGlobal':
      return <SaveGlobalDialog blockId={dialog.blockId} />;
    case 'template':
      return <TemplateDialog templateId={dialog.templateId} locale={dialog.locale} />;
    case 'media':
      return (
        <MediaLibrary mediaType={dialog.mediaType} multiple={dialog.multiple} onSelect={dialog.onSelect} />
      );
    case 'shortcuts':
      return <ShortcutsDialog />;
    case 'editGlobal':
      return <EditGlobalDialog globalId={dialog.globalId} />;
    default:
      return null;
  }
}

function useClose() {
  const { store } = useEditor();
  return () => store.set({ dialog: null });
}

function NameDialog({
  title,
  label,
  onSubmit,
}: {
  title: string;
  label: string;
  onSubmit: (name: string) => Promise<void>;
}) {
  const { t } = useEditor();
  const close = useClose();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(false);
    try {
      await onSubmit(name.trim());
      close();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title={title}
      onClose={close}
      footer={
        <>
          <button type="button" className="ce-ed-button" onClick={close}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="ce-ed-button ce-ed-button--primary"
            disabled={busy || !name.trim()}
            onClick={() => void submit()}
          >
            {t('save')}
          </button>
        </>
      }
    >
      <label className="ce-ed-field">
        <span className="ce-ed-field__label">{label}</span>
        <input
          className="ce-ed-input"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit();
          }}
        />
      </label>
      {error && <p className="ce-ed-error">{t('error')}</p>}
    </Dialog>
  );
}

function SaveStyleDialog({ blockId }: { blockId: string }) {
  const { t, props, registry } = useEditor();
  const doc = useDocument();
  const block = findBlock(doc, blockId)?.block;
  if (!block || !props.onSaveStyle) return null;
  const textProps = new Set(registry.get(block.type)?.textProps ?? []);
  return (
    <NameDialog
      title={t('saveAsStyle')}
      label={t('styleName')}
      onSubmit={async (name) => {
        // A style keeps settings, not text.
        const settings = Object.fromEntries(
          Object.entries(block.props).filter(([key]) => !textProps.has(key)),
        );
        await props.onSaveStyle!({
          name,
          blockType: block.type,
          props: settings,
          style: block.style,
          classes: block.classes,
        });
      }}
    />
  );
}

function SaveGlobalDialog({ blockId }: { blockId: string }) {
  const { t, props, actions } = useEditor();
  const doc = useDocument();
  const location = findBlock(doc, blockId);
  if (!location || !props.onSaveGlobalBlock) return null;
  const locale = props.contentLocale ?? props.translation?.current ?? 'en';
  return (
    <NameDialog
      title={t('saveAsGlobal')}
      label={t('globalName')}
      onSubmit={async (name) => {
        const saved = await props.onSaveGlobalBlock!({ name, blocks: { [locale]: [location.block] } });
        // Replace the block with a reference to the new global block.
        const reference: Block = withNewIds({ type: 'global', props: { ref: saved.id } });
        actions.remove([blockId]);
        actions.insertBlocksAt([reference], { parentId: location.parent?.id ?? null, index: location.index });
      }}
    />
  );
}

function TemplateDialog({ templateId, locale }: { templateId: string; locale: string }) {
  const { t, props, label, store } = useEditor();
  const close = useClose();
  const template = props.templates?.find((x) => x.id === templateId);
  if (!template) return null;
  const doc = template.documents[locale] ?? Object.values(template.documents).find(Boolean);
  return (
    <Dialog
      title={label(template.name)}
      onClose={close}
      footer={
        <>
          <button type="button" className="ce-ed-button" onClick={close}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="ce-ed-button ce-ed-button--primary"
            disabled={!doc}
            onClick={() => {
              if (doc)
                store.change(
                  () => ({
                    version: doc.version,
                    blocks: doc.blocks.map((b) => withNewIds(structuredClone(b))),
                  }),
                  { select: null },
                );
              close();
            }}
          >
            {t('applyTemplate')}
          </button>
        </>
      }
    >
      {template.description && <p>{label(template.description)}</p>}
      <p className="ce-ed-muted">{t('applyTemplateConfirm')}</p>
    </Dialog>
  );
}

/** Edits a global block in a nested editor; saving updates every post that references it. */
function EditGlobalDialog({ globalId }: { globalId: string }) {
  const { t, props, globals, updateGlobal } = useEditor();
  const close = useClose();
  const global = globals[globalId];
  const locale = props.contentLocale ?? props.translation?.current ?? 'en';
  const initial = useMemo(
    () => ({
      version: 1,
      blocks: (global && (global.blocks[locale] ?? Object.values(global.blocks).find(Boolean))) || [],
    }),
    // The nested editor is created once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalId],
  );
  const [draft, setDraft] = useState<ContentDocument>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!global || !props.onSaveGlobalBlock) return null;

  return (
    <Dialog
      wide
      title={`${t('editGlobal')}: ${global.name}`}
      onClose={close}
      footer={
        <>
          {error && <span className="ce-ed-error">{t('error')}</span>}
          <button type="button" className="ce-ed-button" onClick={close}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="ce-ed-button ce-ed-button--primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(false);
              try {
                const saved = await props.onSaveGlobalBlock!({
                  ...global,
                  blocks: { ...global.blocks, [locale]: draft.blocks },
                });
                updateGlobal(saved);
                close();
              } catch {
                setError(true);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('save')}
          </button>
        </>
      }
    >
      <div className="ce-ed-nested">
        <Editor
          value={initial}
          onChange={setDraft}
          autosaveDelay={false}
          registry={props.registry}
          theme={props.theme}
          classNames={props.classNames}
          mergeClasses={props.mergeClasses}
          components={props.components}
          locale={props.locale}
          messages={props.messages}
          dictionaries={props.dictionaries}
          contentLocale={locale}
          permissions={{ ...props.permissions, blocks: (type) => type !== 'global' }}
          onUpload={props.onUpload}
          onListMedia={props.onListMedia}
          onUpdateMedia={props.onUpdateMedia}
          onDeleteMedia={props.onDeleteMedia}
        />
      </div>
    </Dialog>
  );
}

const SHORTCUTS: [string, string][] = [
  ['Ctrl+Z', 'undo'],
  ['Ctrl+Shift+Z / Ctrl+Y', 'redo'],
  ['Ctrl+B / I / U', 'bold'],
  ['Ctrl+K', 'link'],
  ['/', 'insertBlock'],
  ['Enter', 'addBlock'],
  ['Esc', 'selectParent'],
  ['Ctrl+D', 'duplicate'],
  ['Delete', 'delete'],
  ['Alt+↑ / Alt+↓', 'moveUp'],
  ['Ctrl+C / Ctrl+V', 'copy'],
  ['Ctrl+S', 'save'],
];

function ShortcutsDialog() {
  const { t } = useEditor();
  const close = useClose();
  return (
    <Dialog title={t('keyboardShortcuts')} onClose={close}>
      <dl className="ce-ed-shortcuts">
        {SHORTCUTS.map(([keys, label]) => (
          <div key={keys}>
            <dt>
              <kbd>{keys}</kbd>
            </dt>
            <dd>{t(label as never)}</dd>
          </div>
        ))}
      </dl>
      <p className="ce-ed-muted">Markdown: ## → H2, ### → H3, - → •, 1. → 1., &gt; → „”, [ ] → ☐, --- → —</p>
    </Dialog>
  );
}
