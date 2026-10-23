import type { Breakpoint } from '../schema/responsive';
import { defaultTheme, type Theme } from './theme';

/**
 * A responsive setting expressed as classes + custom properties.
 *
 * - `var`: value lives in `--ce-{bp-}{key}`; class `ce-{bp-}{key}` applies `declarations`
 *   with `$` replaced by `var(--ce-{bp-}{key})`.
 * - `enum`: class `ce-{bp-}{key}-{value}` applies the declarations of that value.
 *
 * Classes are only present for breakpoints the editor actually set, so nested blocks never pick up
 * a parent's custom properties and unset breakpoints fall back to the block's default CSS.
 */
export type ResponsiveRule =
  | { kind: 'var'; key: string; declarations: string; target?: string }
  | { kind: 'enum'; key: string; values: Record<string, string>; target?: string }
  | {
      kind: 'custom';
      key: string;
      /** Returns CSS for one breakpoint; `cls(value)` is the class selector, `v` the custom property. */
      css: (cls: (value?: string) => string, v: string) => string;
    };

export type ResponsiveMode = 'container' | 'media';

/** Name of the container established by `.ce-document`. */
export const DOCUMENT_CONTAINER = 'ce-doc';

/** Class / custom-property prefix for a breakpoint (`''` for base). */
export const bpPrefix = (bp: Breakpoint) => (bp === 'base' ? '' : `${bp}-`);

export function responsiveClass(key: string, bp: Breakpoint, value?: string): string {
  return `ce-${bpPrefix(bp)}${key}${value === undefined ? '' : `-${value}`}`;
}

export function responsiveVar(key: string, bp: Breakpoint): `--${string}` {
  return `--ce-${bpPrefix(bp)}${key}`;
}

/** Responsive rules for the common style panel (spec §6). */
export const STYLE_RULES: readonly ResponsiveRule[] = [
  { kind: 'var', key: 'mt', declarations: 'margin-block-start: $;' },
  { kind: 'var', key: 'mb', declarations: 'margin-block-end: $;' },
  { kind: 'var', key: 'ml', declarations: 'margin-inline-start: $;' },
  { kind: 'var', key: 'mr', declarations: 'margin-inline-end: $;' },
  { kind: 'var', key: 'pt', declarations: 'padding-block-start: $;' },
  { kind: 'var', key: 'pb', declarations: 'padding-block-end: $;' },
  { kind: 'var', key: 'pl', declarations: 'padding-inline-start: $;' },
  { kind: 'var', key: 'pr', declarations: 'padding-inline-end: $;' },
  {
    kind: 'enum',
    key: 'w',
    values: {
      normal: 'grid-column: content; inline-size: auto; justify-self: stretch;',
      wide: 'grid-column: wide; inline-size: auto; justify-self: stretch;',
      full: 'grid-column: full; inline-size: auto; justify-self: stretch;',
      custom:
        'grid-column: full; justify-self: center; inline-size: min(100% - 2 * var(--ce-gutter), var(--ce-w-max-active));',
    },
  },
  { kind: 'var', key: 'w-max', declarations: '--ce-w-max-active: $;' },
  {
    kind: 'enum',
    key: 'align',
    values: { left: 'text-align: start;', center: 'text-align: center;', right: 'text-align: end;' },
  },
];

const BREAKPOINT_KEYS = ['sm', 'md', 'lg', 'xl'] as const;

function query(mode: ResponsiveMode, condition: string): string {
  return mode === 'container' ? `@container ${DOCUMENT_CONTAINER} ${condition}` : `@media ${condition}`;
}

function ruleCss(rule: ResponsiveRule, bp: Breakpoint): string {
  if (rule.kind === 'custom') {
    return rule.css(
      (value) => `.${responsiveClass(rule.key, bp, value)}`,
      `var(${responsiveVar(rule.key, bp)})`,
    );
  }
  const target = rule.target ?? '';
  if (rule.kind === 'var') {
    const decl = rule.declarations.replaceAll('$', `var(${responsiveVar(rule.key, bp)})`);
    return `.${responsiveClass(rule.key, bp)}${target} { ${decl} }`;
  }
  return Object.entries(rule.values)
    .map(([value, decl]) => `.${responsiveClass(rule.key, bp, value)}${target} { ${decl} }`)
    .join('\n');
}

export interface ResponsiveCssOptions {
  theme?: Pick<Theme, 'breakpoints'>;
  mode?: ResponsiveMode;
  rules?: readonly ResponsiveRule[];
}

/**
 * Generates the responsive part of the stylesheet (in `@layer ce.style`).
 * The shipped `styles.css` contains it for the default breakpoints in container mode; call this
 * yourself only for custom breakpoints or media-query mode.
 */
export function responsiveCss({
  theme = defaultTheme,
  mode = 'container',
  rules = STYLE_RULES,
}: ResponsiveCssOptions = {}): string {
  const out: string[] = [];
  out.push(rules.map((rule) => ruleCss(rule, 'base')).join('\n'));
  for (const bp of BREAKPOINT_KEYS) {
    const min = theme.breakpoints[bp];
    out.push(
      `${query(mode, `(min-width: ${min}px)`)} {\n${rules.map((rule) => ruleCss(rule, bp)).join('\n')}\n}`,
    );
  }
  // Device visibility: mobile < md ≤ tablet < lg ≤ desktop.
  const { md, lg } = theme.breakpoints;
  out.push(`${query(mode, `(max-width: ${md - 0.02}px)`)} { .ce-hide-mobile { display: none; } }`);
  out.push(
    `${query(mode, `(min-width: ${md}px) and (max-width: ${lg - 0.02}px)`)} { .ce-hide-tablet { display: none; } }`,
  );
  out.push(`${query(mode, `(min-width: ${lg}px)`)} { .ce-hide-desktop { display: none; } }`);
  return `@layer ce.style {\n${out.join('\n')}\n}\n`;
}
