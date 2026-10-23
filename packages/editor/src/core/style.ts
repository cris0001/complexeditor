import { BREAKPOINTS, toResponsiveObject, type Breakpoint, type Responsive } from '../schema/responsive';
import { sanitizeUrl } from '../schema/url';
import type { BlockStyle, SpaceValue } from '../schema/types';
import { colorVar } from './theme';
import { responsiveClass, responsiveVar } from './responsive-css';

export interface StyleAttributes {
  classes: string[];
  vars: Record<`--${string}`, string>;
}

export const spaceToCss = (value: SpaceValue): string =>
  typeof value === 'string' ? `var(--ce-space-${value})` : value.custom;

/** `var(--ce-color-x)` for a palette color name. */
export const colorToCss = (name: string): string => `var(${colorVar(name)})`;

/** Quotes a URL for use inside `url("…")` in a custom property. Returns undefined for unsafe URLs. */
export function cssUrl(url: string): string | undefined {
  const safe = sanitizeUrl(url);
  if (!safe) return undefined;
  return `url("${safe.replace(/["\\\n\r]/g, (c) => encodeURIComponent(c))}")`;
}

/**
 * Adds classes and custom properties for a responsive value.
 * `toVar` turns a value into a CSS value (var rules); omit it for enum rules (value becomes a class suffix).
 */
export function addResponsive<T>(
  out: StyleAttributes,
  key: string,
  value: Responsive<T> | undefined,
  toVar?: (value: T, bp: Breakpoint) => string | undefined,
): void {
  const values = toResponsiveObject(value);
  for (const bp of BREAKPOINTS) {
    const v = values[bp];
    if (v === undefined) continue;
    if (toVar) {
      const css = toVar(v, bp);
      if (css === undefined) continue;
      out.classes.push(responsiveClass(key, bp));
      out.vars[responsiveVar(key, bp)] = css;
    } else {
      out.classes.push(responsiveClass(key, bp, String(v)));
    }
  }
}

const SIDES = [
  ['top', 't'],
  ['bottom', 'b'],
  ['left', 'l'],
  ['right', 'r'],
] as const;

/** Translates common block style settings into classes and `--ce-*` custom properties. */
export function styleToAttributes(style: BlockStyle | undefined): StyleAttributes {
  const out: StyleAttributes = { classes: [], vars: {} };
  if (!style) return out;

  for (const [box, prefix] of [
    [style.margin, 'm'],
    [style.padding, 'p'],
  ] as const) {
    if (!box) continue;
    for (const [side, letter] of SIDES) addResponsive(out, `${prefix}${letter}`, box[side], spaceToCss);
  }

  if (style.width !== undefined) {
    const values = toResponsiveObject(style.width);
    addResponsive(
      out,
      'w',
      Object.fromEntries(
        Object.entries(values).map(([bp, v]) => [bp, typeof v === 'string' ? v : 'custom']),
      ) as Responsive<string>,
    );
    addResponsive(
      out,
      'w-max',
      Object.fromEntries(
        Object.entries(values)
          .filter(([, v]) => typeof v === 'object')
          .map(([bp, v]) => [bp, (v as { max: string }).max]),
      ) as Responsive<string>,
      (v) => v,
    );
  }

  addResponsive(out, 'align', style.align);

  const bg = style.background;
  if (bg) {
    out.classes.push('ce-bg', `ce-bg-${bg.type}`);
    if (bg.type === 'color') {
      out.vars['--ce-bg'] = colorToCss(bg.color);
      out.vars['--ce-bg-fg'] = `var(${colorVar(`${bg.color}-contrast`)})`;
    } else if (bg.type === 'gradient') {
      out.vars['--ce-bg-from'] = colorToCss(bg.from);
      out.vars['--ce-bg-to'] = colorToCss(bg.to);
      if (bg.angle !== undefined) out.vars['--ce-bg-angle'] = `${bg.angle}deg`;
    } else {
      const url = cssUrl(bg.src);
      if (url) out.vars['--ce-bg-image'] = url;
      if (bg.overlay !== undefined) out.vars['--ce-bg-overlay'] = String(bg.overlay);
      if (bg.focalPoint) out.vars['--ce-bg-position'] = `${bg.focalPoint.x * 100}% ${bg.focalPoint.y * 100}%`;
    }
  }

  if (style.radius) out.classes.push(`ce-radius-${style.radius}`);
  if (style.border) out.classes.push(`ce-border-${style.border}`);
  if (style.shadow) out.classes.push(`ce-shadow-${style.shadow}`);

  if (style.animation) {
    const { type, direction, delay } = style.animation;
    out.classes.push('ce-anim', `ce-anim-${type}`);
    if (type === 'slide') out.classes.push(`ce-anim-from-${direction ?? 'up'}`);
    if (delay) out.vars['--ce-anim-delay'] = `${delay}ms`;
  }

  if (style.hidden?.mobile) out.classes.push('ce-hide-mobile');
  if (style.hidden?.tablet) out.classes.push('ce-hide-tablet');
  if (style.hidden?.desktop) out.classes.push('ce-hide-desktop');

  if (style.variant) out.classes.push(`ce-variant-${style.variant}`);
  return out;
}
