# Zadanie: blokowy edytor treści (React / Next.js) jako biblioteka npm + aplikacja demo

## 0. Jak masz pracować (przeczytaj najpierw)

- Budujesz **pełną wersję** opisaną poniżej, a nie MVP. Nie pomijaj funkcji z założeniem „później”.
- **Nie zadawaj mi pytań.** Gdy trzeba coś zdecydować (wybór biblioteki, szczegół API, nazwa, kształt danych, UX), zdecyduj sam, wybierając rozwiązanie najlepsze dla jakości, utrzymania i doświadczenia użytkownika. Każdą istotną decyzję zapisz w raporcie (sekcja 15).
- Jeśli czegoś nie da się zrobić albo świadomie coś uprościsz, napisz to wprost w raporcie. Nie udawaj, że działa.
- Pracuj etapami (kolejność w sekcji 14) i commituj po każdym etapie z czytelnym opisem.
- Kod, nazwy, komentarze i dokumentacja techniczna (README) po angielsku. Interfejs edytora w PL i EN (sekcja 11).
- Projekt jest **publiczny i open source** (publiczne repo na GitHubie, później publiczna paczka npm), więc README, przykłady i historia commitów mają być czytelne dla obcych osób. **Raport końcowy po polsku.**
- Jakość ma być na poziomie biblioteki open source do portfolio: TypeScript strict, czyste API, testy, dokumentacja, brak martwego kodu.

## 0.1 Ciągłość pracy (limity, reset, nowe sesje)

To zadanie jest duże i na pewno zostanie przerwane (limit użycia, koniec sesji, reset kontekstu). Pracuj tak, żeby **każda kolejna sesja mogła od razu kontynuować bez pytania mnie o cokolwiek**:

- Prowadź w repo plik **`PROGRESS.md`**: checklistę wszystkich punktów z sekcji 14 (i podpunktów z sekcji 5–13), ze statusem `[ ]` / `[~]` w trakcie / `[x]` gotowe, oraz sekcję **„Następny krok”** z konkretnym opisem, od czego zacząć po wznowieniu (plik, funkcja, co zostało do dokończenia).
- Aktualizuj `PROGRESS.md` i **commituj + pushuj często** (po każdej zamkniętej mniejszej części, nie tylko po etapie), żeby przerwanie w dowolnym momencie nie zgubiło więcej niż kilkunastu minut pracy. Nie zostawiaj niezacommitowanych zmian na dłużej.
- Decyzje zapisuj na bieżąco w `REPORT.md` (sekcja decyzji), a nie dopiero na końcu.
- **Na początku każdej sesji**: przeczytaj ten plik, `PROGRESS.md`, `REPORT.md` i `git log`, sprawdź, czy build i testy przechodzą, i kontynuuj od „Następnego kroku”. Nie zaczynaj od nowa i nie przepisuj gotowych części bez powodu.
- **Wiadomość „kontynuuj”** (albo dowolna podobna, również wysłana automatycznie przez zaplanowane zadanie) oznacza: wznów pracę według powyższej procedury.
- Jeśli masz dostęp do narzędzia planowania (np. zaplanowane zadanie / przypomnienie wysyłane do sesji), na początku pracy **zaplanuj sobie cykliczne wznowienie** (np. co 5 godzin) z wiadomością „kontynuuj według prompt-edytor.md i PROGRESS.md”, a po ukończeniu całości je wyłącz. Jeśli takiego narzędzia nie masz, zapisz to w raporcie.
- Pracuj do momentu, aż **wszystkie** punkty w `PROGRESS.md` będą `[x]` i raport będzie kompletny. Dopiero wtedy uznaj zadanie za skończone.

## 1. Cel

Biblioteka do tworzenia treści blogowych z **gotowych, ostylowanych klocków** (nagłówki, tekst, zdjęcia, galerie, kontenery z flexem/gridem itd.). Redaktor składa post z klocków w wizualnym edytorze, a deweloper w pełni kontroluje wygląd przez motyw i własne komponenty.

- Treść zapisywana jako **JSON** (nie HTML).
- Osobny **renderer** zamienia JSON na HTML/React na stronie publicznej, po stronie serwera, bez kodu edytora.
- Biblioteka **niczego nie zapisuje sama**: upload, lista mediów, zapis posta itd. to funkcje (callbacki) przekazywane przez projekt.
- Docelowo publiczna paczka npm. Na start używana w moim projekcie Next.js (App Router), który działa na **własnym serwerze Linux** (zdjęcia na dysku serwera, serwowane przez nginx; baza PostgreSQL).

## 2. Struktura repozytorium (monorepo)

```
/
├── packages/
│   └── editor/            # biblioteka (publikowana na npm)
├── apps/
│   └── demo/              # aplikacja Next.js: wzorcowa integracja + demo/playground do portfolio
├── .github/workflows/     # CI
├── pnpm-workspace.yaml
├── prompt-edytor.md       # ten plik (specyfikacja)
├── PROGRESS.md            # postęp + „Następny krok” (sekcja 0.1)
└── REPORT.md              # raport i decyzje (po polsku)
```

- pnpm workspaces. `apps/demo` korzysta z `packages/editor` lokalnie (`workspace:*`).
- Nazwa paczki: `complexeditor` (wolna na npm). Ustaw ją w jednym miejscu, żeby dało się ją łatwo zmienić przed publikacją.
- Biblioteka **nie może zależeć** od niczego z `apps/demo` (bazy, routingu, auth, stylów strony).

### Wejścia paczki (subpath exports)
- `complexeditor/schema`: typy, schematy walidacji, wersjonowanie i migracje, narzędzia (np. wyciąganie nagłówków do spisu treści, czas czytania, czysty tekst do wyszukiwarki). Bez Reacta.
- `complexeditor/renderer`: renderowanie dokumentu. Działa w React Server Components, nie importuje Tiptapa ani kodu edytora. Interaktywne klocki (slider, akordeon, taby, lightbox, przed/po, licznik) jako małe, leniwie ładowane komponenty klienckie.
- `complexeditor/editor`: edytor (komponent kliencki).
- `complexeditor/styles.css` (oraz osobno style edytora): domyślne style oparte na zmiennych CSS.
- `complexeditor/i18n`: słowniki PL/EN interfejsu edytora.
- `complexeditor/tailwind` i `complexeditor/tailwind/server`: opcjonalna integracja z Tailwindem (sekcja 9.1).

Build: tsup (albo równoważne narzędzie, jeśli uznasz za lepsze), ESM + typy `.d.ts`, `sideEffects` poprawnie ustawione, tree-shaking. React i ReactDOM jako `peerDependencies`.

## 3. Stos technologiczny (rekomendacje, możesz zmienić z uzasadnieniem w raporcie)

- TypeScript (strict), React 19, Next.js (App Router) w demo.
- **Tiptap: wyłącznie do edycji tekstu wewnątrz klocków tekstowych** (formatowanie inline). Cały system klocków, układów, drag & drop, panel ustawień itd. piszesz sam. Format Tiptapa **nie trafia do bazy**: przy każdej zmianie konwertujesz go na nasz format `content` (sekcja 4). Konwersja w obie strony musi być bezstratna i przetestowana. Używaj **wyłącznie darmowych rozszerzeń Tiptapa na licencji MIT** (żadnych płatnych Tiptap Pro / Cloud ani rozszerzeń wymagających konta lub klucza). Tiptap jest zależnością tylko wejścia `complexeditor/editor`; renderer i `schema` nie mogą go importować (sprawdź to testem / analizą bundla).
- dnd-kit (lub równoważne) do drag & drop, również między zagnieżdżonymi kontenerami.
- Zod do walidacji dokumentu.
- Slider/karuzela: lekka biblioteka (np. Embla) albo własna implementacja. Twoja decyzja.
- Demo: PostgreSQL + ORM (Prisma albo Drizzle, Twoja decyzja), sharp do przetwarzania zdjęć, Auth.js lub prosta własna autoryzacja, docker-compose z Postgresem do developmentu.
- Testy: Vitest (+ Testing Library), Playwright do e2e.

## 4. Format danych

```jsonc
{
  "version": 1,
  "blocks": [
    {
      "id": "unikalne-id",
      "type": "heading",
      "props": { "level": 2, "align": { "base": "left", "md": "center" } },
      "style": { /* wspólne ustawienia stylu – sekcja 6 */ },
      "content": [
        { "text": "Moja podróż do " },
        { "text": "Włoch", "marks": [{ "type": "bold" }] },
        { "text": "link", "marks": [{ "type": "link", "href": "https://..." }] }
      ]
    },
    {
      "id": "...",
      "type": "columns",
      "props": { "...": "..." },
      "children": [ /* klocki; dla kolumn: tablica kolumn z klockami – zaprojektuj spójnie */ ]
    }
  ]
}
```

Wymagania:
- Każdy klocek: `id`, `type`, `props`, opcjonalnie `style`, `classes`, `content` (tekst inline jako tablica fragmentów z `marks`), `children` (zagnieżdżone klocki).
- **`classes`**: klasy wpisane w edytorze, zapisywane **w samym bloku** per slot, np. `"classes": { "root": "mt-12 md:mt-20", "text": "text-red-300 font-black" }`. To część dokumentu (walidowana w Zod, objęta migracjami), a nie tylko stan podglądu: renderer na stronie publicznej nakłada je na odpowiednie elementy, a kopiowanie / duplikowanie / zapisane style / klocki globalne / „Skopiuj z PL” przenoszą je razem z blokiem. Wygenerowany CSS dla tych klas (sekcja 9.1, tryb Tailwind) jest przechowywany przy dokumencie, więc klasy działają po zapisie także na stronie publicznej.
- **Wartości responsywne**: każda opcja oznaczona jako responsywna przyjmuje wartość prostą albo obiekt `{ base, sm, md, lg, xl }` (mobile-first, dziedziczenie w górę). Punkty przełączania definiuje motyw.
- `version` + system **migracji** (funkcje `migrate(doc)` między wersjami), żeby stare dokumenty dało się automatycznie podnieść do nowego formatu.
- Pełna walidacja (Zod) z czytelnymi błędami. Nieznany typ klocka nie wywraca renderera (fallback + ostrzeżenie w dev).
- Bezpieczeństwo: brak surowego HTML w danych, sanityzacja URL-i (blokada `javascript:` itp.), bezpieczne osadzanie (whitelista dostawców embedów).
- Ustal, gdzie i jak zapisywane są wartości językowe (sekcja 11).

## 5. Katalog klocków i ich opcje

### Tekst
- **Nagłówek**: poziom H2–H4 (H1 to tytuł posta, poza klockami), rozmiar niezależny od poziomu, wyrównanie, kolor z palety, wariant czcionki, nadtytuł, dekoracja (akcent pod spodem, numeracja), kotwica (dla spisu treści).
- **Akapit**: rozmiar (wstęp / normalny / mały), wyrównanie, inicjał, tekst w 2 kolumnach od wybranego punktu przełączania.
- **Cytat**: warianty (kreska, duży cudzysłów, wyśrodkowany pull-quote), autor, źródło.
- **Callout / ramka**: warianty (info, uwaga, sukces, ciekawostka), ikona, tytuł, opcja zwijania.
- **Kod**: język, podświetlanie składni, numeracja linii, przycisk „kopiuj”, nazwa pliku.
- **Separator**: linia, kropki, ozdobnik, sam odstęp.
- **Formatowanie inline** (Tiptap, tylko te opcje): pogrubienie, kursywa, podkreślenie, przekreślenie, link (z opcją nowej karty i `rel`), zakreślenie, kolor z palety (bez dowolnych kolorów), kod inline, indeks górny i dolny.

### Listy i tabele
- **Lista**: punktowana, numerowana, checklista, strzałki, własna ikona; odstępy; lista w kilku kolumnach (responsywnie); zagnieżdżone podpunkty; formatowanie inline w punktach.
- **Tabela**: wiersz/kolumna nagłówkowa, paski, wyrównanie per kolumna, formatowanie inline w komórkach; na telefonie do wyboru przewijanie w bok albo zamiana na karty.

### Układ
- **Sekcja**: główny kontener; tło (kolor z palety, gradient, zdjęcie z przyciemnieniem), padding, min. wysokość, szerokość (normalna / szeroka / pełna / własna), wyrównanie treści w pionie.
- **Kolumny (flex)**: proporcje (50/50, 33/67, 67/33, 25/75, 3 i 4 kolumny, własne), odstęp, wyrównanie w pionie i poziomie, odwrócenie kolejności, zawijanie, kolejność kolumn per urządzenie. **Wszystko responsywnie.** Linie między kolumnami (opcjonalnie). Przyklejona kolumna (sticky).
- **Siatka (grid)**: liczba kolumn per urządzenie albo tryb auto (min. szerokość kafelka), odstępy.
- Zagnieżdżanie: kontenery mogą zawierać dowolne klocki. Ustal rozsądny limit głębokości (domyślnie: kontener w kontenerze dozwolony maks. 1 poziom, limit konfigurowalny) i opisz decyzję w raporcie.

### Zdjęcia i galerie
- **Zdjęcie**: proporcje (oryginalne, 16:9, 4:3, 1:1, 3:4, własne), **punkt ostrości** (wybierany kliknięciem; używany w `object-position`), **inne zdjęcie na telefonie** (art direction), podpis (pod / na zdjęciu), alt, link, powiększenie (lightbox), efekt hover, zaokrąglenie, cień, szerokość (normalna / szeroka / pełna).
- **Galeria**: jedna lista zdjęć i wiele układów, przełączanych bez utraty zdjęć. **Układ responsywny** (np. siatka na desktopie, slider na telefonie):
  1. siatka (kolumny per urządzenie),
  2. masonry,
  3. mozaika/bento (kilka gotowych wzorów),
  4. **slider/karuzela**: liczba slajdów per urządzenie, „wysunięty” następny slajd, strzałki / kropki / miniatury, autoplay z czasem, pauza na hover, pętla, efekt slide/fade, swipe i drag, podpisy na slajdach, dostępność (klawiatura, aria),
  5. pasek przewijany w bok ze scroll-snap.
  Wspólne: odstęp, proporcje kafelków, zaokrąglenie, podpisy, kolejność przez drag & drop, lightbox.
- **Przed/po**: dwa zdjęcia z przeciąganym suwakiem (mysz, dotyk, klawiatura), orientacja pozioma/pionowa, etykiety.
- **Lightbox** (wspólny): pełny ekran, swipe, zoom, podpis, licznik „3 / 12”, klawiatura, focus trap.

### Inne media
- **Hero**: zdjęcie lub wideo na pełną szerokość, tekst na wierzchu (klocki w środku), przyciemnienie, opcjonalna paralaksa (z poszanowaniem `prefers-reduced-motion`).
- **Wideo**: upload/link, YouTube, Vimeo (lite embed, ładowanie po kliknięciu), proporcje, miniatura, tryb tła (muted, loop, autoplay).
- **Embed**: X/Twitter, Instagram, Spotify, Google Maps, CodePen (whitelista, lazy).
- **Plik do pobrania**: ikona typu, nazwa, rozmiar.

### Interaktywne
- **Przycisk / grupa przycisków**: warianty z motywu, rozmiary, ikona, nowa karta, pełna szerokość na telefonie.
- **Akordeon / FAQ**: jeden lub wiele otwartych, opcjonalnie dane strukturalne FAQ (JSON-LD).
- **Zakładki (taby)**: na telefonie opcjonalnie zamiana w akordeon.
- **Karta**: zdjęcie, tytuł, tekst, przycisk.
- **Licznik / statystyki**: animacja przy wejściu w widok.
- **Oś czasu**.

## 6. Wspólne ustawienia stylu każdego klocka (panel „Styl”)

- Margines i padding (góra/dół, opcjonalnie boki): skala z motywu (none/XS/S/M/L/XL) albo własna wartość. Responsywnie.
- Szerokość: normalna / szeroka / pełna / własna max-width.
- Wyrównanie.
- Tło: kolor z palety, gradient, zdjęcie z przyciemnieniem.
- Zaokrąglenie, obramowanie, cień: poziomy z motywu.
- Animacja przy przewijaniu: fade, slide (kierunek), zoom, opóźnienie. Respektuj `prefers-reduced-motion`.
- Widoczność per urządzenie (ukryj na telefonie / tablecie / desktopie).
- Kotwica (`id`), własna klasa CSS.
- **Wariant stylu**: nazwane presety zdefiniowane w motywie.

## 7. Responsywność

- Punkty przełączania definiowane w motywie (domyślnie np. sm 640, md 768, lg 1024, xl 1280).
- Opcje oznaczone jako responsywne mają w panelu ustawień **przełącznik urządzenia** (📱 / tablet / 🖥️). Wartość ustawiona na danym urządzeniu jest oznaczona kropką i ma przycisk reset (powrót do dziedziczenia).
- Dla kontenerów/kolumn opcja zaawansowana: **własny punkt przełączenia** (np. „układ kolumnowy poniżej 800 px”).
- Kontenery mogą działać w trybie **container queries** (reagują na szerokość kontenera, nie ekranu). Ustaw sensowny domyślny tryb i opisz decyzję.
- Renderer generuje responsywne style bez runtime JS (klasy + zmienne CSS + media/container queries), bez inline `<style>` na każdy klocek, jeśli da się tego uniknąć. Zaprojektuj to wydajnie i opisz w raporcie.

## 8. Media: upload, link, biblioteka mediów

Zdjęcie można dodać na dwa sposoby: **link** albo **upload**. Biblioteka nie zapisuje plików, tylko woła funkcje projektu:

```ts
onUpload?: (file: File, ctx: { signal: AbortSignal; onProgress(p: number): void }) =>
  Promise<{ id: string; url: string; width?: number; height?: number; alt?: LocalizedString; /* ... */ }>
onListMedia?: (q: { query?: string; cursor?: string; type?: 'image' | 'video' | 'file' }) =>
  Promise<{ items: MediaItem[]; nextCursor?: string }>
onDeleteMedia?: (id: string) => Promise<void>
onUpdateMedia?: (id: string, patch: Partial<MediaItem>) => Promise<MediaItem>   // alt/podpis per język
```

(Kształty są poglądowe: dopracuj je i opisz finalne API w README.)

- Brak `onUpload` oznacza tryb tylko-link (UI to pokazuje).
- Upload: wybór pliku, przeciągnięcie pliku na edytor, **wklejenie zdjęcia ze schowka**, wiele plików naraz (galeria). Postęp, anulowanie, obsługa błędów (komunikat, ponowienie).
- **Biblioteka mediów** (modal/zakładka): siatka miniatur, wyszukiwanie, nieskończone przewijanie, wybór jednego lub wielu, edycja alt/podpisu (PL/EN), usuwanie, info o wymiarach.
- Renderer: możliwość podmiany komponentu obrazka (np. na `next/image`), `width`/`height` przeciw layout shift, `loading="lazy"`, `srcset`, jeśli projekt dostarczy warianty rozmiarów.
- Demo (`apps/demo`): implementacja na dysku serwera. Katalog z env `UPLOAD_DIR` **poza aplikacją** (nie `public/`), sharp: konwersja do WebP, kilka rozmiarów, limit rozmiaru i typów plików, bezpieczne nazwy, tabela `media` w bazie. W developmencie serwowanie przez route handler, a dla produkcji przykładowa konfiguracja **nginx** w dokumentacji.

## 9. Motyw i czcionki

- Motyw jako obiekt konfiguracyjny → zmienne CSS: czcionki (Google Fonts lub pliki własne), skala typografii (płynna, `clamp()`), paleta kolorów (nazwane kolory używane w edytorze), skala odstępów, zaokrąglenia, cienie, punkty przełączania, warianty stylów klocków, warianty przycisków, **tryb ciemny**.
- Redaktor wybiera tylko warianty z motywu (np. „nagłówek ozdobny”), nigdy dowolne czcionki czy kolory.
- Projekt może: nadpisać zmienne CSS, podać własne klasy, **podmienić komponent renderujący dowolnego klocka**.
- W demo: wizualny edytor motywu (kolory, czcionki, skale) z podglądem na żywo.

### 9.1 Sposób stylowania

- **Biblioteka: zwykły CSS, bez Tailwinda** (żaden użytkownik nie może być zmuszony do posiadania Tailwinda ani konkretnej jego wersji). Bez CSS-in-JS z runtime.
- Wszystkie klasy z prefiksem **`ce-`** (np. `ce-heading`, `ce-columns`, `ce-gallery--slider`), konwencja nazw spójna i opisana w README.
- Wszystkie wartości wizualne jako zmienne CSS z prefiksem **`--ce-`** (kolory, czcionki, skale, odstępy, zaokrąglenia, cienie, punkty przełączania tam, gdzie to możliwe).
- Style biblioteki w **`@layer`** (np. `@layer ce.base, ce.blocks, ce.variants`), żeby style projektu, w tym utility classes Tailwinda, zawsze wygrywały bez `!important`. Nadpisywane mają być tylko właściwości ustawione przez klasę projektu, a reszta stylu klocka zostaje (zwykła kaskada CSS). Zapewnij poprawną kolejność warstw względem warstw Tailwinda (`theme`, `base`, `components`, `utilities`), również dla stylów responsywnych (media/container queries) biblioteki.
- **Zakaz stylów inline z konkretnymi właściwościami** (`style="color: ..."`, `style="flex-direction: ..."`) w rendererze i podglądzie, bo klasy projektu by ich nie nadpisały. Wartości z ustawień klocka przekazuj wyłącznie jako **zmienne CSS** (`style="--ce-gap: 2rem"`) albo klasy, a właściwości ustawiaj w CSS na podstawie tych zmiennych. Dodaj test, który to sprawdza.
- Osobne pliki: style renderera (strona publiczna) i style edytora (UI, panele, obramowania). Style edytora nie mogą wyciekać na resztę strony ani zmieniać wyglądu podglądu posta. Podgląd w edytorze używa tych samych stylów co renderer, żeby wyglądał 1:1 jak opublikowany post.
- Kompatybilność z Tailwindem: działanie obok Tailwind v4 (i v3) bez konfliktów; własna klasa CSS klocka i podmienione komponenty mogą używać klas Tailwinda; opcjonalny eksport integrujący motyw z Tailwindem (np. `complexeditor/tailwind`: tokeny motywu jako kolory/czcionki w Tailwind). Przetestuj to w demo.
- `apps/demo` stylowane Tailwindem (layout strony, panel admina), jako dowód, że biblioteka działa z Tailwindem.

#### Klasy przypisywane przez projekt (API `classNames` / slots)
- Każdy klocek ma nazwane **sloty** (części), np. `image: { root, figure, img, caption }`, `columns: { root, column }`, `gallery: { root, item, img, caption, arrow, dots }`, `heading: { root, eyebrow, text }` itd. Każdy slot ma domyślną klasę `ce-...` i przyjmuje dodatkowe klasy.
- Projekt przekazuje klasy w konfiguracji (renderer i edytor korzystają z tej samej konfiguracji, żeby podgląd był 1:1):
  - globalnie per typ klocka i slot,
  - **per wariant** (np. wariant „Ramka wyróżniona” = zestaw klas),
  - opcjonalnie jako funkcja od propsów klocka (np. inne klasy dla `level: 2` i `level: 3`).
- Klasy łączone są w przewidywalny sposób (domyślne `ce-*` + klasy projektu). Opcjonalny hook/opcja do mergowania (np. `tailwind-merge`) podawany przez projekt, bez twardej zależności w bibliotece.
- Typy TypeScript dla slotów każdego klocka (autouzupełnianie nazw slotów), również dla własnych klocków z `defineBlock`.

#### Warianty (główny mechanizm dla redaktorów)
- Redaktor wybiera **warianty** z listy (nazwa PL/EN + opcjonalny podgląd), a ich klasy definiuje projekt w kodzie. To domyślny, bezpieczny sposób, który trzyma spójny design.
- Pole „własna klasa CSS” (zakładka Zaawansowane) dla klas zdefiniowanych w CSS projektu. Projekt może ograniczyć je do listy dozwolonych klas albo całkiem wyłączyć.

#### Tryb Tailwind na żywo (opcjonalny, dla zaawansowanych)
Problem: Tailwind generuje klasy podczas builda, więc klasy wpisane w edytorze i zapisane w bazie normalnie by nie działały. Rozwiąż to tak:
- **Edytor:** przy każdym slocie klocka (zakładka Zaawansowane) pole „Klasy Tailwind”. Wpisanie np. `text-red-300` **od razu zmienia podgląd** dzięki kompilacji Tailwinda w przeglądarce (Tailwind v4, np. `@tailwindcss/browser` albo kompilator v4 uruchomiony w przeglądarce / web workerze, z debounce). Ładuj to leniwie, tylko gdy tryb jest włączony.
- **Ten sam motyw co projekt:** kompilacja używa konfiguracji Tailwinda projektu (w v4: wejściowy plik CSS z `@theme` itd. przekazany w konfiguracji), żeby działały własne kolory, czcionki i breakpointy (`brand-500`, `md:`, `dark:` itd.).
- **Zapis:** przy zapisie dokumentu serwer zbiera wszystkie klasy Tailwinda użyte w poście, kompiluje **minimalny CSS tylko dla nich** (Node API Tailwinda v4) i zwraca/zapisuje go razem z postem (np. pole `generatedCss`, z hashem do cache). Udostępnij do tego helper serwerowy, np. `complexeditor/tailwind/server`.
- **Strona publiczna:** renderer dołącza wygenerowany CSS posta, więc w przeglądarce nie ma runtime'u Tailwinda. Zadbaj o to, żeby kolejność warstw (`@layer`) pozwalała tym klasom nadpisywać style `ce-*`.
- **Podpowiedzi:** autouzupełnianie klas (lista z design systemu Tailwinda projektu), podgląd koloru, podkreślanie nieznanych klas.
- **Bezpieczeństwo:** walidacja składni klas; blokada lub whitelista arbitralnych wartości (np. `bg-[url(...)]`, `content-[...]`), limit długości.
- **Uprawnienia:** tryb domyślnie wyłączony; włączany w konfiguracji tylko dla wybranych ról (np. admin/dev). Bez Tailwinda w projekcie tryb jest niedostępny, a biblioteka działa normalnie.
- Całość jako opcjonalny moduł `complexeditor/tailwind` (Tailwind jako opcjonalna peerDependency), bez wpływu na rozmiar paczki dla projektów bez Tailwinda.
- **Wersje Tailwinda:** paczka nigdy nie zawiera Tailwinda w bundlu; zawsze używa wersji zainstalowanej w projekcie użytkownika (opcjonalna peerDependency przez `peerDependenciesMeta: { tailwindcss: { optional: true } }`; zakres wersji dobierz tak, żeby projekt z v3 albo bez Tailwinda nie dostawał błędów instalacji, a wersję sprawdzaj w runtime). W monorepo Tailwind tylko jako devDependency (testy) i w `apps/demo`.
  - Projekt bez Tailwinda → wszystko działa poza trybem na żywo.
  - Projekt z Tailwind v3 → działają sloty i warianty z klasami Tailwinda (klasy są w kodzie projektu); tryb na żywo jest wyłączony z czytelnym komunikatem w edytorze i opisem w README. Import `complexeditor/tailwind` z v3 nie może wywracać aplikacji (wykrycie wersji + ostrzeżenie).
  - Projekt z Tailwind v4 → wszystko, łącznie z trybem na żywo.
- W demo pokaż wszystkie mechanizmy na Tailwindzie (sloty, warianty, tryb na żywo) i opisz w README, jak to skonfigurować. Przetestuj e2e: wpisanie klasy zmienia podgląd, po zapisie klasa działa na stronie publicznej.

## 10. Edytor: UI i UX

### Układ (3 panele)
- **Lewy panel**: zakładka „Klocki” (grupy: Tekst, Układ, Media, Interaktywne, Osadzanie, Globalne; wyszukiwarka; kliknięcie dodaje pod zaznaczonym elementem, przeciągnięcie wstawia w wybrane miejsce, również do konkretnej kolumny) oraz zakładka **„Struktura”** (drzewko jak warstwy w Figmie, z drag & drop, zwijaniem i zaznaczaniem).
- **Środek**: canvas z podglądem posta i **edycją bezpośrednio na podglądzie**. Na górze przełącznik szerokości (telefon / tablet / desktop), przełącznik języka treści (PL/EN), przełącznik „Pokaż obramowania”, cofnij/ponów, status autozapisu.
- **Prawy panel (inspektor)**: ustawienia zaznaczonego elementu z zakładkami **„Podstawowe”** i **„Zaawansowane”** na górze. Podstawowe to najważniejsze opcje, a Zaawansowane resztę (własne punkty przełączania, kolejność, animacje, kotwica, klasa CSS, widoczność itd.). Przełącznik urządzenia przy opcjach responsywnych, reset przy każdej opcji.
- **Pasek akcji przy zaznaczonym klocku**: przesuń ↑↓, przeciągnij, duplikuj, usuń, zapisz jako styl, zapisz jako klocek globalny, zaznacz rodzica.

### Obramowania klocków w edytorze (tylko w edytorze, nigdy w renderze)
Wszystko poza zwykłym tekstem ma **przerywane (dashed) obramowanie w kolorze swojej kategorii**:

| Kategoria | Kolor |
|---|---|
| Sekcja / kontener | niebieski |
| Kolumny / siatka / kolumna | fioletowy |
| Zdjęcia i galerie | zielony |
| Wideo i embedy | czerwony |
| Interaktywne | pomarańczowy |
| Wyróżnienia (callout, cytat, karta) | żółty |
| Klocki globalne | różowy |

- Domyślnie cienkie i półprzezroczyste; po najechaniu wyraźniejsze, z etykietą typu (np. „Kolumny 33/67”); po zaznaczeniu ciągłe, grubsze, z etykietą i paskiem akcji.
- Zagnieżdżone obramowania nie nakładają się (offset).
- Pusty kontener/kolumna: przerywane pole „Przeciągnij tutaj klocek” z przyciskiem „+”.
- Wskaźnik miejsca upuszczenia podczas przeciągania.
- Kolory konfigurowalne (zmienne CSS / opcja edytora). Przełącznik „Pokaż obramowania” chowa je wszystkie.

### Wygoda pisania
- Menu **„/”** (slash command) z wyszukiwaniem klocków.
- Skróty klawiszowe (formatowanie, cofnij/ponów, duplikuj, usuń, przesuwanie klocków, Enter tworzy nowy akapit, Backspace w pustym klocku go usuwa, markdown shortcuts typu `## ` → nagłówek, `- ` → lista).
- Historia cofnij/ponów dla całego dokumentu (nie tylko tekstu).
- **Wklejanie z Worda / Google Docs / stron WWW** z konwersją na nasze klocki i czyszczeniem formatowania.
- Kopiuj/wklej klocków (również między postami, przez schowek).
- Autozapis przez callback `onChange` / `onSave` z debounce + wskaźnik stanu.
- Pełna obsługa klawiaturą, aria, focus management.
- Działa na ekranach dotykowych (tablet).

### Uprawnienia
- Konfiguracja, które klocki i które opcje (w tym cała zakładka „Zaawansowane”) są dostępne. Projekt przekazuje ją np. zależnie od roli użytkownika.

## 11. Dwa języki (PL / EN)

### Język interfejsu edytora
- Wszystkie teksty UI w słownikach PL i EN, wybór przez prop `locale`. Projekt może dodać własny język i nadpisać pojedyncze teksty.

### Język treści
- Post ma wersje PL i EN połączone jako tłumaczenia (np. wspólny `translationGroupId`). Każda wersja to osobny dokument z własnym slugiem, statusem i SEO.
- W edytorze: przełącznik PL/EN, akcja **„Skopiuj z PL”** (ten sam układ i ustawienia, teksty do przetłumaczenia; opcjonalnie oznaczone jako nieprzetłumaczone).
- Oznaczanie **„tłumaczenie nieaktualne”**, gdy wersja źródłowa zmieniła się po przetłumaczeniu (np. hash źródła).
- Media: plik wspólny, alt i podpis per język.
- Klocki globalne i szablony też w wersjach PL/EN.
- W demo: routing `/pl/...` i `/en/...`, przełącznik języka prowadzący do odpowiednika posta, konfigurowalny fallback przy braku tłumaczenia (pokaż wersję PL / ukryj / przekieruj), tagi `hreflang`.
- Biblioteka dostarcza narzędzia (typy, helpery kopiowania, wykrywanie nieaktualności), a resztę realizuje demo.

## 12. Wielokrotne użycie i rozszerzalność

- **Zapisane style**: zapis ustawień klocka jako nazwany preset.
- **Klocki globalne**: edytowane raz, aktualizowane wszędzie (referencja w dokumencie + callbacki do pobierania/zapisu).
- **Szablony postów** (np. „Recenzja”, „Relacja z podróży”, „Poradnik”).
- **API własnych klocków**: `defineBlock({ type, category, icon, schema, defaultProps, editor, renderer, inspector, i18n, ... })`, a projekt rejestruje własne klocki bez modyfikowania biblioteki. Wbudowane klocki mają być zdefiniowane **tym samym API** (dowód, że jest wystarczające).
- Pola inspektora definiowane deklaratywnie (typy pól: select, segmenty, kolor z palety, suwak, przełącznik, media, link, odstęp, responsywne opakowanie dowolnego pola itd.).
- Podmiana komponentów renderera i elementów UI edytora.

## 13. Aplikacja demo (`apps/demo`)

Wzorcowa integracja, która ma też dobrze wyglądać w portfolio:
- Panel `/admin`: logowanie, lista postów (filtry: język, status), edytor, biblioteka mediów, klocki globalne, szablony, edytor motywu.
- Funkcje blogowe: szkic / opublikowany / zaplanowany, **historia wersji** z podglądem i przywracaniem, autorzy i role (admin, redaktor, autor; różne uprawnienia w edytorze), pola SEO (tytuł, opis, obraz OG, slug), automatyczny spis treści, czas czytania.
- Strona publiczna: `/[locale]/blog` (lista), `/[locale]/blog/[slug]` (post renderowany na serwerze), przełącznik języka, tryb ciemny.
- Seed z przykładowymi postami w PL i EN, które **pokazują wszystkie klocki i układy** (strona-katalog klocków).
- Upload na dysk (sekcja 8), PostgreSQL, docker-compose, `.env.example`.
- **Publiczny playground do portfolio:** dodatkowy tryb/strona demo działająca **bez bazy i bez serwera** (dokument w pamięci + `localStorage`, zdjęcia jako lokalne object URL / przykładowe zdjęcia), którą da się wdrożyć za darmo (np. Vercel) i podlinkować w README. Pełny edytor, podgląd na urządzeniach, przełącznik PL/EN, przykładowe posty, podgląd JSON-a dokumentu, przycisk „reset”. Opisz w README, jak go wdrożyć.

## 14. Kolejność pracy (wszystko ma być zrobione, to tylko kolejność)

1. Monorepo, tooling, CI (lint, typecheck, test, build).
2. Format danych: typy, Zod, migracje, helpery, testy.
3. Silnik klocków: `defineBlock`, rejestr, motyw, renderer + responsywne style, warstwy `@layer`, sloty i `classes` (fundament hybrydy CSS + Tailwind).
4. Wszystkie klocki: renderery i style.
5. Edytor: stan dokumentu, historia, canvas, panele, drag & drop, Tiptap + konwersja, obramowania, inspektor, slash menu, skróty, wklejanie.
6. Media: upload, link, biblioteka mediów.
7. i18n (UI i treść), uprawnienia, style zapisane, klocki globalne, szablony, warianty.
8. Aplikacja demo ze wszystkimi funkcjami i seedem.
9. **Tryb Tailwind na żywo** (sekcja 9.1): osobny, opcjonalny moduł, robiony po ukończeniu i przetestowaniu reszty, żeby nie blokował głównej pracy. Format `classes` i sloty muszą być gotowe już od etapu 3.
10. Testy e2e kluczowych ścieżek, dostępność, wydajność (rozmiar bundla renderera vs edytora).
11. Dokumentacja i przygotowanie do publikacji.

## 15. Dokumentacja, publikacja i raport

- `packages/editor/README.md`: instalacja, szybki start (Next.js), pełne API, format danych, motyw, własne klocki, media i callbacki, i18n, uprawnienia, migracje, integracja z `next/image`, przykład nginx.
- **Licencje zależności:** używaj wyłącznie bibliotek na licencjach permisywnych (MIT, Apache-2.0, BSD, ISC), żeby całość mogła być użyta również w zamkniętym, komercyjnym produkcie. Żadnych zależności GPL/LGPL/AGPL ani płatnych. Dodaj skrypt sprawdzający licencje w CI oraz plik `THIRD_PARTY_LICENSES` (lub równoważny) z informacjami o prawach autorskich zależności.
- LICENSE (MIT, w jednym pliku, łatwy do zmiany, jeśli zdecyduję się na inną licencję), CHANGELOG (changesets), `package.json` gotowy do `npm publish` (exports, files, peerDependencies, keywords, repository). **Nie publikuj** paczki.
- **`REPORT.md` po polsku**, zawierający:
  1. co zostało zrobione (wg sekcji tego dokumentu),
  2. **listę wszystkich decyzji podjętych samodzielnie** z krótkim uzasadnieniem i alternatywami,
  3. co zostało uproszczone, pominięte albo nie działa w pełni, i dlaczego,
  4. znane problemy i ryzyka,
  5. jak uruchomić projekt lokalnie i jak uruchomić testy,
  6. **jak podpiąć bibliotekę do mojego istniejącego projektu Next.js** (krok po kroku: instalacja, upload na dysk, nginx, baza, renderowanie postów),
  7. co zrobić przed publikacją na npm,
  8. propozycje dalszego rozwoju.
