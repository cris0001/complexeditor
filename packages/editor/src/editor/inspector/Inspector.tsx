import {
  resolveResponsive,
  setResponsive,
  toResponsiveObject,
  type Breakpoint,
} from '../../schema/responsive';
import type { Animation, Block, BlockStyle } from '../../schema/types';
import type { InspectorField } from '../../core/types';
import type { EditorMessageKey } from '../../i18n/editor-messages';
import { useDocument, useEditor, useEditorState } from '../context';
import { findBlock } from '../state/operations';
import { getBlockField, setBlockField } from '../state/paths';
import type { Device } from '../state/store';
import { UiIcon } from '../ui/icons';
import { FieldRow, NumberInput, Segmented, Select, Toggle } from './controls';
import { BUILTIN_FIELDS, type FieldComponent, type FieldProps } from './fields';

/** The breakpoint edited for each preview device. */
export const DEVICE_BREAKPOINT: Record<Device, Breakpoint> = { mobile: 'base', tablet: 'md', desktop: 'lg' };

type StyleField = InspectorField & { labelKey?: EditorMessageKey };

const STYLE_BASIC: StyleField[] = [
  { type: 'space', name: 'style.margin.top', labelKey: 'marginTop', responsive: true },
  { type: 'space', name: 'style.margin.bottom', labelKey: 'marginBottom', responsive: true },
  { type: 'width', name: 'style.width', labelKey: 'width', responsive: true },
  { type: 'align', name: 'style.align', labelKey: 'alignment', responsive: true },
  { type: 'background', name: 'style.background', labelKey: 'background' },
  { type: 'level', name: 'style.radius', labelKey: 'radius' },
  { type: 'level', name: 'style.border', labelKey: 'border' },
  { type: 'level', name: 'style.shadow', labelKey: 'shadow' },
  { type: 'variant', name: 'style.variant', labelKey: 'variant' },
];

const STYLE_ADVANCED: StyleField[] = [
  { type: 'space', name: 'style.margin.left', labelKey: 'marginLeft', responsive: true },
  { type: 'space', name: 'style.margin.right', labelKey: 'marginRight', responsive: true },
  { type: 'space', name: 'style.padding.top', labelKey: 'paddingTop', responsive: true },
  { type: 'space', name: 'style.padding.bottom', labelKey: 'paddingBottom', responsive: true },
  { type: 'space', name: 'style.padding.left', labelKey: 'paddingLeft', responsive: true },
  { type: 'space', name: 'style.padding.right', labelKey: 'paddingRight', responsive: true },
  { type: 'animation', name: 'style.animation', labelKey: 'animation' },
  { type: 'visibility', name: 'style.hidden', labelKey: 'visibility' },
  { type: 'anchor', name: 'style.anchor', labelKey: 'anchor' },
  { type: 'classes', name: 'style.className', labelKey: 'cssClass' },
];

// ---------------------------------------------------------------------------------------------
// Style-only field types
// ---------------------------------------------------------------------------------------------

function VariantField({ value, onChange, label, block }: FieldProps<string>) {
  const { props, label: localize } = useEditor();
  const variants = { ...props.theme?.variants['*'], ...props.theme?.variants[block.type] };
  const entries = Object.entries(variants);
  if (!entries.length) return null;
  return (
    <Select
      value={value}
      onChange={onChange}
      label={label}
      options={entries.map(([name, v]) => ({ value: name, label: localize(v.label, name) }))}
    />
  );
}

function AnimationField({ value, onChange, label }: FieldProps<Animation>) {
  const { t } = useEditor();
  return (
    <div className="ce-ed-stack">
      <Segmented<Animation['type']>
        value={value?.type}
        allowEmpty
        label={label}
        onChange={(type) => onChange(type ? { ...value, type } : undefined)}
        options={[
          { value: 'fade', label: t('animationFade') },
          { value: 'slide', label: t('animationSlide') },
          { value: 'zoom', label: t('animationZoom') },
        ]}
      />
      {value?.type === 'slide' && (
        <Segmented<NonNullable<Animation['direction']>>
          value={value.direction ?? 'up'}
          label={t('direction')}
          onChange={(direction) => onChange({ ...value, direction })}
          options={[
            { value: 'up', label: t('directionUp') },
            { value: 'down', label: t('directionDown') },
            { value: 'left', label: t('directionLeft') },
            { value: 'right', label: t('directionRight') },
          ]}
        />
      )}
      {value && (
        <NumberInput
          value={value.delay}
          min={0}
          max={5000}
          step={100}
          label={t('delay')}
          onChange={(delay) => onChange({ ...value, delay })}
        />
      )}
    </div>
  );
}

function VisibilityField({ value, onChange }: FieldProps<BlockStyle['hidden']>) {
  const { t } = useEditor();
  const set = (key: 'mobile' | 'tablet' | 'desktop', on: boolean) => {
    const next = { ...value, [key]: on || undefined };
    onChange(Object.values(next).some(Boolean) ? next : undefined);
  };
  return (
    <div className="ce-ed-stack">
      <Toggle
        checked={Boolean(value?.mobile)}
        label={t('hideOnMobile')}
        onChange={(on) => set('mobile', on)}
      />
      <Toggle
        checked={Boolean(value?.tablet)}
        label={t('hideOnTablet')}
        onChange={(on) => set('tablet', on)}
      />
      <Toggle
        checked={Boolean(value?.desktop)}
        label={t('hideOnDesktop')}
        onChange={(on) => set('desktop', on)}
      />
    </div>
  );
}

const STYLE_FIELD_TYPES: Record<string, FieldComponent> = {
  variant: VariantField as FieldComponent,
  animation: AnimationField as FieldComponent,
  visibility: VisibilityField as FieldComponent,
};

// ---------------------------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------------------------

export function Inspector() {
  const { t, store, registry, permissions, blockName, props } = useEditor();
  const doc = useDocument();
  const selection = useEditorState((s) => s.selection);
  const tab = useEditorState((s) => s.inspectorTab);
  const location = selection ? findBlock(doc, selection) : undefined;
  const block = location?.block;
  const def = block ? registry.get(block.type) : undefined;
  const activeTab = permissions.advanced ? tab : 'basic';

  if (!block || !def) {
    return (
      <aside className="ce-ed-inspector" aria-label={t('inspector')}>
        <p className="ce-ed-muted ce-ed-inspector__empty">{t('noSelection')}</p>
      </aside>
    );
  }

  const visible = (field: InspectorField) => permissions.fields?.(block.type, field.name) !== false;
  const blockFields = (def.inspector ?? []).filter(visible);
  const ownNames = new Set(blockFields.map((f) => f.name));
  const styleFields = (list: StyleField[]) =>
    list
      .filter((f) => !ownNames.has(f.name) && visible(f))
      .filter((f) => f.name !== 'style.className' || permissions.customClasses !== false);
  const slotFields: StyleField[] =
    permissions.slotClasses || props.tailwind
      ? def.slots.map((slot) => ({
          type: props.tailwind ? 'tailwindClasses' : 'classes',
          name: `classes.${slot}`,
          label: { en: slot, pl: slot },
        }))
      : [];

  const basic = blockFields.filter((f) => !f.advanced);
  const advanced = blockFields.filter((f) => f.advanced);

  return (
    <aside className="ce-ed-inspector" aria-label={t('inspector')}>
      <header className="ce-ed-inspector__header">
        <UiIcon name={typeof def.icon === 'string' ? def.icon : undefined} />
        <h2>{blockName(block.type)}</h2>
        {block.untranslated && <span className="ce-ed-badge ce-ed-badge--warning">!</span>}
      </header>
      {permissions.advanced && (
        <div className="ce-ed-tabs" role="tablist">
          {(['basic', 'advanced'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={activeTab === value}
              className="ce-ed-tabs__tab"
              onClick={() => store.set({ inspectorTab: value })}
            >
              {t(value)}
            </button>
          ))}
        </div>
      )}
      <div className="ce-ed-inspector__body" role="tabpanel">
        {activeTab === 'basic' ? (
          <>
            <FieldList fields={basic} block={block} />
            <details className="ce-ed-section" open>
              <summary>{t('style')}</summary>
              <FieldList fields={styleFields(STYLE_BASIC)} block={block} />
            </details>
          </>
        ) : (
          <>
            <FieldList fields={advanced} block={block} />
            <details className="ce-ed-section" open>
              <summary>{t('style')}</summary>
              <FieldList fields={styleFields(STYLE_ADVANCED)} block={block} />
            </details>
            {slotFields.length > 0 && (
              <details className="ce-ed-section" open>
                <summary>{props.tailwind ? t('tailwindClasses') : t('slotClasses')}</summary>
                <FieldList fields={slotFields} block={block} />
              </details>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function FieldList({ fields, block }: { fields: StyleField[]; block: Block }) {
  return (
    <div className="ce-ed-fields">
      {fields.map((field) => (
        <Field key={field.name} field={field} block={block} />
      ))}
    </div>
  );
}

function Field({ field, block }: { field: StyleField; block: Block }) {
  const { t, label: localize, actions, registry, props: editorProps, store } = useEditor();
  const device = useEditorState((s) => s.device);
  const def = registry.get(block.type);
  const merged = { ...def?.defaultProps, ...block.props };
  if (field.when && !field.when(merged)) return null;

  const Component =
    editorProps.fields?.[field.type] ?? STYLE_FIELD_TYPES[field.type] ?? BUILTIN_FIELDS[field.type];
  if (!Component) return null;

  const label = field.labelKey ? t(field.labelKey) : localize(field.label, field.name);
  const isStyle = field.name.startsWith('style.') || field.name.startsWith('classes.');
  const raw = isStyle
    ? getBlockField(block, field.name)
    : getBlockField({ ...block, props: merged }, field.name);
  const bp = DEVICE_BREAKPOINT[device];
  const set = (value: unknown) =>
    actions.update(block.id, (b) => setBlockField(b, field.name, value), `field:${block.id}:${field.name}`);

  let value = raw;
  let onChange = set;
  let extra = null;
  if (field.responsive) {
    value = resolveResponsive(raw as never, bp);
    onChange = (next: unknown) => set(setResponsive(raw as never, bp, next as never));
    const setHere = toResponsiveObject(raw as never)[bp] !== undefined;
    extra = (
      <span className="ce-ed-field__responsive">
        {(['mobile', 'tablet', 'desktop'] as const).map((d) => (
          <button
            key={d}
            type="button"
            className="ce-ed-field__device"
            aria-pressed={d === device}
            aria-label={t(
              d === 'mobile' ? 'deviceMobile' : d === 'tablet' ? 'deviceTablet' : 'deviceDesktop',
            )}
            onClick={() => store.set({ device: d })}
          >
            <UiIcon name={d} size={12} />
            {toResponsiveObject(raw as never)[DEVICE_BREAKPOINT[d]] !== undefined && (
              <span className="ce-ed-dot" aria-hidden="true" />
            )}
          </button>
        ))}
        {setHere ? (
          <button
            type="button"
            className="ce-ed-field__reset"
            title={t('resetToInherited')}
            aria-label={t('resetToInherited')}
            onClick={() => set(setResponsive(raw as never, bp, undefined))}
          >
            ↺
          </button>
        ) : (
          <span className="ce-ed-field__inherited">{t('inherited')}</span>
        )}
      </span>
    );
  } else if (raw !== undefined && isStyle) {
    extra = (
      <button
        type="button"
        className="ce-ed-field__reset"
        title={t('reset')}
        aria-label={t('reset')}
        onClick={() => set(undefined)}
      >
        ↺
      </button>
    );
  }

  return (
    <FieldRow label={label} extra={extra}>
      <Component
        field={field}
        value={value as never}
        onChange={onChange as never}
        block={block}
        label={label}
      />
    </FieldRow>
  );
}
