// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ContentDocument } from '../schema/types';
import { Editor } from './Editor';

// jsdom lacks layout APIs used by the overlay and drag & drop.
beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (c) => `\\${c}`);
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});
afterEach(cleanup);

const doc: ContentDocument = {
  version: 1,
  blocks: [
    { id: 'h', type: 'heading', props: { level: 2 }, content: [{ text: 'Title' }] },
    { id: 's', type: 'separator', props: { variant: 'line' } },
    { id: 'p', type: 'paragraph', props: {}, content: [{ text: 'Body text' }] },
  ],
};

const select = (id: string) => {
  const el = document.querySelector(`[data-ce-id="${id}"]`)!;
  fireEvent.pointerDown(el, { button: 0 });
  return el;
};

describe('<Editor>', () => {
  it('renders the document with editor attributes and the panels', () => {
    render(<Editor value={doc} locale="en" />);
    expect(document.querySelector('[data-ce-id="h"] .ce-heading__text')?.textContent).toBe('Title');
    expect(document.querySelector('[data-ce-id="s"]')?.getAttribute('data-ce-outline')).toBe('none');
    expect(screen.getByRole('tab', { name: 'Blocks' })).toBeTruthy();
    expect(screen.getByText('Select a block to edit its settings')).toBeTruthy();
  });

  it('selects a block and edits it in the inspector', () => {
    const onChange = vi.fn();
    render(<Editor value={doc} locale="en" onChange={onChange} />);
    select('s');
    const inspector = screen.getByRole('complementary', { name: 'Settings' });
    expect(within(inspector).getByRole('heading', { name: 'Separator' })).toBeTruthy();
    fireEvent.click(within(inspector).getByRole('radio', { name: 'Dots' }));
    expect(document.querySelector('[data-ce-id="s"]')?.className).toContain('ce-separator--dots');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        blocks: expect.arrayContaining([expect.objectContaining({ id: 's', props: { variant: 'dots' } })]),
      }),
    );
  });

  it('deletes with the keyboard and undoes', () => {
    render(<Editor value={doc} locale="en" />);
    const el = select('s');
    fireEvent.keyDown(el, { key: 'Delete' });
    expect(document.querySelector('[data-ce-id="s"]')).toBeNull();
    fireEvent.keyDown(document.querySelector('.ce-ed-canvas')!, { key: 'z', ctrlKey: true });
    expect(document.querySelector('[data-ce-id="s"]')).not.toBeNull();
    fireEvent.keyDown(document.querySelector('.ce-ed-canvas')!, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(document.querySelector('[data-ce-id="s"]')).toBeNull();
  });

  it('moves and duplicates from the action bar', () => {
    render(<Editor value={doc} locale="en" />);
    select('p');
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }));
    const ids = () =>
      Array.from(document.querySelectorAll('.ce-document > [data-ce-id]')).map((e) =>
        e.getAttribute('data-ce-id'),
      );
    expect(ids()).toEqual(['h', 'p', 's']);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(ids()).toHaveLength(4);
  });

  it('inserts a block from the palette after the selection', () => {
    render(<Editor value={doc} locale="en" />);
    select('h');
    fireEvent.click(screen.getByRole('button', { name: 'Quote' }));
    const blocks = Array.from(document.querySelectorAll('.ce-document > [data-ce-id]'));
    expect(blocks[1]?.className).toContain('ce-quote');
  });

  it('autosaves after the debounce', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Editor value={doc} locale="en" onSave={onSave} autosaveDelay={500} />);
    select('s');
    fireEvent.keyDown(document.querySelector('[data-ce-id="s"]')!, { key: 'Delete' });
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0]![0].blocks).toHaveLength(2);
    expect(screen.getByText('Saved')).toBeTruthy();
    vi.useRealTimers();
  });

  it('shows save errors with a retry button', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    render(<Editor value={doc} locale="en" onSave={onSave} autosaveDelay={100} />);
    select('s');
    fireEvent.keyDown(document.querySelector('[data-ce-id="s"]')!, { key: 'Delete' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(screen.getByText('Save failed')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Saved')).toBeTruthy();
    vi.useRealTimers();
  });

  it('respects permissions', () => {
    render(
      <Editor value={doc} locale="en" permissions={{ blocks: ['paragraph', 'heading'], advanced: false }} />,
    );
    const palette = screen.getByRole('complementary', { name: 'Blocks' });
    expect(within(palette).queryByRole('button', { name: 'Quote' })).toBeNull();
    expect(within(palette).getByRole('button', { name: 'Paragraph' })).toBeTruthy();
    select('h');
    expect(screen.queryByRole('tab', { name: 'Advanced' })).toBeNull();
  });

  it('uses the Polish UI dictionary and overrides', () => {
    render(<Editor value={doc} locale="pl" messages={{ blocks: 'Elementy' }} />);
    expect(screen.getByRole('tab', { name: 'Elementy' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Struktura' })).toBeTruthy();
  });

  it('resets when a different document is passed', () => {
    const { rerender } = render(<Editor value={doc} locale="en" />);
    rerender(
      <Editor
        value={{
          version: 1,
          blocks: [{ id: 'x', type: 'paragraph', props: {}, content: [{ text: 'Other' }] }],
        }}
        locale="en"
      />,
    );
    expect(document.querySelector('[data-ce-id="h"]')).toBeNull();
    expect(document.querySelector('[data-ce-id="x"]')).not.toBeNull();
  });
});
