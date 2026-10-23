import { canRedo, canUndo } from '../state/history';
import type { Device } from '../state/store';
import { useEditor, useEditorState } from '../context';
import { UiIcon } from '../ui/icons';
import { TranslationControls } from './TranslationControls';

const DEVICES: { device: Device; icon: string; label: 'deviceMobile' | 'deviceTablet' | 'deviceDesktop' }[] =
  [
    { device: 'mobile', icon: 'mobile', label: 'deviceMobile' },
    { device: 'tablet', icon: 'tablet', label: 'deviceTablet' },
    { device: 'desktop', icon: 'desktop', label: 'deviceDesktop' },
  ];

const STATUS = {
  idle: 'statusIdle',
  dirty: 'statusDirty',
  saving: 'statusSaving',
  saved: 'statusSaved',
  error: 'statusError',
} as const;

/** Top bar: undo/redo, device width, content language, outlines toggle and save status. */
export function Toolbar({ onSaveNow }: { onSaveNow: () => void }) {
  const { store, t, props } = useEditor();
  const history = useEditorState((s) => s.history);
  const device = useEditorState((s) => s.device);
  const showOutlines = useEditorState((s) => s.showOutlines);
  const status = useEditorState((s) => s.saveStatus);
  const error = useEditorState((s) => s.saveError);

  return (
    <div className="ce-ed-toolbar" role="toolbar" aria-label={t('actions')}>
      <div className="ce-ed-toolbar__group">
        <button
          type="button"
          className="ce-ed-icon-button"
          disabled={!canUndo(history)}
          onClick={() => store.undo()}
          aria-label={t('undo')}
          title={`${t('undo')} (Ctrl+Z)`}
        >
          <UiIcon name="undo" />
        </button>
        <button
          type="button"
          className="ce-ed-icon-button"
          disabled={!canRedo(history)}
          onClick={() => store.redo()}
          aria-label={t('redo')}
          title={`${t('redo')} (Ctrl+Shift+Z)`}
        >
          <UiIcon name="redo" />
        </button>
      </div>

      <div className="ce-ed-toolbar__group ce-ed-segmented" role="radiogroup" aria-label={t('width')}>
        {DEVICES.map((d) => (
          <button
            key={d.device}
            type="button"
            role="radio"
            aria-checked={device === d.device}
            className="ce-ed-segmented__option"
            onClick={() => store.set({ device: d.device })}
            aria-label={t(d.label)}
            title={t(d.label)}
          >
            <UiIcon name={d.icon} />
          </button>
        ))}
      </div>

      {props.translation && <TranslationControls translation={props.translation} />}

      <label className="ce-ed-toolbar__toggle">
        <input
          type="checkbox"
          checked={showOutlines}
          onChange={(event) => store.set({ showOutlines: event.target.checked })}
        />
        {t('showOutlines')}
      </label>

      <div className="ce-ed-toolbar__spacer" />
      {props.toolbar}

      <div className="ce-ed-status" data-status={status} role="status" aria-live="polite" title={error}>
        {status === 'saving' && <UiIcon name="loading" className="ce-ed-spin" />}
        {status === 'error' && <UiIcon name="warning" />}
        <span>{t(STATUS[status])}</span>
        {(status === 'error' || (props.autosaveDelay === false && status === 'dirty')) && props.onSave && (
          <button type="button" className="ce-ed-button" onClick={onSaveNow}>
            {status === 'error' ? t('retry') : t('save')}
          </button>
        )}
      </div>
    </div>
  );
}
