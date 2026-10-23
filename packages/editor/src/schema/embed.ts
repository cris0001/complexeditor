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

export interface EmbedInfo {
  provider: EmbedProvider;
  /** Provider-specific id of the resource. */
  id: string;
  /** URL safe to use as an iframe `src`. */
  embedUrl: string;
}

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
    return { provider: 'youtube', id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  },
  vimeo(url) {
    if (!hostIs(url, 'vimeo.com', 'player.vimeo.com')) return null;
    const id = /\/(\d+)(?:\/|$)/.exec(url.pathname)?.[1];
    return id ? { provider: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}` } : null;
  },
  x(url) {
    if (!hostIs(url, 'x.com', 'twitter.com', 'mobile.twitter.com')) return null;
    const id = /^\/[\w]+\/status\/(\d+)/.exec(url.pathname)?.[1];
    return id
      ? { provider: 'x', id, embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${id}` }
      : null;
  },
  instagram(url) {
    if (!hostIs(url, 'instagram.com')) return null;
    const match = /^\/(p|reel|tv)\/([\w-]+)/.exec(url.pathname);
    if (!match) return null;
    const [, kind, id] = match as unknown as [string, string, string];
    return { provider: 'instagram', id, embedUrl: `https://www.instagram.com/${kind}/${id}/embed` };
  },
  spotify(url) {
    if (!hostIs(url, 'open.spotify.com')) return null;
    const match = /^\/(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/.exec(
      url.pathname,
    );
    if (!match) return null;
    const [, kind, id] = match as unknown as [string, string, string];
    return {
      provider: 'spotify',
      id: `${kind}/${id}`,
      embedUrl: `https://open.spotify.com/embed/${kind}/${id}`,
    };
  },
  'google-maps'(url) {
    // Only the official embed URLs are accepted (Share → Embed a map).
    if (!hostIs(url, 'google.com') || url.pathname !== '/maps/embed') return null;
    const pb = url.searchParams.get('pb');
    if (!pb) return null;
    return {
      provider: 'google-maps',
      id: pb,
      embedUrl: `https://www.google.com/maps/embed?pb=${encodeURIComponent(pb)}`,
    };
  },
  codepen(url) {
    if (!hostIs(url, 'codepen.io')) return null;
    const match = /^\/([\w-]+)\/(?:pen|embed|full)\/([\w]+)/.exec(url.pathname);
    if (!match) return null;
    const [, user, id] = match as unknown as [string, string, string];
    return {
      provider: 'codepen',
      id: `${user}/${id}`,
      embedUrl: `https://codepen.io/${user}/embed/${id}?default-tab=result`,
    };
  },
};

/**
 * Parses a URL pasted by an editor into a safe embed descriptor.
 * Returns `null` for anything outside the provider allow-list.
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
