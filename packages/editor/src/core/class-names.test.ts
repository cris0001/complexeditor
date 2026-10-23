import { builtinBlocks } from '../blocks/index';
import { defineClassNames } from './class-names';

describe('defineClassNames', () => {
  it('returns the config unchanged and type-checks slots and props', () => {
    const config = defineClassNames(builtinBlocks, {
      '*': { slots: { root: 'block' } },
      heading: {
        slots: ({ props }) => ({ text: props.level === 2 ? 'h2' : 'hx' }),
        variants: { fancy: { eyebrow: 'x' } },
      },
      gallery: { slots: { item: 'rounded', img: 'object-cover' } },
    });
    expect(Object.keys(config)).toEqual(['*', 'heading', 'gallery']);

    defineClassNames(builtinBlocks, {
      // @ts-expect-error unknown slot name
      heading: { slots: { nope: 'x' } },
    });
    defineClassNames(builtinBlocks, {
      // @ts-expect-error unknown block type
      nope: {},
    });
  });
});
