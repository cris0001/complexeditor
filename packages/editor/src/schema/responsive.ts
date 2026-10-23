/** Breakpoint keys, mobile-first. Pixel values come from the theme. */
export const BREAKPOINTS = ['base', 'sm', 'md', 'lg', 'xl'] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

/** Per-breakpoint values; each breakpoint inherits from the closest smaller one. */
export type ResponsiveObject<T> = Partial<Record<Breakpoint, T>>;

/** A plain value, or a set of values per breakpoint. */
export type Responsive<T> = T | ResponsiveObject<T>;

export function isResponsiveObject<T>(value: Responsive<T> | undefined): value is ResponsiveObject<T> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => (BREAKPOINTS as readonly string[]).includes(key));
}

/** Normalizes a responsive value into its per-breakpoint object form. */
export function toResponsiveObject<T>(value: Responsive<T> | undefined): ResponsiveObject<T> {
  if (value === undefined) return {};
  return isResponsiveObject(value) ? value : { base: value as T };
}

/** Resolves the effective value at a breakpoint, honoring mobile-first inheritance. */
export function resolveResponsive<T>(
  value: Responsive<T> | undefined,
  breakpoint: Breakpoint,
): T | undefined {
  const values = toResponsiveObject(value);
  for (let i = BREAKPOINTS.indexOf(breakpoint); i >= 0; i--) {
    const v = values[BREAKPOINTS[i] as Breakpoint];
    if (v !== undefined) return v;
  }
  return undefined;
}

/**
 * Sets (or clears, with `undefined`) the value at one breakpoint.
 * Collapses back to a plain value when only `base` remains.
 */
export function setResponsive<T>(
  value: Responsive<T> | undefined,
  breakpoint: Breakpoint,
  next: T | undefined,
): Responsive<T> | undefined {
  const values = { ...toResponsiveObject(value) };
  if (next === undefined) delete values[breakpoint];
  else values[breakpoint] = next;
  const keys = Object.keys(values) as Breakpoint[];
  if (keys.length === 0) return undefined;
  if (keys.length === 1 && keys[0] === 'base') return values.base;
  return values;
}
