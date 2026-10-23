import { useEffect, useId, useState, type ReactNode } from 'react';
import { ICON_NAMES } from '../../core/icons';
import { defaultTheme } from '../../core/theme';
import { Icon } from '../../core/icons';
import { useEditor } from '../context';
import { UiIcon } from '../ui/icons';

export interface Option<T = unknown> {
  value: T;
  label: string;
  icon?: string;
}

export function Segmented<T>({
  value,
  options,
  onChange,
  label,
  allowEmpty,
}: {
  value: T | undefined;
  options: Option<T>[];
  onChange: (value: T | undefined) => void;
  label: string;
  allowEmpty?: boolean;
}) {
  return (
    <div className="ce-ed-segmented ce-ed-segmented--field" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            className="ce-ed-segmented__option"
            title={option.label}
            aria-label={option.icon ? option.label : undefined}
            onClick={() => onChange(checked && allowEmpty ? undefined : option.value)}
          >
            {option.icon ? <UiIcon name={option.icon} /> : option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Select<T>({
  value,
  options,
  onChange,
  label,
  placeholder,
}: {
  value: T | undefined;
  options: Option<T>[];
  onChange: (value: T | undefined) => void;
  label: string;
  placeholder?: string;
}) {
  const index = options.findIndex((o) => o.value === value);
  return (
    <select
      className="ce-ed-input ce-ed-select"
      aria-label={label}
      value={index}
      onChange={(event) => {
        const i = Number(event.target.value);
        onChange(i < 0 ? undefined : options[i]?.value);
      }}
    >
      <option value={-1}>{placeholder ?? '—'}</option>
      {options.map((option, i) => (
        <option key={String(option.value)} value={i}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Text input that commits on every keystroke but keeps its own draft while invalid. */
export function TextInput({
  value,
  onChange,
  label,
  placeholder,
  validate,
  multiline,
  inputMode,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  label: string;
  placeholder?: string;
  validate?: (value: string) => boolean;
  multiline?: boolean;
  inputMode?: 'url' | 'text' | 'numeric' | 'decimal';
}) {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);
  const invalid = draft !== '' && validate ? !validate(draft) : false;
  const commit = (next: string) => {
    setDraft(next);
    if (next === '') onChange(undefined);
    else if (!validate || validate(next)) onChange(next);
  };
  const common = {
    className: 'ce-ed-input',
    value: draft,
    placeholder,
    'aria-label': label,
    'aria-invalid': invalid || undefined,
  };
  return multiline ? (
    <textarea {...common} rows={3} onChange={(event) => commit(event.target.value)} />
  ) : (
    <input {...common} type="text" inputMode={inputMode} onChange={(event) => commit(event.target.value)} />
  );
}

export function NumberInput({
  value,
  onChange,
  label,
  min,
  max,
  step,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  useEffect(() => setDraft(value === undefined ? '' : String(value)), [value]);
  return (
    <input
      className="ce-ed-input ce-ed-number"
      type="number"
      aria-label={label}
      value={draft}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(event) => {
        setDraft(event.target.value);
        if (event.target.value === '') return onChange(undefined);
        const n = Number(event.target.value);
        if (Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max))
          onChange(n);
      }}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="ce-ed-switch">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ce-ed-switch__track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function Slider({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 1,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="ce-ed-slider">
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value ?? min}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <NumberInput
        value={value}
        onChange={(v) => v !== undefined && onChange(v)}
        label={label}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

/** Palette color picker: only named theme colors, never arbitrary values. */
export function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  label: string;
}) {
  const { props, label: localize, t } = useEditor();
  const colors = Object.entries((props.theme ?? defaultTheme).colors);
  return (
    <div className="ce-ed-swatches" role="radiogroup" aria-label={label}>
      <button
        type="button"
        role="radio"
        aria-checked={value === undefined}
        className="ce-ed-swatch ce-ed-swatch--none"
        aria-label={t('none')}
        title={t('none')}
        onClick={() => onChange(undefined)}
      />
      {colors.map(([name, color]) => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={value === name}
          className="ce-ed-swatch"
          style={{ '--ce-ed-swatch': `var(--ce-color-${name})` }}
          aria-label={localize(color.label, name)}
          title={localize(color.label, name)}
          onClick={() => onChange(name)}
        />
      ))}
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
  label,
  icons = ICON_NAMES,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  label: string;
  icons?: readonly string[];
}) {
  const { t } = useEditor();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="ce-ed-iconpicker">
      <button
        type="button"
        className="ce-ed-button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {value && value !== 'auto' && value !== 'none' ? <Icon name={value} size={16} /> : null}
        {value ?? t('choose')}
      </button>
      {open && (
        <div className="ce-ed-iconpicker__grid" id={id} role="listbox" aria-label={label}>
          {icons.map((name) => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={value === name}
              className="ce-ed-iconpicker__item"
              title={name}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
            >
              {name === 'auto' || name === 'none' ? (
                <span className="ce-ed-iconpicker__text">{name === 'auto' ? t('auto') : t('none')}</span>
              ) : (
                <Icon name={name} size={18} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Labeled row; `extra` holds the responsive indicator / reset button. */
export function FieldRow({
  label,
  children,
  extra,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  extra?: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="ce-ed-field">
      <div className="ce-ed-field__header">
        <label className="ce-ed-field__label" htmlFor={htmlFor}>
          {label}
        </label>
        {extra}
      </div>
      <div className="ce-ed-field__control">{children}</div>
    </div>
  );
}
