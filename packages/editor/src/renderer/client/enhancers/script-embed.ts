import type { Enhancer } from '../Island';
import { combine, loadScript, on, whenVisible } from './dom';

/** Official provider scripts. Constants only: never taken from document data. */
const SCRIPTS = {
  x: 'https://platform.twitter.com/widgets.js',
  instagram: 'https://www.instagram.com/embed.js',
} as const;

declare global {
  interface Window {
    twttr?: { widgets?: { load: (element?: Element) => void } };
    instgrm?: { Embeds?: { process: () => void } };
  }
}

/**
 * X / Instagram embeds. The server renders the provider's documented `<blockquote>` (a static
 * link to the post); the script is loaded only after consent (click) or when visible.
 */
export const enhance: Enhancer = (root, options) => {
  const provider =
    options.provider === 'x' || options.provider === 'instagram' ? options.provider : undefined;
  if (!provider) return;
  const target = root.querySelector('.ce-embed__static');
  const consent = root.querySelector<HTMLElement>('.ce-embed__consent');
  let done = false;

  const load = () => {
    if (done) return;
    done = true;
    consent?.classList.add('ce-is-loading');
    loadScript(SCRIPTS[provider])
      .then(() => {
        if (provider === 'x') window.twttr?.widgets?.load(target ?? undefined);
        else window.instgrm?.Embeds?.process();
        root.classList.add('ce-is-loaded');
      })
      .catch(() => {
        done = false;
        consent?.classList.remove('ce-is-loading');
      });
  };

  const button = root.querySelector<HTMLButtonElement>('.ce-embed__button');
  return combine(
    button ? on(button, 'click', load) : undefined,
    options.loadOn === 'visible' ? whenVisible(root, load, '200px') : undefined,
  );
};
