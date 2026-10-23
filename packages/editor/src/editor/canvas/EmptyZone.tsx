import { useEditor } from '../context';
import { UiIcon } from '../ui/icons';

/** Placeholder inside an empty container: drop target + "add block" button. */
export function EmptyZone({ parentId }: { parentId: string | null }) {
  const { t, store } = useEditor();
  return (
    <div className="ce-ed-empty" data-ce-drop-parent={parentId ?? ''}>
      <span>{t('dropHere')}</span>
      <button
        type="button"
        className="ce-ed-empty__add"
        aria-label={t('addBlockHere')}
        title={t('addBlockHere')}
        onClick={(event) => {
          event.stopPropagation();
          store.set({ slash: { target: { kind: 'inside', parentId }, query: '' } });
        }}
      >
        <UiIcon name="plus" />
      </button>
    </div>
  );
}
