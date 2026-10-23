import type { ReactNode } from 'react';
import { z } from 'zod';
import { EMBED_PROVIDERS, parseEmbedUrl, type EmbedProvider } from '../schema/embed';
import { inlineToPlainText } from '../schema/text';
import { sanitizeUrl } from '../schema/url';
import { defineBlock } from '../core/define-block';
import { Icon } from '../core/icons';
import { cx } from '../core/classes';
import { addResponsive, spaceToCss, type StyleAttributes } from '../core/style';
import type { RenderContext } from '../core/types';
import { linkAttributes } from '../renderer/inline';
import { island } from '../renderer/island';
import {
  aspectOptions,
  aspectSchema,
  aspectValue,
  cssLength,
  customAspectSchema,
  focalPointSchema,
  formatBytes,
  imageSchema,
  linkSchema,
  responsive,
  responsiveSpace,
  safeUrl,
  t,
  type ImageRef,
} from './shared';

const attrs = (): StyleAttributes => ({ classes: [], vars: {} });

/** Viewport query for the mobile image (art direction). `<source media>` cannot use container queries. */
const MOBILE_QUERY = '(max-width: 767.98px)';

interface PictureOptions {
  image: ImageRef;
  mobile?: ImageRef;
  className: string;
  alt?: string;
  sizes?: string;
  eager?: boolean;
}

/** `<picture>` with an optional mobile source and the project's Image component. */
export function Picture({
  ctx,
  image,
  mobile,
  className,
  alt,
  sizes,
  eager,
}: PictureOptions & { ctx: RenderContext }) {
  const { Image } = ctx.components;
  const src = sanitizeUrl(image.src);
  if (!src) return null;
  const img = (
    <Image
      src={src}
      alt={alt ?? image.alt ?? ''}
      width={image.width}
      height={image.height}
      srcSet={image.srcSet}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      className={className}
    />
  );
  const mobileSrc = mobile && sanitizeUrl(mobile.src);
  if (!mobileSrc) return img;
  // The editor previews devices by width, which `<source media>` cannot see.
  if (ctx.previewDevice) {
    return ctx.previewDevice === 'mobile' ? (
      <Image
        src={mobileSrc}
        alt={alt ?? mobile.alt ?? image.alt ?? ''}
        width={mobile.width}
        height={mobile.height}
        className={className}
      />
    ) : (
      img
    );
  }
  return (
    <picture>
      <source
        media={MOBILE_QUERY}
        srcSet={mobile.srcSet ?? mobileSrc}
        width={mobile.width}
        height={mobile.height}
      />
      {img}
    </picture>
  );
}

/** Translated lightbox labels, passed to the client island. */
const lightboxLabels = (ctx: RenderContext) => ({
  gallery: ctx.t('gallery'),
  close: ctx.t('close'),
  zoomIn: ctx.t('zoomIn'),
  zoomOut: ctx.t('zoomOut'),
  previousImage: ctx.t('previousImage'),
  nextImage: ctx.t('nextImage'),
  imageOf: ctx.t('imageOf'),
});

const focalVars = (out: StyleAttributes, focal?: { x: number; y: number }) => {
  if (focal) out.vars['--ce-focal'] = `${Math.round(focal.x * 100)}% ${Math.round(focal.y * 100)}%`;
};

// ---------------------------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------------------------

const imageProps = z.object({
  image: imageSchema,
  /** Different image (crop) on phones. */
  mobileImage: imageSchema.optional(),
  aspect: aspectSchema,
  customAspect: customAspectSchema.optional(),
  focalPoint: focalPointSchema.optional(),
  captionPosition: z.enum(['below', 'overlay']),
  link: linkSchema.optional(),
  lightbox: z.boolean().optional(),
  hover: z.enum(['none', 'zoom', 'lift', 'grayscale']).optional(),
  /** Load immediately (use for the first image above the fold). */
  priority: z.boolean().optional(),
});

export const image = defineBlock({
  type: 'image',
  category: 'media',
  outline: 'media',
  icon: 'image',
  props: imageProps,
  defaultProps: { image: { src: '' }, aspect: 'original', captionPosition: 'below' },
  slots: ['root', 'frame', 'img', 'caption'],
  content: true,
  keywords: ['zdjęcie', 'obraz', 'photo', 'picture', 'img'],
  modifiers: (p) => [
    p.aspect !== 'original' && 'cropped',
    p.captionPosition === 'overlay' && 'caption-overlay',
    p.hover && p.hover !== 'none' && `hover-${p.hover}`,
  ],
  attributes: (p) => {
    const out = attrs();
    const ratio = aspectValue(p.aspect, p.customAspect);
    if (ratio) out.vars['--ce-aspect'] = ratio;
    focalVars(out, p.focalPoint);
    return out;
  },
  render: ({ block, props: p, root, slot, content, ctx }) => {
    const src = sanitizeUrl(p.image.src);
    if (!src) return ctx.mode === 'editor' ? <figure {...root} data-ce-empty="" /> : null;
    const caption = block.content?.length ? (
      <figcaption className={slot('caption')}>{content}</figcaption>
    ) : null;
    const picture = (
      <Picture ctx={ctx} image={p.image} mobile={p.mobileImage} className={slot('img')} eager={p.priority} />
    );
    const { Link } = ctx.components;
    let frame: ReactNode = picture;
    if (p.link) {
      frame = (
        <Link href={p.link.href} className={slot('frame')} {...linkAttributes(p.link)}>
          {picture}
        </Link>
      );
    } else if (p.lightbox) {
      // Without JavaScript this simply opens the full image.
      frame = (
        <a
          href={src}
          className={slot('frame')}
          data-ce-lightbox=""
          data-ce-caption={inlineToPlainText(block.content) || undefined}
          aria-label={ctx.t('openImage')}
        >
          {picture}
        </a>
      );
    } else {
      frame = <div className={slot('frame')}>{picture}</div>;
    }
    return (
      <figure {...root}>
        {frame}
        {caption}
        {p.lightbox && !p.link && island(ctx, 'lightbox', lightboxLabels(ctx))}
      </figure>
    );
  },
  inspector: [
    { type: 'media', name: 'image', label: t('Zdjęcie', 'Image'), mediaType: 'image' },
    { type: 'text', name: 'image.alt', label: t('Tekst alternatywny', 'Alt text') },
    { type: 'select', name: 'aspect', label: t('Proporcje', 'Aspect ratio'), options: aspectOptions },
    {
      type: 'text',
      name: 'customAspect',
      label: t('Własne proporcje', 'Custom ratio'),
      when: (p) => p.aspect === 'custom',
    },
    { type: 'focalPoint', name: 'focalPoint', label: t('Punkt ostrości', 'Focal point'), image: 'image' },
    {
      type: 'media',
      name: 'mobileImage',
      label: t('Inne zdjęcie na telefonie', 'Different image on phones'),
      mediaType: 'image',
    },
    {
      type: 'segmented',
      name: 'captionPosition',
      label: t('Podpis', 'Caption'),
      options: [
        { value: 'below', label: t('Pod zdjęciem', 'Below') },
        { value: 'overlay', label: t('Na zdjęciu', 'Overlay') },
      ],
    },
    { type: 'link', name: 'link', label: t('Link', 'Link') },
    {
      type: 'toggle',
      name: 'lightbox',
      label: t('Powiększenie (lightbox)', 'Lightbox'),
      when: (p) => !p.link,
    },
    {
      type: 'select',
      name: 'hover',
      label: t('Efekt po najechaniu', 'Hover effect'),
      options: [
        { value: 'none', label: t('Brak', 'None') },
        { value: 'zoom', label: t('Przybliżenie', 'Zoom') },
        { value: 'lift', label: t('Uniesienie', 'Lift') },
        { value: 'grayscale', label: t('Kolor po najechaniu', 'Color on hover') },
      ],
    },
    { type: 'level', name: 'style.radius', label: t('Zaokrąglenie', 'Radius') },
    { type: 'level', name: 'style.shadow', label: t('Cień', 'Shadow') },
    { type: 'width', name: 'style.width', label: t('Szerokość', 'Width'), responsive: true },
    {
      type: 'toggle',
      name: 'priority',
      label: t('Ładuj od razu (nad zgięciem)', 'Load eagerly (above the fold)'),
      advanced: true,
    },
  ],
  i18n: {
    pl: { name: 'Zdjęcie', description: 'Zdjęcie z podpisem, linkiem lub powiększeniem' },
    en: { name: 'Image', description: 'Image with caption, link or lightbox' },
  },
});

// ---------------------------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------------------------

export const GALLERY_LAYOUTS = ['grid', 'masonry', 'bento', 'slider', 'strip'] as const;

const galleryItem = z.strictObject({
  id: z.string().regex(/^[\w-]{1,64}$/),
  image: imageSchema,
  caption: z.string().max(1000).optional(),
  link: linkSchema.optional(),
  focalPoint: focalPointSchema.optional(),
});

const galleryProps = z.object({
  items: z.array(galleryItem).max(200),
  layout: responsive(z.enum(GALLERY_LAYOUTS)),
  columns: responsive(z.number().int().min(1).max(8)).optional(),
  bentoPattern: z.enum(['a', 'b', 'c']).optional(),
  slidesPerView: responsive(z.number().min(1).max(6)).optional(),
  /** Show part of the next slide. */
  peek: z.boolean().optional(),
  arrows: z.boolean().optional(),
  dots: z.boolean().optional(),
  thumbnails: z.boolean().optional(),
  /** Seconds between slides; 0 disables autoplay. */
  autoplay: z.number().min(0).max(60).optional(),
  pauseOnHover: z.boolean().optional(),
  loop: z.boolean().optional(),
  effect: z.enum(['slide', 'fade']).optional(),
  gap: responsiveSpace.optional(),
  aspect: aspectSchema.optional(),
  customAspect: customAspectSchema.optional(),
  captions: z.enum(['none', 'below', 'overlay']).optional(),
  lightbox: z.boolean().optional(),
  /** Height of tiles in the scroll strip. */
  stripHeight: cssLength.optional(),
});

/**
 * Layout CSS for one breakpoint. Every layout sets the full set of properties it touches, because a
 * smaller breakpoint's layout class stays on the element (mobile-first) and must be fully overridden.
 */
function galleryLayoutCss(cls: (value?: string) => string): string {
  const track = (layout: string) => `${cls(layout)} > .ce-gallery__track`;
  const item = (layout: string) => `${cls(layout)} > .ce-gallery__track > .ce-gallery__item`;
  const img = (layout: string) => `${cls(layout)} > .ce-gallery__track .ce-gallery__img`;
  const controls = (layout: string) => `${cls(layout)} > .ce-gallery__controls`;
  const resetTrack =
    'columns: auto; grid-auto-flow: row; grid-auto-columns: auto; grid-auto-rows: auto; overflow-x: visible; scroll-snap-type: none; padding-block-end: 0;';
  const resetItem = 'margin-block-end: 0; scroll-snap-align: none; grid-column: auto; grid-row: auto;';
  const bento = (pattern: string, rules: [string, string][]) =>
    rules.map(
      ([nth, span]) =>
        `${cls('bento')}.ce-gallery--bento-${pattern} > .ce-gallery__track > :where(${nth}) { ${span} }`,
    );
  return [
    `${cls('grid')} { --ce-gallery-mode: grid; }`,
    `${track('grid')} { ${resetTrack} display: grid; grid-template-columns: repeat(var(--ce-gallery-cols), minmax(0, 1fr)); }`,
    `${item('grid')} { ${resetItem} }`,
    `${img('grid')} { aspect-ratio: var(--ce-aspect, auto); block-size: auto; inline-size: 100%; }`,
    `${controls('grid')} { display: none; }`,

    `${cls('masonry')} { --ce-gallery-mode: masonry; }`,
    `${track('masonry')} { ${resetTrack} display: block; columns: var(--ce-gallery-cols); column-gap: var(--ce-gallery-gap); }`,
    `${item('masonry')} { ${resetItem} margin-block-end: var(--ce-gallery-gap); break-inside: avoid; }`,
    `${img('masonry')} { aspect-ratio: auto; block-size: auto; inline-size: 100%; }`,
    `${controls('masonry')} { display: none; }`,

    `${cls('bento')} { --ce-gallery-mode: bento; }`,
    `${track('bento')} { ${resetTrack} display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: var(--ce-bento-row, 11rem); grid-auto-flow: dense; }`,
    `${item('bento')} { ${resetItem} }`,
    `${img('bento')} { aspect-ratio: auto; block-size: 100%; inline-size: 100%; }`,
    `${controls('bento')} { display: none; }`,
    ...bento('a', [[':nth-child(6n + 1)', 'grid-column: span 2; grid-row: span 2;']]),
    ...bento('b', [
      [':nth-child(5n + 1)', 'grid-column: span 2;'],
      [':nth-child(5n + 4)', 'grid-row: span 2;'],
    ]),
    ...bento('c', [
      [':nth-child(7n + 1)', 'grid-column: span 2; grid-row: span 2;'],
      [':nth-child(7n + 4)', 'grid-column: span 2;'],
      [':nth-child(7n + 6)', 'grid-row: span 2;'],
    ]),

    `${cls('slider')} { --ce-gallery-mode: slider; }`,
    `${track('slider')} { ${resetTrack} display: grid; grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: calc((100% - (var(--ce-gallery-spv) - 1) * var(--ce-gallery-gap)) / var(--ce-gallery-spv) - var(--ce-gallery-peek, 0%)); overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; overscroll-behavior-x: contain; }`,
    `${item('slider')} { ${resetItem} scroll-snap-align: start; }`,
    `${img('slider')} { aspect-ratio: var(--ce-aspect, 16 / 9); block-size: auto; inline-size: 100%; }`,
    `${cls('slider')}.ce-is-enhanced > .ce-gallery__controls { display: flex; }`,

    `${cls('strip')} { --ce-gallery-mode: strip; }`,
    `${track('strip')} { ${resetTrack} display: grid; grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: max-content; overflow-x: auto; scroll-snap-type: x proximity; padding-block-end: 0.5rem; }`,
    `${item('strip')} { ${resetItem} scroll-snap-align: start; }`,
    `${img('strip')} { aspect-ratio: var(--ce-aspect, auto); block-size: var(--ce-strip-height, 16rem); inline-size: auto; }`,
    `${controls('strip')} { display: none; }`,
  ].join('\n');
}

export const gallery = defineBlock({
  type: 'gallery',
  category: 'media',
  outline: 'media',
  icon: 'gallery',
  props: galleryProps,
  defaultProps: {
    items: [],
    layout: 'grid',
    columns: { base: 2, md: 3 },
    slidesPerView: 1,
    arrows: true,
    dots: true,
    captions: 'below',
    effect: 'slide',
    pauseOnHover: true,
  },
  slots: [
    'root',
    'track',
    'item',
    'figure',
    'img',
    'caption',
    'controls',
    'arrow',
    'dots',
    'dot',
    'thumbs',
    'thumb',
  ],
  keywords: ['galeria', 'slider', 'karuzela', 'carousel', 'masonry', 'bento', 'zdjęcia'],
  modifiers: (p) => [
    p.captions && p.captions !== 'none' && `captions-${p.captions}`,
    p.peek && 'peek',
    `bento-${p.bentoPattern ?? 'a'}`,
    p.effect === 'fade' && 'fade',
  ],
  attributes: (p) => {
    const out = attrs();
    addResponsive(out, 'gallery', p.layout);
    addResponsive(out, 'gallery-cols', p.columns, String);
    addResponsive(out, 'gallery-spv', p.slidesPerView, String);
    addResponsive(out, 'gallery-gap', p.gap, spaceToCss);
    const ratio = aspectValue(p.aspect, p.customAspect);
    if (ratio) out.vars['--ce-aspect'] = ratio;
    if (p.stripHeight) out.vars['--ce-strip-height'] = p.stripHeight;
    return out;
  },
  responsive: [
    { kind: 'custom', key: 'gallery', css: galleryLayoutCss },
    { kind: 'var', key: 'gallery-cols', declarations: '--ce-gallery-cols-active: $;' },
    { kind: 'var', key: 'gallery-spv', declarations: '--ce-gallery-spv-active: $;' },
    { kind: 'var', key: 'gallery-gap', declarations: '--ce-gallery-gap-active: $;' },
  ],
  render: ({ block, props: p, root, slot, ctx }) => {
    const items = p.items.filter((item) => sanitizeUrl(item.image.src));
    if (!items.length) return ctx.mode === 'editor' ? <div {...root} data-ce-empty="" /> : null;
    const total = items.length;
    const { Link } = ctx.components;
    const usesSlider = Object.values(typeof p.layout === 'string' ? { base: p.layout } : p.layout).includes(
      'slider',
    );
    const trackId = `ce-gallery-${block.id}`;
    return (
      <div
        {...root}
        role={usesSlider ? 'region' : undefined}
        aria-roledescription={usesSlider ? 'carousel' : undefined}
        aria-label={ctx.t('gallery')}
      >
        <ul className={slot('track')} id={trackId} tabIndex={usesSlider ? 0 : undefined}>
          {items.map((item, i) => {
            const picture = (
              <Picture ctx={ctx} image={item.image} className={slot('img')} eager={i === 0 && usesSlider} />
            );
            const src = sanitizeUrl(item.image.src)!;
            const inner = item.link ? (
              <Link href={item.link.href} {...linkAttributes(item.link)}>
                {picture}
              </Link>
            ) : p.lightbox ? (
              <a
                href={src}
                data-ce-lightbox=""
                data-ce-caption={item.caption}
                aria-label={ctx.t('openImage')}
              >
                {picture}
              </a>
            ) : (
              picture
            );
            return (
              <li
                key={item.id}
                className={slot('item')}
                aria-roledescription={usesSlider ? 'slide' : undefined}
                aria-label={usesSlider ? ctx.t('slideOf', { n: i + 1, total }) : undefined}
                style={
                  item.focalPoint
                    ? { '--ce-focal': `${item.focalPoint.x * 100}% ${item.focalPoint.y * 100}%` }
                    : undefined
                }
              >
                <figure className={slot('figure')}>
                  {inner}
                  {item.caption && p.captions !== 'none' && (
                    <figcaption className={slot('caption')}>{item.caption}</figcaption>
                  )}
                </figure>
              </li>
            );
          })}
        </ul>
        {usesSlider && (
          <div className={slot('controls')}>
            {p.arrows && (
              <>
                <button
                  type="button"
                  className={slot('arrow', 'prev')}
                  aria-controls={trackId}
                  aria-label={ctx.t('previousSlide')}
                >
                  <Icon name="chevron-left" />
                </button>
                <button
                  type="button"
                  className={slot('arrow', 'next')}
                  aria-controls={trackId}
                  aria-label={ctx.t('nextSlide')}
                >
                  <Icon name="chevron-right" />
                </button>
              </>
            )}
            {p.autoplay ? (
              <button
                type="button"
                className={slot('arrow', 'toggle')}
                aria-controls={trackId}
                data-pause-label={ctx.t('pause')}
                data-play-label={ctx.t('play')}
                aria-label={ctx.t('pause')}
              >
                <Icon name="pause" />
              </button>
            ) : null}
            {p.dots && !p.thumbnails && (
              <div className={slot('dots')}>
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    className={slot('dot')}
                    aria-controls={trackId}
                    aria-label={ctx.t('goToSlide', { n: i + 1 })}
                  />
                ))}
              </div>
            )}
            {p.thumbnails && (
              <div className={slot('thumbs')}>
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    className={slot('thumb')}
                    aria-controls={trackId}
                    aria-label={ctx.t('goToSlide', { n: i + 1 })}
                  >
                    <Picture
                      ctx={ctx}
                      image={item.image}
                      alt=""
                      className={cx(slot('img'), 'ce-gallery__thumb-img')}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {usesSlider &&
          island(ctx, 'slider', {
            autoplay: p.autoplay ?? 0,
            pauseOnHover: p.pauseOnHover ?? true,
            loop: p.loop ?? false,
            effect: p.effect ?? 'slide',
          })}
        {p.lightbox && island(ctx, 'lightbox', lightboxLabels(ctx))}
      </div>
    );
  },
  inspector: [
    { type: 'mediaList', name: 'items', label: t('Zdjęcia', 'Images') },
    {
      type: 'select',
      name: 'layout',
      label: t('Układ', 'Layout'),
      responsive: true,
      options: [
        { value: 'grid', label: t('Siatka', 'Grid') },
        { value: 'masonry', label: t('Masonry', 'Masonry') },
        { value: 'bento', label: t('Mozaika (bento)', 'Bento') },
        { value: 'slider', label: t('Slider', 'Slider') },
        { value: 'strip', label: t('Pasek przewijany', 'Scroll strip') },
      ],
    },
    { type: 'number', name: 'columns', label: t('Kolumny', 'Columns'), responsive: true, min: 1, max: 8 },
    {
      type: 'segmented',
      name: 'bentoPattern',
      label: t('Wzór mozaiki', 'Bento pattern'),
      options: ['a', 'b', 'c'].map((value) => ({ value, label: value.toUpperCase() })),
    },
    {
      type: 'number',
      name: 'slidesPerView',
      label: t('Slajdów na ekranie', 'Slides per view'),
      responsive: true,
      min: 1,
      max: 6,
      step: 0.5,
    },
    { type: 'toggle', name: 'peek', label: t('Wysunięty następny slajd', 'Peek next slide') },
    { type: 'toggle', name: 'arrows', label: t('Strzałki', 'Arrows') },
    { type: 'toggle', name: 'dots', label: t('Kropki', 'Dots') },
    { type: 'toggle', name: 'thumbnails', label: t('Miniatury', 'Thumbnails') },
    {
      type: 'number',
      name: 'autoplay',
      label: t('Autoplay (sekundy, 0 = wył.)', 'Autoplay (seconds, 0 = off)'),
      min: 0,
      max: 60,
    },
    { type: 'toggle', name: 'pauseOnHover', label: t('Pauza po najechaniu', 'Pause on hover') },
    { type: 'toggle', name: 'loop', label: t('Pętla', 'Loop') },
    {
      type: 'segmented',
      name: 'effect',
      label: t('Efekt', 'Effect'),
      options: [
        { value: 'slide', label: t('Przesunięcie', 'Slide') },
        { value: 'fade', label: t('Przenikanie', 'Fade') },
      ],
    },
    { type: 'space', name: 'gap', label: t('Odstęp', 'Gap'), responsive: true },
    {
      type: 'select',
      name: 'aspect',
      label: t('Proporcje kafelków', 'Tile aspect ratio'),
      options: aspectOptions,
    },
    {
      type: 'segmented',
      name: 'captions',
      label: t('Podpisy', 'Captions'),
      options: [
        { value: 'none', label: t('Brak', 'None') },
        { value: 'below', label: t('Pod', 'Below') },
        { value: 'overlay', label: t('Na zdjęciu', 'Overlay') },
      ],
    },
    { type: 'toggle', name: 'lightbox', label: t('Powiększenie (lightbox)', 'Lightbox') },
    { type: 'level', name: 'style.radius', label: t('Zaokrąglenie', 'Radius') },
    { type: 'length', name: 'stripHeight', label: t('Wysokość paska', 'Strip height'), advanced: true },
  ],
  i18n: {
    pl: { name: 'Galeria', description: 'Siatka, masonry, mozaika, slider, pasek' },
    en: { name: 'Gallery', description: 'Grid, masonry, bento, slider, strip' },
  },
});

// ---------------------------------------------------------------------------------------------
// Before / after
// ---------------------------------------------------------------------------------------------

export const beforeAfter = defineBlock({
  type: 'before-after',
  category: 'media',
  outline: 'media',
  icon: 'before-after',
  props: z.object({
    before: imageSchema,
    after: imageSchema,
    orientation: z.enum(['horizontal', 'vertical']),
    beforeLabel: z.string().max(100).optional(),
    afterLabel: z.string().max(100).optional(),
    start: z.number().min(0).max(100),
    aspect: aspectSchema.optional(),
    customAspect: customAspectSchema.optional(),
  }),
  defaultProps: { before: { src: '' }, after: { src: '' }, orientation: 'horizontal', start: 50 },
  slots: ['root', 'frame', 'before', 'after', 'img', 'handle', 'range', 'label', 'caption'],
  content: true,
  textProps: ['beforeLabel', 'afterLabel'],
  keywords: ['przed po', 'porównanie', 'compare', 'slider'],
  modifiers: (p) => [p.orientation],
  attributes: (p) => {
    const out = attrs();
    out.vars['--ce-ba-pos'] = `${p.start}%`;
    const ratio = aspectValue(p.aspect, p.customAspect);
    if (ratio) out.vars['--ce-aspect'] = ratio;
    return out;
  },
  render: ({ block, props: p, root, slot, content, text, ctx }) => {
    if (!sanitizeUrl(p.before.src) || !sanitizeUrl(p.after.src)) {
      return ctx.mode === 'editor' ? <figure {...root} data-ce-empty="" /> : null;
    }
    return (
      <figure {...root}>
        <div className={slot('frame')}>
          <div className={slot('after')}>
            <Picture ctx={ctx} image={p.after} className={slot('img')} />
            <span className={slot('label', 'after')}>
              {p.afterLabel ? text('afterLabel') : ctx.t('after')}
            </span>
          </div>
          <div className={slot('before')}>
            <Picture ctx={ctx} image={p.before} className={slot('img')} />
            <span className={slot('label', 'before')}>
              {p.beforeLabel ? text('beforeLabel') : ctx.t('before')}
            </span>
          </div>
          <span className={slot('handle')} aria-hidden="true" />
          <input
            type="range"
            className={slot('range')}
            min={0}
            max={100}
            step={0.5}
            defaultValue={p.start}
            aria-label={ctx.t('beforeAfter')}
            aria-orientation={p.orientation}
          />
        </div>
        {block.content?.length ? <figcaption className={slot('caption')}>{content}</figcaption> : null}
        {island(ctx, 'before-after')}
      </figure>
    );
  },
  inspector: [
    { type: 'media', name: 'before', label: t('Zdjęcie „przed”', '“Before” image'), mediaType: 'image' },
    { type: 'media', name: 'after', label: t('Zdjęcie „po”', '“After” image'), mediaType: 'image' },
    {
      type: 'segmented',
      name: 'orientation',
      label: t('Orientacja', 'Orientation'),
      options: [
        { value: 'horizontal', label: t('Pozioma', 'Horizontal') },
        { value: 'vertical', label: t('Pionowa', 'Vertical') },
      ],
    },
    { type: 'text', name: 'beforeLabel', label: t('Etykieta „przed”', '“Before” label') },
    { type: 'text', name: 'afterLabel', label: t('Etykieta „po”', '“After” label') },
    {
      type: 'slider',
      name: 'start',
      label: t('Pozycja startowa (%)', 'Start position (%)'),
      min: 0,
      max: 100,
    },
    { type: 'select', name: 'aspect', label: t('Proporcje', 'Aspect ratio'), options: aspectOptions },
  ],
  i18n: {
    pl: { name: 'Przed / po', description: 'Dwa zdjęcia z przeciąganym suwakiem' },
    en: { name: 'Before / after', description: 'Two images with a draggable divider' },
  },
});

// ---------------------------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------------------------

const heroMedia = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('image'),
    image: imageSchema,
    mobileImage: imageSchema.optional(),
    focalPoint: focalPointSchema.optional(),
  }),
  z.strictObject({ type: z.literal('video'), src: safeUrl, poster: imageSchema.optional() }),
]);

export const hero = defineBlock({
  type: 'hero',
  category: 'media',
  outline: 'section',
  icon: 'hero',
  props: z.object({
    media: heroMedia.optional(),
    overlay: z.number().min(0).max(1),
    minHeight: responsive(z.union([cssLength, z.literal('screen')])),
    horizontalAlign: responsive(z.enum(['left', 'center', 'right'])).optional(),
    verticalAlign: z.enum(['start', 'center', 'end']),
    contentWidth: z.enum(['normal', 'wide', 'full']),
    parallax: z.boolean().optional(),
  }),
  defaultProps: {
    overlay: 0.45,
    minHeight: { base: '28rem', md: '36rem' },
    verticalAlign: 'center',
    contentWidth: 'normal',
  },
  slots: ['root', 'media', 'img', 'video', 'inner'],
  container: { nests: true },
  keywords: ['hero', 'baner', 'banner', 'nagłówek strony', 'cover'],
  create: () => ({
    type: 'hero',
    props: {
      overlay: 0.45,
      minHeight: { base: '28rem', md: '36rem' },
      verticalAlign: 'center',
      contentWidth: 'normal',
    },
    children: [{ id: '', type: 'heading', props: { level: 2, size: '5xl' }, content: [] }],
  }),
  modifiers: (p) => [`valign-${p.verticalAlign}`, `content-${p.contentWidth}`, p.parallax && 'parallax'],
  attributes: (p) => {
    const out = attrs();
    out.vars['--ce-hero-overlay'] = String(p.overlay);
    addResponsive(out, 'min-h', p.minHeight, (v) => (v === 'screen' ? '100svh' : v));
    addResponsive(out, 'align', p.horizontalAlign);
    if (p.media?.type === 'image') focalVars(out, p.media.focalPoint);
    return out;
  },
  render: ({ props: p, root, slot, children, ctx }) => {
    const media = p.media;
    return (
      <section {...root}>
        {media && (
          <div className={slot('media')} aria-hidden="true">
            {media.type === 'image' ? (
              <Picture
                ctx={ctx}
                image={media.image}
                mobile={media.mobileImage}
                alt=""
                className={slot('img')}
                eager
                sizes="100vw"
              />
            ) : (
              <>
                {media.poster && (
                  <Picture
                    ctx={ctx}
                    image={media.poster}
                    alt=""
                    className={slot('img')}
                    eager
                    sizes="100vw"
                  />
                )}
                <video
                  className={slot('video')}
                  src={sanitizeUrl(media.src)}
                  poster={media.poster ? sanitizeUrl(media.poster.src) : undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              </>
            )}
          </div>
        )}
        <div className={slot('inner', 'ce-flow')}>{children}</div>
        {(p.parallax || media?.type === 'video') &&
          island(ctx, 'parallax', { parallax: p.parallax ?? false })}
      </section>
    );
  },
  inspector: [
    { type: 'heroMedia', name: 'media', label: t('Zdjęcie lub wideo', 'Image or video') },
    { type: 'slider', name: 'overlay', label: t('Przyciemnienie', 'Overlay'), min: 0, max: 1, step: 0.05 },
    {
      type: 'length',
      name: 'minHeight',
      label: t('Min. wysokość', 'Min height'),
      responsive: true,
      allowScreen: true,
    },
    {
      type: 'align',
      name: 'horizontalAlign',
      label: t('Wyrównanie tekstu', 'Text alignment'),
      responsive: true,
    },
    {
      type: 'segmented',
      name: 'verticalAlign',
      label: t('Wyrównanie w pionie', 'Vertical alignment'),
      options: [
        { value: 'start', label: t('Góra', 'Top') },
        { value: 'center', label: t('Środek', 'Middle') },
        { value: 'end', label: t('Dół', 'Bottom') },
      ],
    },
    {
      type: 'segmented',
      name: 'contentWidth',
      label: t('Szerokość treści', 'Content width'),
      options: [
        { value: 'normal', label: t('Normalna', 'Normal') },
        { value: 'wide', label: t('Szeroka', 'Wide') },
        { value: 'full', label: t('Pełna', 'Full') },
      ],
    },
    { type: 'toggle', name: 'parallax', label: t('Paralaksa', 'Parallax') },
  ],
  i18n: {
    pl: { name: 'Hero', description: 'Zdjęcie lub wideo na pełną szerokość z tekstem' },
    en: { name: 'Hero', description: 'Full-width image or video with text on top' },
  },
});

// ---------------------------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------------------------

const videoSource = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('file'), src: safeUrl }),
  z.strictObject({ type: z.literal('embed'), url: z.string().max(2048) }),
]);

export const video = defineBlock({
  type: 'video',
  category: 'embed',
  outline: 'embed',
  icon: 'video',
  props: z.object({
    source: videoSource.optional(),
    title: z.string().max(300).optional(),
    aspect: aspectSchema,
    customAspect: customAspectSchema.optional(),
    thumbnail: imageSchema.optional(),
    /** Background mode: muted, looped, autoplaying, no controls. */
    background: z.boolean().optional(),
  }),
  defaultProps: { aspect: '16/9' },
  slots: ['root', 'frame', 'player', 'poster', 'play', 'caption'],
  content: true,
  textProps: ['title'],
  keywords: ['wideo', 'film', 'youtube', 'vimeo', 'mp4'],
  modifiers: (p) => [p.background && 'background'],
  attributes: (p) => {
    const out = attrs();
    const ratio = aspectValue(p.aspect, p.customAspect);
    if (ratio) out.vars['--ce-aspect'] = ratio;
    return out;
  },
  render: ({ block, props: p, root, slot, content, ctx }) => {
    const source = p.source;
    const caption = block.content?.length ? (
      <figcaption className={slot('caption')}>{content}</figcaption>
    ) : null;
    if (!source) return ctx.mode === 'editor' ? <figure {...root} data-ce-empty="" /> : null;
    const title = p.title || inlineToPlainText(block.content) || 'Video';
    if (source.type === 'file') {
      const poster = p.thumbnail ? sanitizeUrl(p.thumbnail.src) : undefined;
      return (
        <figure {...root}>
          <div className={slot('frame')}>
            <video
              className={slot('player')}
              src={sanitizeUrl(source.src)}
              poster={poster}
              controls={!p.background}
              autoPlay={p.background}
              muted={p.background}
              loop={p.background}
              playsInline
              preload="metadata"
              aria-label={title}
            />
          </div>
          {caption}
        </figure>
      );
    }
    const embed = parseEmbedUrl(source.url, ['youtube', 'vimeo']);
    if (!embed || embed.kind !== 'iframe') return null;
    const thumb = p.thumbnail?.src
      ? sanitizeUrl(p.thumbnail.src)
      : embed.provider === 'youtube'
        ? `https://i.ytimg.com/vi/${embed.id}/hqdefault.jpg`
        : undefined;
    const params = p.background
      ? 'autoplay=1&mute=1&loop=1&controls=0&playsinline=1&muted=1&background=1'
      : 'autoplay=1';
    const src = `${embed.embedUrl}?${params}${p.background && embed.provider === 'youtube' ? `&playlist=${embed.id}` : ''}`;
    return (
      <figure {...root}>
        {/* Lite embed: nothing from the provider loads until the reader asks for it. */}
        <div className={slot('frame')}>
          <a href={embed.canonicalUrl} className={slot('play')} aria-label={ctx.t('playVideo', { title })}>
            {thumb && <img className={slot('poster')} src={thumb} alt="" loading="lazy" decoding="async" />}
            <Icon name="play" size={56} />
          </a>
        </div>
        {caption}
        {island(ctx, 'lite-video', { src, title, autoload: p.background ?? false })}
      </figure>
    );
  },
  inspector: [
    {
      type: 'videoSource',
      name: 'source',
      label: t('Źródło (plik, YouTube, Vimeo)', 'Source (file, YouTube, Vimeo)'),
    },
    { type: 'text', name: 'title', label: t('Tytuł (dla czytników ekranu)', 'Title (for screen readers)') },
    { type: 'select', name: 'aspect', label: t('Proporcje', 'Aspect ratio'), options: aspectOptions },
    { type: 'media', name: 'thumbnail', label: t('Miniatura', 'Thumbnail'), mediaType: 'image' },
    {
      type: 'toggle',
      name: 'background',
      label: t('Tryb tła (wyciszone, pętla, autoplay)', 'Background mode (muted, loop, autoplay)'),
    },
  ],
  i18n: {
    pl: { name: 'Wideo', description: 'Plik wideo, YouTube lub Vimeo' },
    en: { name: 'Video', description: 'Video file, YouTube or Vimeo' },
  },
});

// ---------------------------------------------------------------------------------------------
// Embed
// ---------------------------------------------------------------------------------------------

const PROVIDER_NAMES: Record<EmbedProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  x: 'X',
  instagram: 'Instagram',
  spotify: 'Spotify',
  'google-maps': 'Google Maps',
  codepen: 'CodePen',
};

const PROVIDER_ASPECT: Partial<Record<EmbedProvider, string>> = {
  youtube: '16 / 9',
  vimeo: '16 / 9',
  'google-maps': '4 / 3',
  codepen: '4 / 3',
};

export const embed = defineBlock({
  type: 'embed',
  category: 'embed',
  outline: 'embed',
  icon: 'embed',
  props: z.object({
    url: z.string().max(4096),
    /** `click`: load after consent (default); `visible`: when scrolled into view. */
    loadOn: z.enum(['click', 'visible']),
    /** Fixed height for providers without an aspect ratio (Spotify, X). */
    height: cssLength.optional(),
    title: z.string().max(300).optional(),
  }),
  defaultProps: { url: '', loadOn: 'click' },
  slots: ['root', 'frame', 'consent', 'button', 'static', 'caption'],
  content: true,
  textProps: ['title'],
  keywords: ['osadź', 'embed', 'twitter', 'x', 'instagram', 'spotify', 'mapa', 'maps', 'codepen', 'iframe'],
  modifiers: (p) => {
    const info = parseEmbedUrl(p.url);
    return [info && `provider-${info.provider}`];
  },
  attributes: (p) => {
    const out = attrs();
    const info = parseEmbedUrl(p.url);
    const aspect = info && PROVIDER_ASPECT[info.provider];
    if (aspect) out.vars['--ce-aspect'] = aspect;
    if (p.height) out.vars['--ce-embed-height'] = p.height;
    return out;
  },
  render: ({ block, props: p, root, slot, content, ctx }) => {
    const info = parseEmbedUrl(p.url, EMBED_PROVIDERS);
    if (!info) return ctx.mode === 'editor' ? <figure {...root} data-ce-empty="" /> : null;
    const provider = PROVIDER_NAMES[info.provider];
    const title = p.title || `${provider}`;
    const caption = block.content?.length ? (
      <figcaption className={slot('caption')}>{content}</figcaption>
    ) : null;
    const consent = (
      <div className={slot('consent')}>
        <p>{ctx.t('embedConsent', { provider })}</p>
        <button type="button" className={slot('button')}>
          {ctx.t('loadEmbed', { provider })}
        </button>
        <a href={info.canonicalUrl} target="_blank" rel="noopener noreferrer">
          {ctx.t('openOn', { provider })}
        </a>
      </div>
    );
    if (info.kind === 'script') {
      // The provider's documented markup doubles as a static preview (a link to the post).
      const staticMarkup =
        info.provider === 'x' ? (
          <blockquote className="twitter-tweet" data-dnt="true">
            <a href={info.canonicalUrl}>{ctx.t('openOn', { provider })}</a>
          </blockquote>
        ) : (
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={info.canonicalUrl}
            data-instgrm-version="14"
          >
            <a href={info.canonicalUrl}>{ctx.t('openOn', { provider })}</a>
          </blockquote>
        );
      return (
        <figure {...root}>
          <div className={slot('static')}>{staticMarkup}</div>
          {ctx.mode !== 'editor' && consent}
          {caption}
          {island(ctx, 'script-embed', { provider: info.provider, loadOn: p.loadOn })}
        </figure>
      );
    }
    return (
      <figure {...root}>
        <div className={slot('frame')}>{ctx.mode !== 'editor' && consent}</div>
        {caption}
        {island(ctx, 'lite-video', {
          src: info.embedUrl,
          title,
          autoload: p.loadOn === 'visible',
          lazy: true,
        })}
      </figure>
    );
  },
  inspector: [
    {
      type: 'url',
      name: 'url',
      label: t(
        'Adres (X, Instagram, Spotify, Mapy Google, CodePen…)',
        'URL (X, Instagram, Spotify, Google Maps, CodePen…)',
      ),
    },
    {
      type: 'segmented',
      name: 'loadOn',
      label: t('Ładowanie', 'Loading'),
      options: [
        { value: 'click', label: t('Po kliknięciu (zgoda)', 'On click (consent)') },
        { value: 'visible', label: t('Po wejściu w widok', 'When visible') },
      ],
    },
    { type: 'length', name: 'height', label: t('Wysokość', 'Height'), advanced: true },
    { type: 'text', name: 'title', label: t('Tytuł (dla czytników ekranu)', 'Title (for screen readers)') },
  ],
  i18n: {
    pl: { name: 'Osadzenie', description: 'X, Instagram, Spotify, Mapy Google, CodePen' },
    en: { name: 'Embed', description: 'X, Instagram, Spotify, Google Maps, CodePen' },
  },
});

// ---------------------------------------------------------------------------------------------
// File download
// ---------------------------------------------------------------------------------------------

function fileIcon(name: string, mime?: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(ext))
    return 'file-image';
  if (mime?.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)) return 'file-video';
  if (mime?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'file-audio';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'file-archive';
  if (['js', 'ts', 'json', 'html', 'css', 'py', 'xml'].includes(ext)) return 'file-code';
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'odt', 'rtf', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'].includes(ext))
    return 'file-text';
  return 'file';
}

export const file = defineBlock({
  type: 'file',
  category: 'media',
  outline: 'media',
  icon: 'file',
  props: z.object({
    file: z
      .strictObject({
        src: safeUrl,
        id: z.string().max(200).optional(),
        name: z.string().max(300),
        size: z.number().int().nonnegative().optional(),
        mime: z.string().max(200).optional(),
      })
      .optional(),
    title: z.string().max(300).optional(),
    description: z.string().max(1000).optional(),
  }),
  defaultProps: {},
  slots: ['root', 'icon', 'body', 'title', 'meta', 'action'],
  textProps: ['title', 'description'],
  keywords: ['plik', 'pobierz', 'download', 'pdf', 'attachment', 'załącznik'],
  render: ({ props: p, root, slot, text, ctx }) => {
    if (!p.file) return ctx.mode === 'editor' ? <div {...root} data-ce-empty="" /> : null;
    const ext = p.file.name.includes('.') ? p.file.name.split('.').pop()!.toUpperCase() : undefined;
    const meta = [ext, p.file.size !== undefined ? formatBytes(p.file.size, ctx.locale) : undefined]
      .filter(Boolean)
      .join(' · ');
    return (
      <a {...root} href={sanitizeUrl(p.file.src)} download={p.file.name}>
        <Icon name={fileIcon(p.file.name, p.file.mime)} className={slot('icon')} size={28} />
        <span className={slot('body')}>
          <span className={slot('title')}>{p.title ? text('title') : p.file.name}</span>
          {(meta || p.description) && (
            <span className={slot('meta')}>
              {p.description && <>{text('description')} · </>}
              {meta}
            </span>
          )}
        </span>
        <span className={slot('action')}>
          <Icon name="download" size={18} />
          <span className="ce-visually-hidden">{ctx.t('download')}</span>
        </span>
      </a>
    );
  },
  inspector: [
    { type: 'media', name: 'file', label: t('Plik', 'File'), mediaType: 'file' },
    { type: 'text', name: 'title', label: t('Nazwa wyświetlana', 'Display name') },
    { type: 'text', name: 'description', label: t('Opis', 'Description') },
  ],
  i18n: {
    pl: { name: 'Plik do pobrania', description: 'Załącznik z ikoną, nazwą i rozmiarem' },
    en: { name: 'File download', description: 'Attachment with icon, name and size' },
  },
});
