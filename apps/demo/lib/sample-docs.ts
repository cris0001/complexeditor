import type { Block, ContentDocument } from 'complexeditor/schema';

let n = 0;
const id = (prefix: string) => `${prefix}-${++n}`;
const text = (value: string) => [{ text: value }];
const p = (value: string): Block => ({ id: id('p'), type: 'paragraph', props: {}, content: text(value) });
const photo = (seed: string, w = 1600, h = 1000) => ({
  src: `https://picsum.photos/seed/${seed}/${w}/${h}`,
  alt: seed,
  width: w,
  height: h,
});

export const SAMPLE_IMAGES = ['alps', 'lake', 'city', 'forest', 'coast', 'desert', 'market', 'bridge'].map(
  (seed) => ({
    id: seed,
    url: photo(seed).src,
    type: 'image' as const,
    name: `${seed}.jpg`,
    width: 1600,
    height: 1000,
    thumbnailUrl: `https://picsum.photos/seed/${seed}/300/300`,
    alt: { pl: `Zdjęcie: ${seed}`, en: `Photo: ${seed}` },
  }),
);

function travelPost(lang: 'pl' | 'en'): ContentDocument {
  const L = (pl: string, en: string) => (lang === 'pl' ? pl : en);
  return {
    version: 1,
    blocks: [
      {
        id: id('hero'),
        type: 'hero',
        props: {
          media: { type: 'image', image: photo('alps', 2000, 1100) },
          overlay: 0.45,
          minHeight: { base: '24rem', md: '32rem' },
          verticalAlign: 'center',
          contentWidth: 'normal',
        },
        children: [
          {
            id: id('h'),
            type: 'heading',
            props: { level: 2, size: '5xl', eyebrow: L('Relacja z podróży', 'Travel story') },
            content: text(L('Tydzień w Alpach', 'A week in the Alps')),
          },
          {
            id: id('p'),
            type: 'paragraph',
            props: { size: 'lead' },
            content: text(
              L('Szlaki, schroniska i jedno bardzo zimne jezioro.', 'Trails, huts and one very cold lake.'),
            ),
          },
        ],
      },
      {
        id: id('p'),
        type: 'paragraph',
        props: { size: 'lead', dropCap: true },
        content: [
          { text: L('Wyruszyliśmy o świcie. ', 'We set off at dawn. ') },
          { text: L('Pogoda dopisała', 'The weather held up'), marks: [{ type: 'bold' }] },
          { text: L(', a mapa – jak zwykle – okazała się ', ', and the map – as usual – turned out to be ') },
          {
            text: L('nieco optymistyczna', 'a little optimistic'),
            marks: [{ type: 'italic' }, { type: 'highlight' }],
          },
          { text: '.' },
        ],
      },
      {
        id: id('h'),
        type: 'heading',
        props: { level: 2, decoration: 'underline' },
        content: text(L('Trasa', 'The route')),
      },
      {
        id: id('cols'),
        type: 'columns',
        props: { layout: { base: '100', md: '33-67' }, gap: 'm', verticalAlign: 'center' },
        children: [
          {
            id: id('col'),
            type: 'column',
            props: {},
            children: [
              {
                id: id('img'),
                type: 'image',
                props: {
                  image: photo('lake', 1200, 1500),
                  aspect: '3/4',
                  captionPosition: 'below',
                  lightbox: true,
                  hover: 'zoom',
                },
                style: { radius: 'm' },
                content: text(L('Jezioro o 6 rano', 'The lake at 6 am')),
              },
            ],
          },
          {
            id: id('col'),
            type: 'column',
            props: {},
            children: [
              p(
                L(
                  'Pierwszego dnia doszliśmy do schroniska nad jeziorem. Woda miała może osiem stopni.',
                  'On the first day we reached the hut by the lake. The water was maybe eight degrees.',
                ),
              ),
              {
                id: id('list'),
                type: 'list',
                props: { style: 'check' },
                children: [
                  {
                    id: id('li'),
                    type: 'list-item',
                    props: { checked: true },
                    content: text(L('Kurtka przeciwdeszczowa', 'Rain jacket')),
                  },
                  {
                    id: id('li'),
                    type: 'list-item',
                    props: { checked: true },
                    content: text(L('Czołówka', 'Head torch')),
                  },
                  {
                    id: id('li'),
                    type: 'list-item',
                    props: { checked: false },
                    content: text(L('Kąpielówki', 'Swimsuit')),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: id('callout'),
        type: 'callout',
        props: { variant: 'tip', icon: 'auto', title: L('Ciekawostka', 'Did you know?') },
        children: [
          p(
            L(
              'Schroniska w Alpach trzeba rezerwować nawet kilka miesięcy wcześniej.',
              'Alpine huts often have to be booked months in advance.',
            ),
          ),
        ],
      },
      {
        id: id('gallery'),
        type: 'gallery',
        props: {
          items: ['city', 'forest', 'coast', 'bridge', 'market'].map((seed) => ({
            id: seed,
            image: photo(seed, 1400, 1000),
            caption: seed,
          })),
          layout: { base: 'slider', md: 'bento' },
          slidesPerView: { base: 1.2 },
          lightbox: true,
          captions: 'overlay',
          bentoPattern: 'a',
        },
        style: { width: 'wide', radius: 'm' },
      },
      {
        id: id('q'),
        type: 'quote',
        props: { variant: 'pull', author: 'John Muir' },
        content: text(L('Góry wzywają i muszę iść.', 'The mountains are calling and I must go.')),
      },
      {
        id: id('section'),
        type: 'section',
        props: { contentWidth: 'normal' },
        style: { background: { type: 'color', color: 'surface' }, padding: { top: 'l', bottom: 'l' } },
        children: [
          {
            id: id('h'),
            type: 'heading',
            props: { level: 3, align: 'center' },
            content: text(L('W liczbach', 'In numbers')),
          },
          {
            id: id('stats'),
            type: 'stats',
            props: { columns: { base: 2, md: 3 }, animate: true },
            children: [
              {
                id: id('stat'),
                type: 'stat',
                props: { value: 86, suffix: ' km', label: L('przebyte', 'walked') },
              },
              {
                id: id('stat'),
                type: 'stat',
                props: { value: 5200, suffix: ' m', label: L('przewyższeń', 'of ascent') },
              },
              { id: id('stat'), type: 'stat', props: { value: 4, label: L('schroniska', 'huts') } },
            ],
          },
        ],
      },
      {
        id: id('acc'),
        type: 'accordion',
        props: { allowMultiple: false, faqSchema: true },
        children: [
          {
            id: id('ai'),
            type: 'accordion-item',
            props: { title: L('Kiedy jechać?', 'When to go?') },
            children: [p(L('Najlepiej od lipca do września.', 'July to September is best.'))],
          },
          {
            id: id('ai'),
            type: 'accordion-item',
            props: { title: L('Ile to kosztuje?', 'How much does it cost?') },
            children: [
              p(L('Około 80 € dziennie za nocleg z wyżywieniem.', 'Around €80 a day for a bed and meals.')),
            ],
          },
        ],
      },
      {
        id: id('btns'),
        type: 'buttons',
        props: { align: 'center' },
        children: [
          {
            id: id('btn'),
            type: 'button',
            props: {
              label: L('Zobacz mapę trasy', 'See the route map'),
              href: 'https://www.openstreetmap.org',
              variant: 'primary',
              icon: 'map-pin',
              newTab: true,
            },
          },
        ],
      },
    ],
  };
}

export const SAMPLE_DOCS = { pl: travelPost('pl'), en: travelPost('en') };
