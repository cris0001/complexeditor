/** Small DOM helpers shared by enhancers. */

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function on<K extends keyof HTMLElementEventMap>(
  target: HTMLElement | Document | Window,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void {
  target.addEventListener(type, listener as EventListener, options);
  return () => target.removeEventListener(type, listener as EventListener, options);
}

/** Runs every cleanup function in reverse order. */
export const combine =
  (...cleanups: ((() => void) | undefined)[]) =>
  () => {
    for (const fn of cleanups.reverse()) fn?.();
  };

/** Calls `callback` once when `element` first enters the viewport. */
export function whenVisible(
  element: Element,
  callback: () => void,
  rootMargin = '0px 0px -10% 0px',
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    callback();
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        callback();
      }
    },
    { rootMargin },
  );
  observer.observe(element);
  return () => observer.disconnect();
}

/** Loads a third-party script once per page (constant URLs only, never from document data). */
const scripts = new Map<string, Promise<void>>();
export function loadScript(src: string): Promise<void> {
  let promise = scripts.get(src);
  if (!promise) {
    promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scripts.delete(src);
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.appendChild(script);
    });
    scripts.set(src, promise);
  }
  return promise;
}
