const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export interface SanitizeUrlOptions {
  /** Allow relative URLs (`/path`, `#anchor`, `?q`). Default: true. */
  allowRelative?: boolean;
  /** Allowed protocols. Default: http, https, mailto, tel. */
  protocols?: Iterable<string>;
}

/**
 * Returns a safe URL or `undefined`.
 * Blocks `javascript:`, `data:`, `vbscript:` and any other protocol outside the allow-list,
 * including obfuscated forms with whitespace or control characters.
 */
export function sanitizeUrl(input: unknown, options: SanitizeUrlOptions = {}): string | undefined {
  if (typeof input !== 'string') return undefined;
  const url = input.trim();
  if (url === '' || url.length > 2048) return undefined;
  // Control characters and whitespace inside the scheme are a classic bypass.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(url)) return undefined;

  const protocols = new Set(options.protocols ?? SAFE_PROTOCOLS);
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (scheme) {
    return protocols.has(`${scheme[1]!.toLowerCase()}:`) ? url : undefined;
  }
  if (options.allowRelative === false) return undefined;
  // Protocol-relative URLs (`//evil.com`) are treated as external and need an explicit scheme.
  if (url.startsWith('//') || url.startsWith('\\')) return undefined;
  return url;
}

export function isSafeUrl(input: unknown, options?: SanitizeUrlOptions): boolean {
  return sanitizeUrl(input, options) !== undefined;
}
