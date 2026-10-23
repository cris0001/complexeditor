import type { Enhancer, IslandOptions } from '../Island';
import { on, prefersReducedMotion } from './dom';

interface Item {
  src: string;
  alt: string;
  caption?: string;
}

/**
 * Lightbox for every `[data-ce-lightbox]` link inside the block. Uses a native modal `<dialog>`
 * (focus trap, Esc, inert background), with swipe, zoom (button, double click, pinch-like wheel),
 * counter and keyboard navigation. Without JavaScript the links open the full image.
 */
export const enhance: Enhancer = (root, options) => {
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[data-ce-lightbox]'));
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;
  const items: Item[] = links.map((link) => ({
    src: link.href,
    alt: link.querySelector('img')?.alt ?? '',
    caption: link.dataset.ceCaption,
  }));
  const labels = readLabels(options);

  let dialog: HTMLDialogElement | undefined;
  let index = 0;
  let zoomed = false;
  let opener: HTMLElement | null = null;

  function build(): HTMLDialogElement {
    const el = document.createElement('dialog');
    el.className = 'ce-lightbox';
    el.setAttribute('aria-label', labels.gallery);
    el.innerHTML = `
      <figure class="ce-lightbox__figure">
        <div class="ce-lightbox__stage"><img class="ce-lightbox__img" alt="" /></div>
        <figcaption class="ce-lightbox__caption"></figcaption>
      </figure>
      <p class="ce-lightbox__counter" aria-live="polite"></p>
      <div class="ce-lightbox__toolbar">
        <button type="button" class="ce-lightbox__button" data-action="zoom"></button>
        <button type="button" class="ce-lightbox__button" data-action="close"></button>
      </div>
      <button type="button" class="ce-lightbox__button ce-lightbox__nav ce-lightbox__nav--prev" data-action="prev"></button>
      <button type="button" class="ce-lightbox__button ce-lightbox__nav ce-lightbox__nav--next" data-action="next"></button>`;
    const set = (action: string, label: string, glyph: string) => {
      const button = el.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
      button.setAttribute('aria-label', label);
      button.textContent = glyph;
    };
    set('close', labels.close, '×');
    set('zoom', labels.zoomIn, '+');
    set('prev', labels.previousImage, '‹');
    set('next', labels.nextImage, '›');
    if (items.length < 2)
      el.querySelectorAll('.ce-lightbox__nav, .ce-lightbox__counter').forEach((n) => n.remove());
    document.body.appendChild(el);
    return el;
  }

  function show(i: number) {
    if (!dialog) return;
    index = (i + items.length) % items.length;
    const item = items[index]!;
    const img = dialog.querySelector<HTMLImageElement>('.ce-lightbox__img')!;
    img.src = item.src;
    img.alt = item.alt;
    dialog.querySelector('.ce-lightbox__caption')!.textContent = item.caption ?? '';
    const counter = dialog.querySelector('.ce-lightbox__counter');
    if (counter)
      counter.textContent = labels.imageOf
        .replace('{n}', String(index + 1))
        .replace('{total}', String(items.length));
    setZoom(false);
    // Preload neighbours for instant navigation.
    for (const offset of [1, -1]) {
      const neighbour = items[(index + offset + items.length) % items.length];
      if (neighbour) new Image().src = neighbour.src;
    }
  }

  function setZoom(value: boolean) {
    zoomed = value;
    dialog?.classList.toggle('ce-lightbox--zoomed', value);
    const button = dialog?.querySelector<HTMLButtonElement>('[data-action="zoom"]');
    if (button) {
      button.setAttribute('aria-label', value ? labels.zoomOut : labels.zoomIn);
      button.textContent = value ? '−' : '+';
    }
    dialog?.style.setProperty('--ce-lightbox-x', '50%');
    dialog?.style.setProperty('--ce-lightbox-y', '50%');
  }

  function open(i: number, from: HTMLElement) {
    opener = from;
    dialog ??= setup(build());
    show(i);
    dialog.showModal();
  }

  function setup(el: HTMLDialogElement): HTMLDialogElement {
    el.addEventListener('click', (event) => {
      const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'close') el.close();
      else if (action === 'prev') show(index - 1);
      else if (action === 'next') show(index + 1);
      else if (action === 'zoom') setZoom(!zoomed);
      // Click on the backdrop closes.
      else if (event.target === el) el.close();
    });
    el.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') show(index + 1);
      else if (event.key === 'ArrowLeft') show(index - 1);
      else if (event.key === '+' || event.key === '=') setZoom(true);
      else if (event.key === '-') setZoom(false);
    });
    const stage = el.querySelector<HTMLElement>('.ce-lightbox__stage')!;
    stage.addEventListener('dblclick', () => setZoom(!zoomed));
    stage.addEventListener('mousemove', (event) => {
      if (!zoomed) return;
      const rect = stage.getBoundingClientRect();
      el.style.setProperty('--ce-lightbox-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty('--ce-lightbox-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
    // Swipe left/right to navigate, down to close.
    let touch: { x: number; y: number } | undefined;
    stage.addEventListener('touchstart', (event) => {
      const t = event.touches[0];
      touch = t && event.touches.length === 1 ? { x: t.clientX, y: t.clientY } : undefined;
    });
    stage.addEventListener('touchend', (event) => {
      const t = event.changedTouches[0];
      if (!touch || !t || zoomed) return;
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
      else if (dy > 80) el.close();
      touch = undefined;
    });
    el.addEventListener('close', () => {
      setZoom(false);
      opener?.focus({ preventScroll: true });
    });
    if (prefersReducedMotion()) el.classList.add('ce-lightbox--no-motion');
    return el;
  }

  const offs = links.map((link, i) =>
    on(link, 'click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button > 0) return;
      event.preventDefault();
      open(i, link);
    }),
  );

  return () => {
    offs.forEach((off) => off());
    dialog?.remove();
  };
};

/** Labels come translated from the server render (island options). */
function readLabels(options: IslandOptions) {
  const label = (key: string, fallback: string) =>
    typeof options[key] === 'string' ? (options[key] as string) : fallback;
  return {
    gallery: label('gallery', 'Gallery'),
    close: label('close', 'Close'),
    zoomIn: label('zoomIn', 'Zoom in'),
    zoomOut: label('zoomOut', 'Zoom out'),
    previousImage: label('previousImage', 'Previous image'),
    nextImage: label('nextImage', 'Next image'),
    imageOf: label('imageOf', '{n} / {total}'),
  };
}
