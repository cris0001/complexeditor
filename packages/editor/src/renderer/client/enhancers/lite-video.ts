import type { Enhancer } from '../Island';
import { combine, on, whenVisible } from './dom';

/**
 * Click-to-load iframe (lite YouTube/Vimeo and iframe embeds). Nothing from the provider is
 * requested until the reader clicks (or, with `autoload`, until the block is visible).
 * The iframe URL was produced on the server by `parseEmbedUrl` from an allow-listed provider.
 */
export const enhance: Enhancer = (root, options) => {
  const frame = root.querySelector<HTMLElement>('.ce-video__frame, .ce-embed__frame');
  const src = typeof options.src === 'string' ? options.src : '';
  if (!frame || !/^https:\/\//.test(src)) return;
  let iframe: HTMLIFrameElement | undefined;

  const load = (autoplay: boolean) => {
    if (iframe) return;
    iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = String(options.title ?? '');
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    if (options.lazy) iframe.loading = 'lazy';
    iframe.className = 'ce-iframe';
    // React owns the placeholder; hide it with a class instead of removing nodes.
    frame.classList.add('ce-is-loaded');
    frame.appendChild(iframe);
    if (autoplay) iframe.focus();
  };

  const trigger = frame.querySelector<HTMLElement>('.ce-video__play, .ce-embed__button');
  return combine(
    trigger
      ? on(trigger, 'click', (event) => {
          event.preventDefault();
          load(true);
        })
      : undefined,
    options.autoload ? whenVisible(root, () => load(false), '200px') : undefined,
    () => {
      iframe?.remove();
      frame.classList.remove('ce-is-loaded');
    },
  );
};
