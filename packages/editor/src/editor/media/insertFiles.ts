import type { Block } from '../../schema/types';
import type { EditorContextValue } from '../context';
import { imageFromMedia } from '../inspector/fields';
import { childrenOf, createBlock, type DropTarget } from '../state/operations';
import { mediaTypeOf } from './uploads';

/**
 * Inserts dropped / pasted files as blocks right away (empty media) and fills them in as uploads
 * finish. Several images become one gallery; videos become video blocks; other files downloads.
 */
export function insertFiles(ctx: EditorContextValue, files: File[], target: DropTarget): void {
  const { registry, actions, uploader } = ctx;
  if (!files.length || !ctx.props.onUpload) return;
  const images = files.filter((f) => mediaTypeOf(f) === 'image');
  const others = files.filter((f) => mediaTypeOf(f) !== 'image');
  const blocks: { block: Block; file?: File; files?: File[] }[] = [];

  if (images.length > 1 && registry.has('gallery')) {
    blocks.push({ block: createBlock(registry, 'gallery'), files: images });
  } else {
    for (const file of images) blocks.push({ block: createBlock(registry, 'image'), file });
  }
  for (const file of others) {
    const type = mediaTypeOf(file) === 'video' ? 'video' : 'file';
    if (registry.has(type)) blocks.push({ block: createBlock(registry, type), file });
  }
  if (!blocks.length) return;
  actions.insertBlocksAt(
    blocks.map((b) => b.block),
    target,
  );
  // insertBlocksAt assigns fresh ids: map the placeholders by position.
  const doc = ctx.store.getState().history.present;
  const siblings = childrenOf(doc, target.parentId);
  const inserted = siblings.slice(target.index, target.index + blocks.length);

  blocks.forEach((entry, i) => {
    const id = inserted[i]?.id;
    if (!id) return;
    if (entry.files) {
      entry.files.forEach(
        (file) =>
          void uploader.upload(file).then((item) => {
            if (!item) return;
            actions.update(id, (b) => ({
              ...b,
              props: {
                ...b.props,
                items: [
                  ...((b.props.items as unknown[]) ?? []),
                  {
                    id: item.id || Math.random().toString(36).slice(2, 12),
                    image: imageFromMedia(item, ctx),
                  },
                ],
              },
            }));
          }),
      );
      return;
    }
    void uploader.upload(entry.file!).then((item) => {
      if (!item) return;
      actions.update(id, (b) => {
        if (b.type === 'image') return { ...b, props: { ...b.props, image: imageFromMedia(item, ctx) } };
        if (b.type === 'video')
          return { ...b, props: { ...b.props, source: { type: 'file', src: item.url } } };
        return {
          ...b,
          props: {
            ...b.props,
            file: {
              src: item.url,
              id: item.id,
              name: item.name ?? entry.file!.name,
              size: item.size ?? entry.file!.size,
              mime: item.mime ?? entry.file!.type,
            },
          },
        };
      });
    });
  });
}
