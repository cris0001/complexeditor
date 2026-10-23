import { useState } from 'react';
import { copyForTranslation, translationHash } from '../../schema/translation';
import { useEditor } from '../context';
import type { TranslationConfig } from '../types';
import { UiIcon } from '../ui/icons';

/** Content language switch, "Copy from …" and the outdated-translation warning. */
export function TranslationControls({ translation }: { translation: TranslationConfig }) {
  const { t, store, registry } = useEditor();
  const [confirming, setConfirming] = useState(false);
  const { source } = translation;
  const sourceHash = source ? (source.hash ?? translationHash(source.document)) : undefined;
  const outdated =
    source &&
    source.locale !== translation.current &&
    translation.translatedFromHash &&
    translation.translatedFromHash !== sourceHash;
  const language = source?.locale.toUpperCase() ?? '';

  return (
    <div className="ce-ed-toolbar__group ce-ed-translation">
      <div className="ce-ed-segmented" role="radiogroup" aria-label={t('contentLanguage')}>
        {translation.locales.map((locale) => (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={locale === translation.current}
            className="ce-ed-segmented__option"
            onClick={() => locale !== translation.current && translation.onSwitch?.(locale)}
          >
            {locale.toUpperCase()}
          </button>
        ))}
      </div>
      {source && source.locale !== translation.current && (
        <>
          {confirming ? (
            <span
              className="ce-ed-confirm"
              role="alertdialog"
              aria-label={t('copyFromLanguage', { language })}
            >
              {t('copyFromLanguageConfirm', { language })}
              <button
                type="button"
                className="ce-ed-button ce-ed-button--primary"
                onClick={() => {
                  setConfirming(false);
                  store.change(
                    () => copyForTranslation(source.document, { textProps: registry.textProps() }),
                    { select: null },
                  );
                  translation.onCopyFromSource?.(sourceHash!);
                }}
              >
                {t('yes')}
              </button>
              <button type="button" className="ce-ed-button" onClick={() => setConfirming(false)}>
                {t('no')}
              </button>
            </span>
          ) : (
            <button type="button" className="ce-ed-button" onClick={() => setConfirming(true)}>
              {t('copyFromLanguage', { language })}
            </button>
          )}
          {outdated && (
            <span className="ce-ed-badge ce-ed-badge--warning" role="status">
              <UiIcon name="warning" size={14} /> {t('translationOutdated', { language })}
            </span>
          )}
        </>
      )}
    </div>
  );
}
