import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '../context';
import { UiIcon } from '../ui/icons';

/** Modal built on the native `<dialog>` (focus trap, Escape and inert background for free). */
export function Dialog({
  title,
  children,
  footer,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { t } = useEditor();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal?.();
    return () => dialog?.close?.();
  }, []);
  return createPortal(
    <div className="ce-editor-portal">
      <dialog
        ref={ref}
        className={`ce-ed-dialog${wide ? ' ce-ed-dialog--wide' : ''}`}
        aria-label={title}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => {
          if (event.target === ref.current) onClose();
        }}
      >
        <header className="ce-ed-dialog__header">
          <h2>{title}</h2>
          <button type="button" className="ce-ed-icon-button" aria-label={t('close')} onClick={onClose}>
            <UiIcon name="close" />
          </button>
        </header>
        <div className="ce-ed-dialog__body">{children}</div>
        {footer && <footer className="ce-ed-dialog__footer">{footer}</footer>}
      </dialog>
    </div>,
    document.body,
  );
}
