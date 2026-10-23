import type { Enhancer } from '../Island';
import { combine, on } from './dom';

/**
 * WAI-ARIA tabs. Without JavaScript every panel is visible with its own heading. When the block
 * uses `mobile-accordion` and the layout switches (`--ce-tabs-mode: accordion` from CSS), panel
 * headings become disclosure buttons instead.
 */
export const enhance: Enhancer = (root) => {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>(':scope > .ce-tabs__list > [role="tab"]'));
  const panels = tabs.map((tab) =>
    root.querySelector<HTMLElement>(`#${CSS.escape(tab.getAttribute('aria-controls') ?? '')}`),
  );
  const toggles = panels.map((panel) =>
    panel?.querySelector<HTMLButtonElement>(':scope > .ce-tab__heading > .ce-tab__toggle'),
  );
  if (!tabs.length) return;

  let selected = Math.max(
    0,
    tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'),
  );
  const open = new Set<number>([selected]);
  const accordion = () => getComputedStyle(root).getPropertyValue('--ce-tabs-mode').trim() === 'accordion';

  function render() {
    const isAccordion = accordion();
    root.dataset.mode = isAccordion ? 'accordion' : 'tabs';
    tabs.forEach((tab, i) => {
      const active = i === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = panels[i];
      if (!panel) return;
      const visible = isAccordion ? open.has(i) : active;
      panel.classList.toggle('ce-is-open', visible);
      // In tab mode hidden panels keep their heading out of the way; in accordion mode the heading stays.
      panel.setAttribute('role', isAccordion ? 'region' : 'tabpanel');
      toggles[i]?.setAttribute('aria-expanded', String(visible));
    });
  }

  function select(i: number, focus = false) {
    selected = (i + tabs.length) % tabs.length;
    render();
    if (focus) tabs[selected]?.focus();
  }

  const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(render);
  resize?.observe(root);
  render();

  return combine(
    ...tabs.map((tab, i) => on(tab, 'click', () => select(i))),
    ...tabs.map((tab) =>
      on(tab, 'keydown', (event) => {
        const keys: Record<string, number> = {
          ArrowRight: selected + 1,
          ArrowLeft: selected - 1,
          Home: 0,
          End: tabs.length - 1,
        };
        const target = keys[event.key];
        if (target === undefined) return;
        event.preventDefault();
        select(target, true);
      }),
    ),
    ...toggles.map((toggle, i) =>
      toggle
        ? on(toggle, 'click', () => {
            if (!accordion()) return;
            if (open.has(i)) open.delete(i);
            else open.add(i);
            render();
          })
        : undefined,
    ),
    () => resize?.disconnect(),
  );
};
