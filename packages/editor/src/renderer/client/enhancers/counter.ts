import type { Enhancer } from '../Island';
import { prefersReducedMotion, whenVisible } from './dom';

/** Counts numbers up when the stats block enters the viewport. The final value is server-rendered. */
export const enhance: Enhancer = (root, options) => {
  if (prefersReducedMotion()) return;
  const numbers = Array.from(root.querySelectorAll<HTMLElement>('[data-ce-value]'));
  const duration = Number(options.duration ?? 1600);
  const lang = root.closest('[lang]')?.getAttribute('lang') ?? undefined;
  let frame = 0;

  const run = () => {
    const start = performance.now();
    const formats = numbers.map((el) => {
      const decimals = Number(el.dataset.ceDecimals ?? 0);
      return new Intl.NumberFormat(lang, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    });
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      numbers.forEach((el, i) => {
        el.textContent = formats[i]!.format(Number(el.dataset.ceValue) * eased);
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };

  const stop = whenVisible(root, run);
  return () => {
    stop();
    cancelAnimationFrame(frame);
    numbers.forEach((el) => {
      const decimals = Number(el.dataset.ceDecimals ?? 0);
      el.textContent = new Intl.NumberFormat(lang, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(Number(el.dataset.ceValue));
    });
  };
};
