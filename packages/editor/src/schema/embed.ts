export const EMBED_PROVIDERS = [
  'youtube',
  'vimeo',
  'x',
  'instagram',
  'spotify',
  'google-maps',
  'codepen',
] as const;
export type EmbedProvider = (typeof EMBED_PROVIDERS)[number];

interface EmbedBase {
  provider: EmbedProvider;
  /** Provider-specific id of the resource. */
  id: string;
  /** Normalized public URL of the resource (used for "open on …" links and static previews). */
  canonicalUrl: string;
}

/** Providers that work with a plain iframe. */
export interface IframeEmbed extends EmbedBase {
  kind: 'iframe';
  /** URL safe to use as an iframe `src`. */
  embedUrl: string;
}

/**
 * Providers that require their own script (X, Instagram). The renderer builds the provider's
 * documented markup from `canonicalUrl` and loads `scriptUrl` only after consent (click) or when
 * the block enters the viewport. Script URLs are constants, never taken from document data.
 */
export interface ScriptEmbed extends EmbedBase {
  kind: 'script';
  provider: 'x' | 'instagram';
  scriptUrl: string;
}

export type EmbedInfo = IframeEmbed | ScriptEmbed;

export const EMBED_SCRIPTS = {
  x: 'https://platform.twitter.com/widgets.js',
  instagram: 'https://www.instagram.com/embed.js',
} as const;

type Matcher = (url: URL) => EmbedInfo | null;

const hostIs = (url: URL, ...hosts: string[]) => hosts.includes(url.hostname.replace(/^www\./, ''));
const ID = /^[\w-]+$/;

const matchers: Record<EmbedProvider, Matcher> = {
  youtube(url) {
    let id: string | null = null;
    if (hostIs(url, 'youtu.be')) id = url.pathname.slice(1);
    else if (hostIs(url, 'youtube.com', 'm.youtube.com', 'youtube-nocookie.com')) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else id = /^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1] ?? null;
    }
    if (!id || !ID.test(id)) return null;
    return {
      kind: 'iframe',
      provider: 'youtube',
      id,
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    };
  },
  vimeo(url) {
    if (!hostIs(url, 'vimeo.com', 'player.vimeo.com')) return null;
    const id = /\/(\d+)(?:\/|$)/.exec(url.pathname)?.[1];
    if (!id) return null;
    return {
      kind: 'iframe',
      provider: 'vimeo',
      id,
      canonicalUrl: `https://vimeo.com/${id}`,
      embedUrl: `https://player.vimeo.com/video/${id}`,
    };
  },
  x(url) {
    if (!hostIs(url, 'x.com', 'twitter.com', 'mobile.twitter.com')) return null;
    const match = /^\/(\w{1,15})\/status\/(\d{1,25})/.exec(url.pathname);
    if (!match) return null;
    const [, user, id] = match as unknown as [string, string, string];
    return {
      kind: 'script',
      provider: 'x',
      id,
      // widgets.js only recognizes twitter.com permalinks.
      canonicalUrl: `https://twitter.com/${user}/status/${id}`,
      scriptUrl: EMBED_SCRIPTS.x,
    };
  },
  instagram(url) {
    if (!hostIs(url, 'instagram.com')) return null;
    const match = /^\/(p|reel|tv)\/([\w-]{1,64})/.exec(url.pathname);
    if (!match) return null;
    const [, kind, id] = match as unknown as [string, string, string];
    return {
      kind: 'script',
      provider: 'instagram',
      id,
      canonicalUrl: `https://www.instagram.com/${kind}/${id}/`,
      scriptUrl: EMBED_SCRIPTS.instagram,
    };
  },
  spotify(url) {
    if (!hostIs(url, 'open.spotify.com')) return null;
    const match = /^\/(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/.exec(
      url.pathname,
    );
    if (!match) return null;
    const [, kind, id] = match as unknown as [string, string, string];
    return {
      kind: 'iframe',
      provider: 'spotify',
      id: `${kind}/${id}`,
      canonicalUrl: `https://open.spotify.com/${kind}/${id}`,
      embedUrl: `https://open.spotify.com/embed/${kind}/${id}`,
    };
  },
  'google-maps'(url) {
    // Only the official embed URLs are accepted (Share → Embed a map).
    if (!hostIs(url, 'google.com') || url.pathname !== '/maps/embed') return null;
    const pb = url.searchParams.get('pb');
    if (!pb) return null;
    const embedUrl = `https://www.google.com/maps/embed?pb=${encodeURIComponent(pb)}`;
    return { kind: 'iframe', provider: 'google-maps', id: pb, canonicalUrl: embedUrl, embedUrl };
  },
  codepen(url) {
    if (!hostIs(url, 'codepen.io')) return null;
    const match = /^\/([\w-]+)\/(?:pen|embed|full)\/([\w]+)/.exec(url.pathname);
    if (!match) return null;
    const [, user, id] = match as unknown as [string, string, string];
    return {
      kind: 'iframe',
      provider: 'codepen',
      id: `${user}/${id}`,
      canonicalUrl: `https://codepen.io/${user}/pen/${id}`,
      embedUrl: `https://codepen.io/${user}/embed/${id}?default-tab=result`,
    };
  },
};

/**
 * Parses a URL pasted by an editor into a safe embed descriptor.
 * Returns `null` for anything outside the provider allow-list.
 * Blocks store only the original URL; renderers call this again instead of trusting stored embed data.
 */
export function parseEmbedUrl(
  input: string,
  allowed: readonly EmbedProvider[] = EMBED_PROVIDERS,
): EmbedInfo | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  for (const provider of allowed) {
    const info = matchers[provider](url);
    if (info) return info;
  }
  return null;
}
