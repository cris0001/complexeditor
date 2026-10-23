import type { Enhancer } from '../Island';
import { combine, on, prefersReducedMotion } from './dom';

/**
 * Gallery slider. The server renders a scroll-snap track that already works with touch and
 * trackpads; this adds arrows, dots/thumbnails, keyboard, mouse drag, autoplay, loop and fade.
 * It is only active while the current breakpoint's layout is `slider` (`--ce-gallery-mode`).
 */
export const enhance: Enhancer = (root, options) => {
  const track = root.querySelector<HTMLElement>('.ce-gallery__track');
  if (!track) return;
  const slides = Array.from(track.children) as HTMLElement[];
  const prev = root.querySelector<HTMLButtonElement>('.ce-gallery__arrow--prev');
  const next = root.querySelector<HTMLButtonElement>('.ce-gallery__arrow--next');
  const toggle = root.querySelector<HTMLButtonElement>('.ce-gallery__arrow--toggle');
  const indicators = Array.from(
    root.querySelectorAll<HTMLButtonElement>('.ce-gallery__dot, .ce-gallery__thumb'),
  );
  const loop = Boolean(options.loop);
  const fade = options.effect === 'fade';
  const interval = Number(options.autoplay ?? 0) * 1000;

  let index = 0;
  let playing = interval > 0 && !prefersReducedMotion();
  let hovered = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const active = () => getComputedStyle(root).getPropertyValue('--ce-gallery-mode').trim() === 'slider';

  function update(newIndex: number) {
    index = newIndex;
    slides.forEach((slide, i) => {
      slide.classList.toggle('ce-is-active', i === index);
      if (fade) slide.inert = i !== index;
    });
    indicators.forEach((button, i) => button.setAttribute('aria-current', i === index ? 'true' : 'false'));
    if (prev) prev.disabled = !loop && index === 0;
    if (next) next.disabled = !loop && index >= slides.length - 1;
  }

  function goTo(target: number, smooth = true) {
    const count = slides.length;
    const i = loop ? (target + count) % count : Math.max(0, Math.min(count - 1, target));
    if (fade) update(i);
    else {
      const slide = slides[i];
      if (slide) {
        track!.scrollTo({
          left: slide.offsetLeft - track!.offsetLeft,
          behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
        });
      }
      update(i);
    }
  }

  // Keep the index in sync when the reader scrolls or swipes.
  const observer =
    typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver(
          (entries) => {
            if (fade) return;
            const visible = entries.filter((e) => e.isIntersecting && e.intersectionRatio > 0.6);
            const first = visible
              .map((e) => slides.indexOf(e.target as HTMLElement))
              .sort((a, b) => a - b)[0];
            if (first !== undefined && first >= 0) update(first);
          },
          { root: track, threshold: [0.6] },
        );
  slides.forEach((slide) => observer?.observe(slide));

  function schedule() {
    clearInterval(timer);
    if (!playing || !active()) return;
    timer = setInterval(() => {
      if (!hovered && document.visibilityState === 'visible')
        goTo(index + 1 >= slides.length && !loop ? 0 : index + 1);
    }, interval);
  }

  function setPlaying(value: boolean) {
    playing = value;
    if (toggle) {
      toggle.setAttribute('aria-label', (value ? toggle.dataset.pauseLabel : toggle.dataset.playLabel) ?? '');
      toggle.dataset.state = value ? 'playing' : 'paused';
    }
    schedule();
  }

  // Mouse drag (touch already scrolls natively).
  let dragStart: { x: number; scroll: number } | undefined;
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || fade || !active()) return;
    dragStart = { x: event.clientX, scroll: track.scrollLeft };
    track.classList.add('ce-is-dragging');
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragStart) return;
    track.scrollLeft = dragStart.scroll - (event.clientX - dragStart.x);
  };
  const onPointerUp = () => {
    if (!dragStart) return;
    dragStart = undefined;
    track.classList.remove('ce-is-dragging');
  };

  const syncMode = () => {
    root.classList.toggle('ce-gallery--fading', fade && active());
    schedule();
  };
  const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(syncMode);
  resize?.observe(root);

  const cleanup = combine(
    prev ? on(prev, 'click', () => goTo(index - 1)) : undefined,
    next ? on(next, 'click', () => goTo(index + 1)) : undefined,
    toggle ? on(toggle, 'click', () => setPlaying(!playing)) : undefined,
    ...indicators.map((button, i) => on(button, 'click', () => goTo(i))),
    on(track, 'keydown', (event) => {
      if (!active()) return;
      if (event.key === 'ArrowRight') goTo(index + 1);
      else if (event.key === 'ArrowLeft') goTo(index - 1);
      else if (event.key === 'Home') goTo(0);
      else if (event.key === 'End') goTo(slides.length - 1);
      else return;
      event.preventDefault();
    }),
    on(root, 'mouseenter', () => {
      hovered = Boolean(options.pauseOnHover);
    }),
    on(root, 'mouseleave', () => {
      hovered = false;
    }),
    // Keyboard focus inside the carousel pauses autoplay (WCAG 2.2.2).
    on(root, 'focusin', () => {
      hovered = true;
    }),
    on(root, 'focusout', () => {
      hovered = false;
    }),
    on(track, 'pointerdown', onPointerDown),
    on(window, 'pointermove', onPointerMove as never),
    on(window, 'pointerup', onPointerUp as never),
    () => {
      clearInterval(timer);
      observer?.disconnect();
      resize?.disconnect();
      root.classList.remove('ce-gallery--fading');
    },
  );

  update(0);
  setPlaying(playing);
  syncMode();
  return cleanup;
};
