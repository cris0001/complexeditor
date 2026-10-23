import { useEffect, useRef } from 'react';

/** Serializable options passed from the server render to an enhancer. */
export type IslandOptions = Record<string, string | number | boolean | null | undefined>;

/** Attaches behavior to server-rendered markup and returns a cleanup function. */
export type Enhancer = (root: HTMLElement, options: IslandOptions) => (() => void) | void;

// Each enhancer is a separate chunk, loaded only when a block that needs it is on the page.
const loaders = {
  animations: () => import('./enhancers/animations'),
  slider: () => import('./enhancers/slider'),
  lightbox: () => import('./enhancers/lightbox'),
  tabs: () => import('./enhancers/tabs'),
  counter: () => import('./enhancers/counter'),
  'before-after': () => import('./enhancers/before-after'),
  copy: () => import('./enhancers/copy'),
  'lite-video': () => import('./enhancers/lite-video'),
  'script-embed': () => import('./enhancers/script-embed'),
  parallax: () => import('./enhancers/parallax'),
} satisfies Record<string, () => Promise<{ enhance: Enhancer }>>;

export type IslandName = keyof typeof loaders;

export interface IslandProps {
  name: IslandName;
  options?: IslandOptions;
}

/**
 * Client island: renders an invisible marker and enhances the marker's parent element.
 * The server already rendered complete, usable HTML; the island only adds interactivity.
 */
export function Island({ name, options = {} }: IslandProps) {
  const marker = useRef<HTMLSpanElement>(null);
  const serialized = JSON.stringify(options);

  useEffect(() => {
    const root = marker.current?.parentElement;
    if (!root) return;
    let cleanup: (() => void) | void;
    let cancelled = false;
    loaders[name]()
      .then(({ enhance }) => {
        if (cancelled) return;
        root.classList.add('ce-is-enhanced');
        cleanup = enhance(root, JSON.parse(serialized) as IslandOptions);
      })
      .catch((error: unknown) => console.error(`[complexeditor] Failed to load "${name}" island`, error));
    return () => {
      cancelled = true;
      cleanup?.();
      root.classList.remove('ce-is-enhanced');
    };
  }, [name, serialized]);

  return <span ref={marker} hidden className="ce-island" data-ce-island={name} />;
}
