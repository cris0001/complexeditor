/** Strings used by the public renderer (buttons and labels inside interactive blocks). */
export const rendererMessages = {
  en: {
    copy: 'Copy',
    copied: 'Copied',
    previousSlide: 'Previous slide',
    nextSlide: 'Next slide',
    goToSlide: 'Go to slide {n}',
    slideOf: 'Slide {n} of {total}',
    gallery: 'Gallery',
    openImage: 'Open image',
    close: 'Close',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    previousImage: 'Previous image',
    nextImage: 'Next image',
    imageOf: '{n} / {total}',
    pause: 'Pause',
    play: 'Play',
    beforeAfter: 'Before and after comparison',
    before: 'Before',
    after: 'After',
    playVideo: 'Play video: {title}',
    loadEmbed: 'Load content from {provider}',
    embedConsent: 'This loads content and scripts from {provider}.',
    openOn: 'Open on {provider}',
    download: 'Download',
    tableOfContents: 'Table of contents',
    expand: 'Expand',
    collapse: 'Collapse',
  },
  pl: {
    copy: 'Kopiuj',
    copied: 'Skopiowano',
    previousSlide: 'Poprzedni slajd',
    nextSlide: 'Następny slajd',
    goToSlide: 'Przejdź do slajdu {n}',
    slideOf: 'Slajd {n} z {total}',
    gallery: 'Galeria',
    openImage: 'Otwórz zdjęcie',
    close: 'Zamknij',
    zoomIn: 'Powiększ',
    zoomOut: 'Pomniejsz',
    previousImage: 'Poprzednie zdjęcie',
    nextImage: 'Następne zdjęcie',
    imageOf: '{n} / {total}',
    pause: 'Wstrzymaj',
    play: 'Odtwórz',
    beforeAfter: 'Porównanie przed i po',
    before: 'Przed',
    after: 'Po',
    playVideo: 'Odtwórz wideo: {title}',
    loadEmbed: 'Załaduj treść z serwisu {provider}',
    embedConsent: 'Spowoduje to wczytanie treści i skryptów z serwisu {provider}.',
    openOn: 'Otwórz w serwisie {provider}',
    download: 'Pobierz',
    tableOfContents: 'Spis treści',
    expand: 'Rozwiń',
    collapse: 'Zwiń',
  },
} satisfies Record<string, Record<string, string>>;

export type RendererMessageKey = keyof (typeof rendererMessages)['en'];
export type RendererMessages = Record<RendererMessageKey, string>;

/** Resolves messages for a locale (`pl-PL` → `pl`), falling back to English, with overrides on top. */
export function getRendererMessages(
  locale?: string,
  overrides?: Partial<RendererMessages>,
): RendererMessages {
  const lang = (locale ?? 'en').toLowerCase().split('-')[0] as keyof typeof rendererMessages;
  return { ...rendererMessages.en, ...(rendererMessages[lang] ?? {}), ...overrides };
}

/** Replaces `{name}` placeholders. */
export function format(message: string, values: Record<string, string | number> = {}): string {
  return message.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
