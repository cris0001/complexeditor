import type { Enhancer } from '../Island';
import { on } from './dom';

/** Copy button of the code block. */
export const enhance: Enhancer = (root) => {
  const button = root.querySelector<HTMLButtonElement>('.ce-code__copy');
  const code = root.querySelector('pre code');
  if (!button || !code || !navigator.clipboard) return;
  const label = button.textContent ?? '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const off = on(button, 'click', () => {
    void navigator.clipboard.writeText(code.textContent?.replace(/\n$/, '') ?? '').then(() => {
      button.textContent = button.dataset.copiedLabel ?? label;
      button.dataset.state = 'copied';
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.textContent = label;
        delete button.dataset.state;
      }, 2000);
    });
  });
  return () => {
    off();
    clearTimeout(timer);
  };
};
