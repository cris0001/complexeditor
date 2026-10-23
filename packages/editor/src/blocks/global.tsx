import { z } from 'zod';
import { cx } from '../core/classes';
import { defineBlock } from '../core/define-block';
import { renderBlock } from '../renderer/render';
import { t } from './shared';

/**
 * Reference to a global block: content maintained in one place (by the project) and shown
 * wherever it is referenced. The renderer receives the content through `globals`.
 */
export const globalBlock = defineBlock({
  type: 'global',
  category: 'global',
  outline: 'global',
  icon: 'global',
  props: z.object({ ref: z.string().min(1).max(200) }),
  defaultProps: { ref: '' },
  slots: ['root'],
  // Inserted from the "Global blocks" palette section, not as an empty block.
  hidden: true,
  render: ({ props: p, root, ctx }) => {
    const blocks = ctx.globals?.[p.ref];
    if (!blocks) {
      return ctx.mode === 'editor' ? <div {...root} data-ce-empty="" data-ce-missing="" /> : null;
    }
    // Inside the editor the content is read-only: it is edited in its own dialog.
    const content = ctx.readonly ?? ctx;
    return (
      <div {...root} className={cx(root.className, 'ce-flow')}>
        {blocks.map((block) => renderBlock(block, { ...content, depth: ctx.depth + 1, parent: null }))}
      </div>
    );
  },
  i18n: {
    pl: { name: 'Klocek globalny', description: 'Treść wspólna dla wielu wpisów' },
    en: { name: 'Global block', description: 'Content shared by many posts' },
  },
  inspector: [{ type: 'globalRef', name: 'ref', label: t('Klocek globalny', 'Global block') }],
});
