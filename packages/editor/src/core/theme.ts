import type { LocalizedString } from '../schema/types';

export interface ThemeColor {
  value: string;
  /** Value in dark mode (defaults to `value`). */
  dark?: string;
  /** Readable text color on top of this color. */
  contrast?: string;
  darkContrast?: string;
  label?: LocalizedString;
}

export interface ThemeFont {
  /** CSS `font-family` value. */
  family: string;
  /** Google Fonts family spec, e.g. `Inter:wght@400;700`. Used by `themeFontLinks()`. */
  google?: string;
  /** Self-hosted font files (emitted as `@font-face`). */
  files?: { src: string; weight?: string; style?: string; format?: string }[];
  label?: LocalizedString;
}

/** Fluid size between `min` (at `fluid.minWidth`) and `max` (at `fluid.maxWidth`), in rem. */
export interface FluidSize {
  min: number;
  max: number;
}

export interface ThemeVariant {
  label: LocalizedString;
  description?: LocalizedString;
}

export interface Theme {
  name: string;
  fonts: Record<string, ThemeFont>;
  /** Text sizes, used by headings and paragraphs (`xs` … `5xl`). */
  typeScale: Record<string, FluidSize>;
  fluid: { minWidth: number; maxWidth: number };
  colors: Record<string, ThemeColor>;
  /** Spacing scale used by margin/padding/gap (`none`, `xs`, `s`, `m`, `l`, `xl`). */
  space: Record<'none' | 'xs' | 's' | 'm' | 'l' | 'xl', string>;
  radius: Record<'none' | 's' | 'm' | 'l', string>;
  border: Record<'none' | 's' | 'm' | 'l', string>;
  shadow: Record<'none' | 's' | 'm' | 'l', string>;
  /** Minimum widths in px (mobile-first). */
  breakpoints: Record<'sm' | 'md' | 'lg' | 'xl', number>;
  layout: { content: string; wide: string; gutter: string };
  /** Named style variants per block type (`*` = every block). Classes come from the `classNames` config. */
  variants: Record<string, Record<string, ThemeVariant>>;
  /** Button variants; colors are palette names. */
  buttons: Record<string, { label: LocalizedString; background: string; color: string; border?: string }>;
  /**
   * Dark mode strategy: `media` (prefers-color-scheme), `class` (selector on an ancestor, see
   * `darkSelector`) or `both`.
   */
  darkMode: 'media' | 'class' | 'both';
  darkSelector: string;
}

export const defaultTheme: Theme = {
  name: 'default',
  fonts: {
    body: {
      family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      label: { pl: 'Tekst', en: 'Body' },
    },
    heading: {
      family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      label: { pl: 'Nagłówki', en: 'Headings' },
    },
    serif: { family: 'Georgia, "Times New Roman", serif', label: { pl: 'Szeryfowa', en: 'Serif' } },
    mono: {
      family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      label: { pl: 'Kod', en: 'Code' },
    },
  },
  typeScale: {
    xs: { min: 0.75, max: 0.8125 },
    s: { min: 0.875, max: 0.9375 },
    m: { min: 1, max: 1.125 },
    l: { min: 1.125, max: 1.3125 },
    xl: { min: 1.25, max: 1.625 },
    '2xl': { min: 1.5, max: 2 },
    '3xl': { min: 1.75, max: 2.5 },
    '4xl': { min: 2.125, max: 3.25 },
    '5xl': { min: 2.5, max: 4.25 },
  },
  fluid: { minWidth: 320, maxWidth: 1280 },
  colors: {
    text: { value: '#1c1d21', dark: '#e9e9ee', label: { pl: 'Tekst', en: 'Text' } },
    muted: { value: '#5d6070', dark: '#a3a6b5', label: { pl: 'Przygaszony', en: 'Muted' } },
    background: { value: '#ffffff', dark: '#121317', label: { pl: 'Tło', en: 'Background' } },
    surface: { value: '#f4f4f7', dark: '#1d1f25', label: { pl: 'Powierzchnia', en: 'Surface' } },
    border: { value: '#dcdde3', dark: '#33353e', label: { pl: 'Obramowanie', en: 'Border' } },
    primary: {
      value: '#3b5bdb',
      dark: '#748ffc',
      contrast: '#ffffff',
      darkContrast: '#0b0d14',
      label: { pl: 'Główny', en: 'Primary' },
    },
    accent: {
      value: '#e8590c',
      dark: '#ff922b',
      contrast: '#ffffff',
      darkContrast: '#0b0d14',
      label: { pl: 'Akcent', en: 'Accent' },
    },
    info: { value: '#1971c2', dark: '#4dabf7', contrast: '#ffffff', label: { pl: 'Informacja', en: 'Info' } },
    success: {
      value: '#2f9e44',
      dark: '#69db7c',
      contrast: '#ffffff',
      label: { pl: 'Sukces', en: 'Success' },
    },
    warning: {
      value: '#e67700',
      dark: '#ffc078',
      contrast: '#ffffff',
      label: { pl: 'Uwaga', en: 'Warning' },
    },
    danger: { value: '#c92a2a', dark: '#ff8787', contrast: '#ffffff', label: { pl: 'Błąd', en: 'Danger' } },
    highlight: {
      value: '#fff3bf',
      dark: '#5c4a00',
      contrast: '#1c1d21',
      darkContrast: '#fff9db',
      label: { pl: 'Zakreślenie', en: 'Highlight' },
    },
  },
  space: { none: '0', xs: '0.5rem', s: '1rem', m: '1.75rem', l: '3rem', xl: '5rem' },
  radius: { none: '0', s: '0.25rem', m: '0.625rem', l: '1.25rem' },
  border: { none: '0', s: '1px', m: '2px', l: '4px' },
  shadow: {
    none: 'none',
    s: '0 1px 2px rgb(0 0 0 / 0.08), 0 1px 3px rgb(0 0 0 / 0.06)',
    m: '0 4px 12px rgb(0 0 0 / 0.1)',
    l: '0 12px 32px rgb(0 0 0 / 0.14)',
  },
  breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 },
  layout: { content: '42rem', wide: '72rem', gutter: '1.25rem' },
  variants: {},
  buttons: {
    primary: { label: { pl: 'Główny', en: 'Primary' }, background: 'primary', color: 'primary-contrast' },
    accent: { label: { pl: 'Akcent', en: 'Accent' }, background: 'accent', color: 'accent-contrast' },
    outline: {
      label: { pl: 'Obrys', en: 'Outline' },
      background: 'background',
      color: 'primary',
      border: 'primary',
    },
  },
  darkMode: 'both',
  darkSelector: '.dark, [data-theme="dark"]',
};

export type ThemeInput = Partial<Omit<Theme, 'layout' | 'breakpoints' | 'fluid' | 'space'>> & {
  layout?: Partial<Theme['layout']>;
  breakpoints?: Partial<Theme['breakpoints']>;
  fluid?: Partial<Theme['fluid']>;
  space?: Partial<Theme['space']>;
};

/** Creates a theme on top of the defaults. Records (colors, fonts…) are merged key by key. */
export function defineTheme(input: ThemeInput, base: Theme = defaultTheme): Theme {
  return {
    ...base,
    ...input,
    fonts: { ...base.fonts, ...input.fonts },
    typeScale: { ...base.typeScale, ...input.typeScale },
    colors: { ...base.colors, ...input.colors },
    space: { ...base.space, ...input.space },
    radius: { ...base.radius, ...input.radius },
    border: { ...base.border, ...input.border },
    shadow: { ...base.shadow, ...input.shadow },
    breakpoints: { ...base.breakpoints, ...input.breakpoints },
    layout: { ...base.layout, ...input.layout },
    fluid: { ...base.fluid, ...input.fluid },
    variants: { ...base.variants, ...input.variants },
    buttons: { ...base.buttons, ...input.buttons },
  };
}

const round = (n: number) => Math.round(n * 10000) / 10000;

/** `clamp()` that grows linearly with the width of the document container (falls back to the viewport). */
export function fluidClamp({ min, max }: FluidSize, { minWidth, maxWidth }: Theme['fluid']): string {
  if (min === max) return `${min}rem`;
  const minRem = minWidth / 16;
  const maxRem = maxWidth / 16;
  const slope = (max - min) / (maxRem - minRem);
  const intercept = min - slope * minRem;
  return `clamp(${min}rem, ${round(intercept)}rem + ${round(slope * 100)}cqi, ${max}rem)`;
}

/** CSS custom property name of a palette color. */
export const colorVar = (name: string) => `--ce-color-${name}`;

function colorDeclarations(theme: Theme, dark: boolean): string[] {
  const lines: string[] = [];
  for (const [name, color] of Object.entries(theme.colors)) {
    const value = dark ? (color.dark ?? color.value) : color.value;
    if (dark && value === color.value && !color.darkContrast) continue;
    lines.push(`${colorVar(name)}: ${value};`);
    const contrast = dark ? (color.darkContrast ?? color.contrast) : color.contrast;
    if (contrast) lines.push(`${colorVar(`${name}-contrast`)}: ${contrast};`);
  }
  return lines;
}

/**
 * Theme as CSS custom properties (`--ce-*`) inside `@layer ce.theme`.
 * Projects override single values with unlayered CSS, which always wins.
 */
export function themeToCss(
  theme: Theme = defaultTheme,
  { selector = ':root' }: { selector?: string } = {},
): string {
  const decl: string[] = [];
  for (const [name, font] of Object.entries(theme.fonts)) decl.push(`--ce-font-${name}: ${font.family};`);
  for (const [name, size] of Object.entries(theme.typeScale))
    decl.push(`--ce-text-${name}: ${fluidClamp(size, theme.fluid)};`);
  decl.push(...colorDeclarations(theme, false));
  for (const [name, value] of Object.entries(theme.space)) decl.push(`--ce-space-${name}: ${value};`);
  for (const [name, value] of Object.entries(theme.radius)) decl.push(`--ce-radius-${name}: ${value};`);
  for (const [name, value] of Object.entries(theme.border)) decl.push(`--ce-border-${name}: ${value};`);
  for (const [name, value] of Object.entries(theme.shadow)) decl.push(`--ce-shadow-${name}: ${value};`);
  for (const [name, value] of Object.entries(theme.breakpoints))
    decl.push(`--ce-breakpoint-${name}: ${value}px;`);
  decl.push(`--ce-content-width: ${theme.layout.content};`);
  decl.push(`--ce-wide-width: ${theme.layout.wide};`);
  decl.push(`--ce-gutter: ${theme.layout.gutter};`);
  for (const [name, button] of Object.entries(theme.buttons)) {
    decl.push(`--ce-button-${name}-bg: var(${colorVar(button.background)});`);
    decl.push(`--ce-button-${name}-fg: var(${colorVar(button.color)});`);
    decl.push(`--ce-button-${name}-border: var(${colorVar(button.border ?? button.background)});`);
  }

  const css: string[] = [];
  for (const font of Object.values(theme.fonts)) {
    const family = font.family.split(',')[0]!.trim();
    for (const file of font.files ?? []) {
      const format = file.format ? ` format("${file.format}")` : '';
      css.push(
        `@font-face { font-family: ${family}; src: url("${file.src}")${format}; font-weight: ${file.weight ?? 'normal'}; font-style: ${file.style ?? 'normal'}; font-display: swap; }`,
      );
    }
  }
  const dark = colorDeclarations(theme, true).join(' ');
  const body = [`${selector} { ${decl.join(' ')} }`];
  if (dark && theme.darkMode !== 'class') {
    body.push(`@media (prefers-color-scheme: dark) { ${selector}:not([data-theme="light"]) { ${dark} } }`);
  }
  if (dark && theme.darkMode !== 'media') {
    // The dark selector may sit on the themed element itself or on any ancestor.
    const selectors = theme.darkSelector
      .split(',')
      .map((s) => s.trim())
      .flatMap((s) => (selector === ':root' ? [s] : [`${s} ${selector}`, `${s}${selector}`]));
    body.push(`${selectors.join(', ')} { ${dark} }`);
  }
  return `${css.join('\n')}${css.length ? '\n' : ''}@layer ce.theme {\n${body.join('\n')}\n}\n`;
}

/** `<link>` URLs for the theme's Google Fonts. */
export function themeFontLinks(theme: Theme): string[] {
  const families = Object.values(theme.fonts)
    .map((font) => font.google)
    .filter((g): g is string => Boolean(g));
  if (!families.length) return [];
  const query = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`).join('&');
  return [`https://fonts.googleapis.com/css2?${query}&display=swap`];
}
