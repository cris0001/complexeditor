import type { ComponentType } from 'react';
import { cssLength as cssLengthSchema, isSafeClassList } from '../../schema/zod';
import { isSafeUrl, sanitizeUrl } from '../../schema/url';
import type { Background, Block, SpaceValue } from '../../schema/types';
import type { InspectorField } from '../../core/types';
import { defaultTheme } from '../../core/theme';
import { COLUMN_PRESETS } from '../../blocks/layout';
import { useEditor } from '../context';
import type { EditorContextValue } from '../context';
import type { MediaItem, MediaType } from '../types';
import { UiIcon } from '../ui/icons';
import {
  ColorPicker,
  IconPicker,
  NumberInput,
  Segmented,
  Select,
  Slider,
  TextInput,
  Toggle,
  type Option,
} from './controls';

export interface FieldProps<T = unknown> {
  field: InspectorField;
  value: T;
  onChange: (value: T | undefined) => void;
  block: Block;
  label: string;
}

/** Field component of any value type (each field reads exactly the value at its own `name`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FieldComponent = ComponentType<FieldProps<any>>;

type Localized = Partial<Record<string, string>> | string;

/** Options declared in a field definition (`options: [{ value, label: { pl, en } }]`). */
function useOptions(field: InspectorField): Option[] {
  const { label } = useEditor();
  const raw = (field.options as { value: unknown; label: Localized; icon?: string }[] | undefined) ?? [];
  return raw.map((o) => ({
    value: o.value,
    label: label(o.label as Localized, String(o.value)),
    icon: o.icon,
  }));
}

const isLength = (value: string) => cssLengthSchema.safeParse(value).success;

// ---------------------------------------------------------------------------------------------
// Simple fields
// ---------------------------------------------------------------------------------------------

const TextField = ({ value, onChange, label, field }: FieldProps<string>) => (
  <TextInput value={value} onChange={onChange} label={label} multiline={Boolean(field.multiline)} />
);

const UrlField = ({ value, onChange, label }: FieldProps<string>) => {
  const { t } = useEditor();
  return (
    <TextInput
      value={value}
      onChange={onChange}
      label={label}
      placeholder={t('linkPlaceholder')}
      validate={(v) => isSafeUrl(v)}
      inputMode="url"
    />
  );
};

const NumberField = ({ value, onChange, label, field }: FieldProps<number>) => (
  <NumberInput
    value={value}
    onChange={onChange}
    label={label}
    min={field.min as number}
    max={field.max as number}
    step={field.step as number}
  />
);

const SliderField = ({ value, onChange, label, field }: FieldProps<number>) => (
  <Slider
    value={value}
    onChange={onChange}
    label={label}
    min={field.min as number}
    max={field.max as number}
    step={field.step as number}
  />
);

const ToggleField = ({ value, onChange, label }: FieldProps<boolean>) => (
  <Toggle checked={Boolean(value)} onChange={(v) => onChange(v || undefined)} label={label} />
);

function SegmentedField({ value, onChange, label, field }: FieldProps) {
  return <Segmented value={value} options={useOptions(field)} onChange={onChange} label={label} />;
}

function SelectField({ value, onChange, label, field }: FieldProps) {
  return <Select value={value} options={useOptions(field)} onChange={onChange} label={label} />;
}

function AlignField({ value, onChange, label }: FieldProps<string>) {
  const { t } = useEditor();
  return (
    <Segmented
      value={value}
      onChange={onChange}
      label={label}
      allowEmpty
      options={[
        { value: 'left', label: t('alignLeft') },
        { value: 'center', label: t('alignCenter') },
        { value: 'right', label: t('alignRight') },
      ]}
    />
  );
}

function makeAxisField(values: string[]) {
  return function AxisField({ value, onChange, label }: FieldProps<string>) {
    return (
      <Segmented
        value={value}
        onChange={onChange}
        label={label}
        allowEmpty
        options={values.map((v) => ({ value: v, label: v }))}
      />
    );
  };
}

const ColorField = ({ value, onChange, label }: FieldProps<string>) => (
  <ColorPicker value={value} onChange={onChange} label={label} />
);

function FontField({ value, onChange, label }: FieldProps<string>) {
  const { props, label: localize } = useEditor();
  const fonts = Object.entries((props.theme ?? defaultTheme).fonts);
  return (
    <Select
      value={value}
      onChange={onChange}
      label={label}
      options={fonts.map(([name, font]) => ({ value: name, label: localize(font.label, name) }))}
    />
  );
}

const AnchorField = ({ value, onChange, label }: FieldProps<string>) => (
  <TextInput
    value={value}
    onChange={onChange}
    label={label}
    validate={(v) => /^[A-Za-z][\w-]{0,99}$/.test(v)}
    placeholder="intro"
  />
);

const IconField = ({ value, onChange, label, field }: FieldProps<string>) => (
  <IconPicker value={value} onChange={onChange} label={label} icons={field.icons as string[] | undefined} />
);

function LevelField({ value, onChange, label }: FieldProps<string>) {
  const { t } = useEditor();
  return (
    <Segmented
      value={value}
      onChange={onChange}
      label={label}
      allowEmpty
      options={[
        { value: 'none', label: t('none') },
        { value: 's', label: 'S' },
        { value: 'm', label: 'M' },
        { value: 'l', label: 'L' },
      ]}
    />
  );
}

function NumberListField({ value, onChange, label }: FieldProps<number[]>) {
  return (
    <TextInput
      value={value?.join(', ')}
      label={label}
      placeholder="1, 3, 5"
      validate={(v) => /^\s*\d+(\s*,\s*\d+)*\s*$/.test(v)}
      onChange={(v) =>
        onChange(
          v
            ? v
                .split(',')
                .map((n) => Number(n.trim()))
                .filter((n) => n > 0)
            : undefined,
        )
      }
    />
  );
}

function ButtonVariantField({ value, onChange, label }: FieldProps<string>) {
  const { props, label: localize } = useEditor();
  const buttons = Object.entries((props.theme ?? defaultTheme).buttons);
  return (
    <Segmented
      value={value}
      onChange={onChange}
      label={label}
      options={buttons.map(([name, b]) => ({ value: name, label: localize(b.label, name) }))}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Lengths and spacing
// ---------------------------------------------------------------------------------------------

function LengthField({ value, onChange, label, field }: FieldProps<string>) {
  const { t } = useEditor();
  const allowScreen = Boolean(field.allowScreen);
  return (
    <div className="ce-ed-inline-controls">
      <TextInput
        value={value === 'screen' ? '' : value}
        onChange={onChange}
        label={label}
        placeholder="24rem, 600px, 50vh"
        validate={isLength}
      />
      {allowScreen && (
        <button
          type="button"
          className="ce-ed-button"
          aria-pressed={value === 'screen'}
          onClick={() => onChange(value === 'screen' ? undefined : 'screen')}
        >
          {t('fullScreenHeight')}
        </button>
      )}
    </div>
  );
}

const SPACE_TOKENS = ['none', 'xs', 's', 'm', 'l', 'xl'] as const;

export function SpaceControl({
  value,
  onChange,
  label,
}: {
  value: SpaceValue | undefined;
  onChange: (v: SpaceValue | undefined) => void;
  label: string;
}) {
  const { t } = useEditor();
  const custom = typeof value === 'object' ? value.custom : undefined;
  return (
    <div className="ce-ed-space">
      <Segmented
        value={typeof value === 'string' ? value : undefined}
        onChange={(v) => onChange(v)}
        allowEmpty
        label={label}
        options={SPACE_TOKENS.map((token) => ({
          value: token,
          label: token === 'none' ? '0' : token.toUpperCase(),
        }))}
      />
      <TextInput
        value={custom}
        onChange={(v) => onChange(v ? { custom: v } : undefined)}
        label={`${label} — ${t('custom')}`}
        placeholder={t('custom')}
        validate={isLength}
      />
    </div>
  );
}

const SpaceField = ({ value, onChange, label }: FieldProps<SpaceValue>) => (
  <SpaceControl value={value} onChange={onChange} label={label} />
);

// ---------------------------------------------------------------------------------------------
// Width, background, columns layout
// ---------------------------------------------------------------------------------------------

type Width = 'normal' | 'wide' | 'full' | { max: string };

function WidthField({ value, onChange, label }: FieldProps<Width>) {
  const { t } = useEditor();
  const mode = typeof value === 'object' ? 'custom' : value;
  return (
    <div className="ce-ed-stack">
      <Segmented
        value={mode}
        allowEmpty
        label={label}
        onChange={(v) =>
          onChange(
            v === 'custom'
              ? { max: typeof value === 'object' ? value.max : '48rem' }
              : (v as Width | undefined),
          )
        }
        options={[
          { value: 'normal', label: t('widthNormal') },
          { value: 'wide', label: t('widthWide') },
          { value: 'full', label: t('widthFull') },
          { value: 'custom', label: t('custom') },
        ]}
      />
      {typeof value === 'object' && (
        <TextInput
          value={value.max}
          label={t('widthCustom')}
          validate={isLength}
          onChange={(v) => v && onChange({ max: v })}
        />
      )}
    </div>
  );
}

function BackgroundField({ value, onChange, label }: FieldProps<Background>) {
  const { t } = useEditor();
  const kind = value?.type;
  const set = (patch: Partial<Background>) => onChange({ ...(value as Background), ...patch } as Background);
  return (
    <div className="ce-ed-stack">
      <Segmented
        value={kind}
        allowEmpty
        label={label}
        onChange={(type) => {
          if (!type) return onChange(undefined);
          if (type === 'color') onChange({ type: 'color', color: 'surface' });
          if (type === 'gradient') onChange({ type: 'gradient', from: 'primary', to: 'accent', angle: 135 });
          if (type === 'image') onChange({ type: 'image', src: '', overlay: 0.35 });
        }}
        options={[
          { value: 'color', label: t('backgroundColor') },
          { value: 'gradient', label: t('backgroundGradient') },
          { value: 'image', label: t('backgroundImage') },
        ]}
      />
      {value?.type === 'color' && (
        <ColorPicker
          value={value.color}
          onChange={(color) => color && set({ color })}
          label={t('backgroundColor')}
        />
      )}
      {value?.type === 'gradient' && (
        <>
          <span className="ce-ed-sublabel">{t('gradientFrom')}</span>
          <ColorPicker
            value={value.from}
            onChange={(from) => from && set({ from })}
            label={t('gradientFrom')}
          />
          <span className="ce-ed-sublabel">{t('gradientTo')}</span>
          <ColorPicker value={value.to} onChange={(to) => to && set({ to })} label={t('gradientTo')} />
          <Slider
            value={value.angle ?? 135}
            min={0}
            max={360}
            onChange={(angle) => set({ angle })}
            label={t('gradientAngle')}
          />
        </>
      )}
      {value?.type === 'image' && (
        <>
          <MediaPicker
            type="image"
            src={value.src}
            onPick={(item) => set({ src: item.url })}
            onUrl={(src) => set({ src })}
            onClear={() => set({ src: '' })}
          />
          <span className="ce-ed-sublabel">{t('overlay')}</span>
          <Slider
            value={value.overlay ?? 0.35}
            min={0}
            max={1}
            step={0.05}
            onChange={(overlay) => set({ overlay })}
            label={t('overlay')}
          />
        </>
      )}
    </div>
  );
}

const PRESET_LABELS: Record<string, string> = {
  '100': '100',
  '50-50': '50/50',
  '33-67': '33/67',
  '67-33': '67/33',
  '25-75': '25/75',
  '75-25': '75/25',
  '33-33-33': '3×',
  '25-25-25-25': '4×',
  custom: '✎',
};

function ColumnsLayoutField({ value, onChange, label }: FieldProps<string>) {
  const { t } = useEditor();
  return (
    <div className="ce-ed-presets" role="radiogroup" aria-label={label}>
      {[...Object.keys(COLUMN_PRESETS), 'custom'].map((preset) => (
        <button
          key={preset}
          type="button"
          role="radio"
          aria-checked={value === preset}
          className="ce-ed-presets__item"
          title={preset === 'custom' ? t('custom') : PRESET_LABELS[preset]}
          onClick={() => onChange(preset)}
        >
          <span className="ce-ed-presets__bars" aria-hidden="true">
            {(preset === 'custom' ? ['1', '1', '1'] : preset.split('-')).map((part, i) => (
              <span key={i} style={{ '--ce-ed-grow': part === '100' ? '1' : part }} />
            ))}
          </span>
          <span>{PRESET_LABELS[preset]}</span>
        </button>
      ))}
    </div>
  );
}

function TableColumnsField({ value, onChange, label, block }: FieldProps<(string | null)[]>) {
  const { t } = useEditor();
  const count = Math.max(0, ...(block.children ?? []).map((row) => row.children?.length ?? 0));
  const current = value ?? [];
  return (
    <div className="ce-ed-stack" aria-label={label} role="group">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="ce-ed-inline-controls">
          <span className="ce-ed-sublabel">#{i + 1}</span>
          <Segmented
            value={current[i] ?? undefined}
            allowEmpty
            label={`${label} ${i + 1}`}
            onChange={(v) => {
              const next = Array.from({ length: count }, (_, j) =>
                j === i ? (v ?? null) : (current[j] ?? null),
              );
              onChange(next.every((x) => x === null) ? undefined : next);
            }}
            options={[
              { value: 'left', label: t('alignLeft') },
              { value: 'center', label: t('alignCenter') },
              { value: 'right', label: t('alignRight') },
            ]}
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------------------------

/** Preview + "choose from library / upload" + "from link". */
export function MediaPicker({
  type,
  src,
  onPick,
  onUrl,
  onClear,
  multiple,
  onPickMany,
}: {
  type: MediaType;
  src?: string;
  onPick: (item: MediaItem) => void;
  onUrl: (url: string) => void;
  onClear?: () => void;
  multiple?: boolean;
  onPickMany?: (items: MediaItem[]) => void;
}) {
  const { t, store, props } = useEditor();
  const canBrowse = Boolean(props.onUpload || props.onListMedia);
  return (
    <div className="ce-ed-media">
      {src && type === 'image' && <img className="ce-ed-media__preview" src={sanitizeUrl(src)} alt="" />}
      {src && type !== 'image' && <span className="ce-ed-media__name">{src.split('/').pop()}</span>}
      <div className="ce-ed-inline-controls">
        {canBrowse && (
          <button
            type="button"
            className="ce-ed-button ce-ed-button--primary"
            onClick={() =>
              store.set({
                dialog: {
                  kind: 'media',
                  mediaType: type,
                  multiple: Boolean(multiple),
                  onSelect: (items) => {
                    if (multiple && onPickMany) onPickMany(items);
                    else if (items[0]) onPick(items[0]);
                  },
                },
              })
            }
          >
            <UiIcon name="image" /> {src ? t('replace') : t('mediaLibrary')}
          </button>
        )}
        {src && onClear && (
          <button type="button" className="ce-ed-button" onClick={onClear}>
            {t('remove')}
          </button>
        )}
      </div>
      {!props.onUpload && <p className="ce-ed-hint">{t('linkOnlyMode')}</p>}
      <TextInput
        value={src || undefined}
        onChange={(url) => url && onUrl(url)}
        label={t('fromLink')}
        placeholder={t('fromLink')}
        validate={(v) => isSafeUrl(v, { allowRelative: true })}
        inputMode="url"
      />
    </div>
  );
}

interface ImageValue {
  src: string;
  id?: string;
  alt?: string;
  width?: number;
  height?: number;
  srcSet?: string;
}

/** Image from a library item, with the alt text in the document's content language. */
export function imageFromMedia(item: MediaItem, ctx: Pick<EditorContextValue, 'props'>): ImageValue {
  const lang = ctx.props.contentLocale ?? ctx.props.translation?.current ?? 'en';
  const alt = item.alt?.[lang] ?? item.alt?.[lang.split('-')[0]!] ?? '';
  return {
    src: item.url,
    id: item.id,
    ...(alt ? { alt } : {}),
    ...(item.width ? { width: item.width } : {}),
    ...(item.height ? { height: item.height } : {}),
    ...(item.srcSet ? { srcSet: item.srcSet } : {}),
  };
}

function MediaField({
  value,
  onChange,
  field,
}: FieldProps<ImageValue | { src: string; name: string; size?: number; mime?: string; id?: string }>) {
  const ctx = useEditor();
  const type = (field.mediaType as MediaType) ?? 'image';
  return (
    <MediaPicker
      type={type}
      src={value?.src}
      onClear={() => onChange(undefined)}
      onUrl={(src) =>
        onChange(
          type === 'file'
            ? { src, name: src.split('/').pop() || 'file' }
            : { ...(value as ImageValue), src, id: undefined },
        )
      }
      onPick={(item) =>
        onChange(
          type === 'file'
            ? {
                src: item.url,
                id: item.id,
                name: item.name ?? item.url.split('/').pop() ?? 'file',
                ...(item.size ? { size: item.size } : {}),
                ...(item.mime ? { mime: item.mime } : {}),
              }
            : imageFromMedia(item, ctx),
        )
      }
    />
  );
}

interface GalleryItem {
  id: string;
  image: ImageValue;
  caption?: string;
}

function MediaListField({ value, onChange, label }: FieldProps<GalleryItem[]>) {
  const ctx = useEditor();
  const { t } = ctx;
  const items = value ?? [];
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };
  const add = (media: MediaItem[]) =>
    onChange([
      ...items,
      ...media.map((m) => ({ id: Math.random().toString(36).slice(2, 12), image: imageFromMedia(m, ctx) })),
    ]);
  return (
    <div className="ce-ed-stack" role="group" aria-label={label}>
      <ol className="ce-ed-medialist">
        {items.map((item, i) => (
          <li key={item.id} className="ce-ed-medialist__item">
            <img src={sanitizeUrl(item.image.src)} alt="" />
            <div className="ce-ed-stack">
              <TextInput
                value={item.caption}
                label={t('caption')}
                placeholder={t('caption')}
                onChange={(caption) => onChange(items.map((x, j) => (j === i ? { ...x, caption } : x)))}
              />
              <TextInput
                value={item.image.alt}
                label={t('altText')}
                placeholder={t('altText')}
                onChange={(alt) =>
                  onChange(items.map((x, j) => (j === i ? { ...x, image: { ...x.image, alt } } : x)))
                }
              />
            </div>
            <div className="ce-ed-medialist__actions">
              <button
                type="button"
                className="ce-ed-icon-button"
                aria-label={t('moveUp')}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                <UiIcon name="arrow-up" />
              </button>
              <button
                type="button"
                className="ce-ed-icon-button"
                aria-label={t('moveDown')}
                disabled={i === items.length - 1}
                onClick={() => move(i, i + 1)}
              >
                <UiIcon name="arrow-down" />
              </button>
              <button
                type="button"
                className="ce-ed-icon-button"
                aria-label={t('remove')}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                <UiIcon name="trash" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <MediaPicker
        type="image"
        multiple
        onPick={(m) => add([m])}
        onPickMany={add}
        onUrl={(src) => add([{ id: '', url: src, type: 'image' }])}
      />
    </div>
  );
}

function FocalPointField({ value, onChange, label, block, field }: FieldProps<{ x: number; y: number }>) {
  const { t } = useEditor();
  const image = block.props[(field.image as string) ?? 'image'] as ImageValue | undefined;
  const src = image?.src && sanitizeUrl(image.src);
  if (!src) return null;
  const point = value ?? { x: 0.5, y: 0.5 };
  return (
    <div className="ce-ed-focal">
      <button
        type="button"
        className="ce-ed-focal__frame"
        aria-label={`${label}: ${Math.round(point.x * 100)}% ${Math.round(point.y * 100)}%`}
        title={t('focalPointHint')}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const round = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 100) / 100;
          onChange({
            x: round((event.clientX - rect.left) / rect.width),
            y: round((event.clientY - rect.top) / rect.height),
          });
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.1 : 0.02;
          const delta = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          }[event.key];
          if (!delta) return;
          event.preventDefault();
          const clamp = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 100) / 100;
          onChange({ x: clamp(point.x + delta[0]!), y: clamp(point.y + delta[1]!) });
        }}
      >
        <img src={src} alt="" />
        <span
          className="ce-ed-focal__dot"
          style={{ '--ce-ed-fx': `${point.x * 100}%`, '--ce-ed-fy': `${point.y * 100}%` }}
        />
      </button>
      <p className="ce-ed-hint">{t('focalPointHint')}</p>
    </div>
  );
}

function LinkField({ value, onChange, label }: FieldProps<{ href: string; newTab?: boolean }>) {
  const { t } = useEditor();
  return (
    <div className="ce-ed-stack">
      <TextInput
        value={value?.href}
        label={label}
        placeholder={t('linkPlaceholder')}
        validate={(v) => isSafeUrl(v)}
        inputMode="url"
        onChange={(href) => onChange(href ? { ...value, href } : undefined)}
      />
      {value?.href && (
        <Toggle
          checked={Boolean(value.newTab)}
          label={t('openInNewTab')}
          onChange={(newTab) => onChange({ ...value, newTab: newTab || undefined })}
        />
      )}
    </div>
  );
}

type HeroMedia =
  | { type: 'image'; image: ImageValue; mobileImage?: ImageValue }
  | { type: 'video'; src: string; poster?: ImageValue };

function HeroMediaField({ value, onChange, label }: FieldProps<HeroMedia>) {
  const ctx = useEditor();
  const { t } = ctx;
  return (
    <div className="ce-ed-stack">
      <Segmented
        value={value?.type}
        allowEmpty
        label={label}
        onChange={(type) =>
          onChange(
            type === 'image'
              ? { type: 'image', image: { src: '' } }
              : type === 'video'
                ? { type: 'video', src: '' }
                : undefined,
          )
        }
        options={[
          { value: 'image', label: t('backgroundImage') },
          { value: 'video', label: t('video') },
        ]}
      />
      {value?.type === 'image' && (
        <MediaPicker
          type="image"
          src={value.image.src}
          onPick={(m) => onChange({ ...value, image: imageFromMedia(m, ctx) })}
          onUrl={(src) => onChange({ ...value, image: { src } })}
        />
      )}
      {value?.type === 'video' && (
        <>
          <MediaPicker
            type="video"
            src={value.src}
            onPick={(m) => onChange({ ...value, src: m.url })}
            onUrl={(src) => onChange({ ...value, src })}
          />
          <span className="ce-ed-sublabel">{t('poster')}</span>
          <MediaPicker
            type="image"
            src={value.poster?.src}
            onPick={(m) => onChange({ ...value, poster: imageFromMedia(m, ctx) })}
            onUrl={(src) => onChange({ ...value, poster: { src } })}
            onClear={() => onChange({ ...value, poster: undefined })}
          />
        </>
      )}
    </div>
  );
}

type VideoSource = { type: 'file'; src: string } | { type: 'embed'; url: string };

function VideoSourceField({ value, onChange }: FieldProps<VideoSource>) {
  const { t } = useEditor();
  return (
    <div className="ce-ed-stack">
      <TextInput
        value={value?.type === 'embed' ? value.url : undefined}
        label="YouTube / Vimeo"
        placeholder="https://youtu.be/…"
        inputMode="url"
        onChange={(url) => onChange(url ? { type: 'embed', url } : undefined)}
      />
      <span className="ce-ed-sublabel">{t('videoFileHint')}</span>
      <MediaPicker
        type="video"
        src={value?.type === 'file' ? value.src : undefined}
        onPick={(m) => onChange({ type: 'file', src: m.url })}
        onUrl={(src) => onChange({ type: 'file', src })}
        onClear={() => onChange(undefined)}
      />
    </div>
  );
}

function ClassesField({ value, onChange, label }: FieldProps<string>) {
  const { permissions, t } = useEditor();
  const allowList = Array.isArray(permissions.customClasses)
    ? (permissions.customClasses as readonly string[])
    : undefined;
  if (allowList) {
    const current = (value ?? '').split(/\s+/).filter(Boolean);
    return (
      <div className="ce-ed-chips" role="group" aria-label={label}>
        {allowList.map((name) => {
          const on = current.includes(name);
          return (
            <button
              key={name}
              type="button"
              className="ce-ed-chip"
              aria-pressed={on}
              onClick={() => {
                const next = on ? current.filter((c) => c !== name) : [...current, name];
                onChange(next.length ? next.join(' ') : undefined);
              }}
            >
              {name}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <TextInput
      value={value}
      onChange={onChange}
      label={label}
      placeholder={t('cssClassHint')}
      validate={isSafeClassList}
    />
  );
}

/** Built-in field types. Projects add or replace types through `<Editor fields>`. */
export const BUILTIN_FIELDS: Record<string, FieldComponent> = {
  text: TextField as FieldComponent,
  url: UrlField as FieldComponent,
  number: NumberField as FieldComponent,
  slider: SliderField as FieldComponent,
  toggle: ToggleField as FieldComponent,
  segmented: SegmentedField as FieldComponent,
  select: SelectField as FieldComponent,
  align: AlignField as FieldComponent,
  verticalAlign: makeAxisField(['start', 'center', 'end', 'stretch']) as FieldComponent,
  horizontalAlign: makeAxisField(['start', 'center', 'end', 'stretch']) as FieldComponent,
  color: ColorField as FieldComponent,
  font: FontField as FieldComponent,
  anchor: AnchorField as FieldComponent,
  icon: IconField as FieldComponent,
  level: LevelField as FieldComponent,
  numberList: NumberListField as FieldComponent,
  buttonVariant: ButtonVariantField as FieldComponent,
  length: LengthField as FieldComponent,
  space: SpaceField as FieldComponent,
  width: WidthField as FieldComponent,
  background: BackgroundField as FieldComponent,
  columnsLayout: ColumnsLayoutField as FieldComponent,
  tableColumns: TableColumnsField as FieldComponent,
  media: MediaField as FieldComponent,
  mediaList: MediaListField as FieldComponent,
  focalPoint: FocalPointField as FieldComponent,
  link: LinkField as FieldComponent,
  heroMedia: HeroMediaField as FieldComponent,
  videoSource: VideoSourceField as FieldComponent,
  classes: ClassesField as FieldComponent,
};
