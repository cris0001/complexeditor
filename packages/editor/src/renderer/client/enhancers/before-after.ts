import type { Enhancer } from '../Island';
import { on } from './dom';

/**
 * Before/after slider: the native range input (mouse, touch and keyboard accessible) drives the
 * `--ce-ba-pos` custom property; CSS does the clipping.
 */
export const enhance: Enhancer = (root) => {
  const range = root.querySelector<HTMLInputElement>('.ce-before-after__range');
  if (!range) return;
  const update = () => {
    root.style.setProperty('--ce-ba-pos', `${range.value}%`);
    range.setAttribute('aria-valuetext', `${Math.round(Number(range.value))}%`);
  };
  update();
  return on(range, 'input', update);
};
