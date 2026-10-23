import { useEditor, useEditorState } from '../context';
import { UiIcon } from '../ui/icons';

/** Progress, cancel and retry for running uploads. */
export function UploadTray() {
  const { t, uploader } = useEditor();
  const uploads = useEditorState((s) => s.uploads);
  if (!uploads.length) return null;
  return (
    <div className="ce-ed-uploads" role="status" aria-live="polite">
      {uploads.map((u) => (
        <div key={u.id} className="ce-ed-uploads__item" data-status={u.status}>
          <span className="ce-ed-uploads__name">{u.name}</span>
          {u.status === 'uploading' && (
            <>
              <progress
                max={1}
                value={u.progress}
                aria-label={t('uploading', { progress: Math.round(u.progress * 100) })}
              />
              <button type="button" className="ce-ed-button" onClick={() => uploader.cancel(u.id)}>
                {t('cancel')}
              </button>
            </>
          )}
          {u.status === 'done' && <UiIcon name="check" />}
          {u.status === 'error' && (
            <>
              <span className="ce-ed-error">
                {t('uploadFailed')}
                {u.error ? `: ${u.error}` : ''}
              </span>
              <button type="button" className="ce-ed-button" onClick={() => uploader.retry(u.id)}>
                {t('retry')}
              </button>
              <button
                type="button"
                className="ce-ed-icon-button"
                aria-label={t('close')}
                onClick={() => uploader.dismiss(u.id)}
              >
                <UiIcon name="close" />
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
