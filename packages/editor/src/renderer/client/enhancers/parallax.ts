import type { Enhancer } from '../Island';
import { combine, on, prefersReducedMotion } from './dom';

/**
 * Hero: optional parallax (sets `--ce-parallax` while scrolling) and background video that
 * respects `prefers-reduced-motion` (paused; the poster image stays visible).
 */
export const enhance: Enhancer = (root, options) => {
  const reduced = prefersReducedMotion();
  const video = root.querySelector<HTMLVideoElement>('.ce-hero__video');
  if (video && reduced) {
    video.pause();
    video.removeAttribute('autoplay');
  }
  if (!options.parallax || reduced) return;

  let frame = 0;
  const update = () => {
    frame = 0;
    const rect = root.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    // -1 (hero leaving at the top) … 1 (entering at the bottom)
    const progress = (rect.top + rect.height / 2 - innerHeight / 2) / (innerHeight / 2 + rect.height / 2);
    root.style.setProperty('--ce-parallax', `${(progress * -12).toFixed(2)}%`);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  update();
  return combine(
    on(window, 'scroll', schedule as never, { passive: true }),
    on(window, 'resize', schedule as never),
    () => {
      cancelAnimationFrame(frame);
      root.style.removeProperty('--ce-parallax');
    },
  );
};
