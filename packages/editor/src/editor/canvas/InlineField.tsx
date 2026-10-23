import { Editor } from '@tiptap/core';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Block } from '../../schema/types';
import type { EditorMessageKey } from '../../i18n/editor-messages';
import { renderInlineContent } from '../../renderer/inline';
import type { RenderContext } from '../../core/types';
import { useEditor, useEditorState } from '../context';
import { FLOW_TEXT, MARKDOWN_SHORTCUTS } from '../actions';
import { fromProseMirror, sameInline, toProseMirror, type PMNode } from '../tiptap/convert';
import { inlineExtensions } from '../tiptap/extensions';
import { FormatToolbar } from './FormatToolbar';

const PLACEHOLDERS: Record<string, EditorMessageKey> = {
  paragraph: 'placeholderParagraph',
  heading: 'placeholderHeading',
};

interface InlineFieldProps {
  block: Block;
  ctx: Pick<RenderContext, 'components'>;
}

/**
 * Editable inline content. Shows static markup until the user clicks or focuses it, then mounts a
 * Tiptap editor directly on a `<span>` inside the block's own markup, so the canvas looks exactly
 * like the published page. Only one Tiptap instance exists at a time.
 */
export function InlineField({ block, ctx }: InlineFieldProps) {
  const { store, actions, registry, permissions, t } = useEditor();
  const active = useEditorState((s) => s.editing === block.id);
  const focusRequest = useEditorState((s) => (s.focusRequest?.blockId === block.id ? s.focusRequest : null));
  const host = useRef<HTMLSpanElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const clickPoint = useRef<{ x: number; y: number } | null>(null);
  const blockRef = useRef(block);
  blockRef.current = block;

  const placeholder = t(PLACEHOLDERS[block.type] ?? 'placeholderText');
  const isFlow = FLOW_TEXT.has(block.type);

  // Activation: a focus request (keyboard navigation, new block) or a click.
  useEffect(() => {
    if (focusRequest && !active) store.set({ editing: block.id });
  }, [focusRequest, active, store, block.id]);

  // Mount / unmount Tiptap while active.
  useLayoutEffect(() => {
    if (!active || !host.current) return;
    const instance: Editor = new Editor({
      extensions: inlineExtensions({ marks: permissions.marks }),
      content: toProseMirror(blockRef.current.content),
      injectCSS: false,
      editorProps: {
        attributes: (): Record<string, string> => ({
          class: 'ce-ed-inline ce-ed-inline--active',
          'data-placeholder': placeholder,
          ...(instance.isEmpty ? { 'data-empty': '' } : {}),
          spellcheck: 'true',
        }),
        handleKeyDown: (view, event) => {
          const { state } = view;
          const { from, to, empty } = state.selection;
          const size = state.doc.content.size;
          const id = blockRef.current.id;
          if (event.key === 'Escape') {
            store.set({ editing: null, selection: id });
            view.dom.blur();
            return true;
          }
          if (event.key === '/' && instance.isEmpty && blockRef.current.type === 'paragraph') {
            event.preventDefault();
            store.set({ slash: { target: { kind: 'replace', blockId: id }, query: '' } });
            return true;
          }
          if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
            if (!isFlow) return false;
            event.preventDefault();
            const before = fromProseMirror(state.doc.cut(0, from).toJSON() as PMNode);
            const after = fromProseMirror(state.doc.cut(to).toJSON() as PMNode);
            actions.split(id, before, after);
            return true;
          }
          if (event.key === 'Backspace' && empty && from === 0) {
            return actions.mergeBackward(id);
          }
          if (event.key === 'Delete' && empty && from === size) {
            return actions.mergeForward(id);
          }
          if (event.key === 'Tab' && blockRef.current.type === 'list-item') {
            event.preventDefault();
            if (event.shiftKey) actions.outdent(id);
            else actions.indent(id);
            return true;
          }
          if ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') && empty && from === 0) {
            return actions.focusSibling(id, -1);
          }
          if ((event.key === 'ArrowDown' || event.key === 'ArrowRight') && empty && from === size) {
            return actions.focusSibling(id, 1);
          }
          return false;
        },
        handleTextInput: (view, from, _to, text) => {
          if (text !== ' ' || blockRef.current.type !== 'paragraph') return false;
          const prefix = view.state.doc.textBetween(0, from);
          const shortcut = MARKDOWN_SHORTCUTS.find((s) => s.pattern.test(prefix));
          if (!shortcut || !registry.has(shortcut.type)) return false;
          const rest = fromProseMirror(view.state.doc.cut(from).toJSON() as PMNode);
          actions.transform(blockRef.current.id, shortcut.type, shortcut.props, rest);
          return true;
        },
      },
      onUpdate: ({ editor: e }) => {
        const content = fromProseMirror(e.getJSON() as PMNode);
        if (sameInline(content, blockRef.current.content)) return;
        actions.update(blockRef.current.id, (b) => ({ ...b, content }), `text:${blockRef.current.id}`);
        // Markdown shortcut for a separator: "---" in an otherwise empty paragraph.
        if (blockRef.current.type === 'paragraph' && e.getText() === '---' && registry.has('separator')) {
          const id = blockRef.current.id;
          actions.transform(id, 'separator');
          actions.insert('paragraph', store.getState().selection);
        }
      },
      onBlur: ({ event }) => {
        const next = event.relatedTarget as HTMLElement | null;
        // Clicking the format toolbar keeps the field active.
        if (next?.closest('.ce-ed-format, .ce-ed-slash')) return;
        if (store.getState().editing === blockRef.current.id) store.set({ editing: null });
      },
    });
    instance.mount({ mount: host.current } as unknown as HTMLElement);
    setEditor(instance);
    return () => {
      setEditor(null);
      instance.destroy();
    };
    // The editor is created once per activation; content changes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // External changes (undo, inspector, merge) while editing.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = fromProseMirror(editor.getJSON() as PMNode);
    if (!sameInline(current, block.content)) {
      const { from } = editor.state.selection;
      editor.commands.setContent(toProseMirror(block.content), { emitUpdate: false });
      editor.commands.setTextSelection(Math.min(from, editor.state.doc.content.size));
    }
  }, [editor, block.content]);

  // Focus after mounting: requested position, or the clicked point.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const request = store.getState().focusRequest;
    if (request?.blockId === block.id) {
      const size = editor.state.doc.content.size;
      const at = request.at === 'start' ? 0 : request.at === 'end' ? size : Math.min(request.at, size);
      editor.commands.focus(at);
      store.set({ focusRequest: null });
      return;
    }
    const point = clickPoint.current;
    clickPoint.current = null;
    const pos = point ? editor.view.posAtCoords({ left: point.x, top: point.y })?.pos : undefined;
    editor.commands.focus(pos ?? 'end');
  }, [editor, store, block.id, focusRequest]);

  if (active) {
    return (
      <>
        <span ref={host} key="editing" />
        {editor && <FormatToolbar editor={editor} />}
      </>
    );
  }

  const content: ReactNode = renderInlineContent(block.content, ctx);
  return (
    <span
      key="static"
      className="ce-ed-inline"
      tabIndex={0}
      role="textbox"
      aria-multiline={isFlow ? undefined : true}
      data-placeholder={placeholder}
      data-empty={block.content?.length ? undefined : ''}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        clickPoint.current = { x: event.clientX, y: event.clientY };
        store.set({ editing: block.id, selection: block.id });
      }}
      onFocus={() => {
        if (!store.getState().editing) store.set({ editing: block.id, selection: block.id });
      }}
    >
      {content}
    </span>
  );
}
