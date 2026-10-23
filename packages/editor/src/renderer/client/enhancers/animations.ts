import type { Enhancer } from '../Island';
import { prefersReducedMotion } from './dom';

/**
 * Scroll animations for the whole document: marks `.ce-document` as ready (only then are blocks
 * hidden before they animate) and reveals each `.ce-anim` block as it enters the viewport.
 */
export const enhance: Enhancer = (marker) => {
  const doc = marker.closest('.ce-document') ?? marker;
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('ce-in-view');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  const targets = doc.querySelectorAll('.ce-anim');
  // Blocks already on screen are revealed without waiting for the next frame to avoid a flash.
  for (const target of targets) {
    const rect = target.getBoundingClientRect();
    if (rect.top < innerHeight && rect.bottom > 0) target.classList.add('ce-in-view');
    else observer.observe(target);
  }
  doc.classList.add('ce-anim-ready');
  return () => {
    observer.disconnect();
    doc.classList.remove('ce-anim-ready');
  };
};
