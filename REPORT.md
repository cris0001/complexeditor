# Raport

Dokument uzupełniany na bieżąco. Pełna wersja (8 sekcji z §15 specyfikacji) powstanie na końcu.

## Decyzje podjęte samodzielnie

| # | Decyzja | Uzasadnienie | Alternatywy |
|---|---|---|---|
| 1 | pnpm 11 (przez corepack, `packageManager` w root `package.json`) | wersja zainstalowana lokalnie, workspaces zgodne ze specyfikacją | npm/yarn workspaces |
| 2 | Override `esbuild` do jednej wersji (`^0.28.2`) w `pnpm-workspace.yaml` | tsup i vite ciągnęły dwie wersje, których postinstall na Windows nadpisywał wspólną binarkę i instalacja padała | izolowane wersje, rezygnacja z tsup |
| 3 | tsup jako bundler biblioteki, dwie konfiguracje: wejścia serwerowe (bez dyrektywy) i klienckie (`'use client'` jako banner) | sugerowany w specyfikacji, stabilny, generuje `.d.ts`; rozdział gwarantuje, że renderer/schema działają w RSC | tsdown, Rollup, Vite library mode |
| 4 | CSS budowany prostym skryptem (konkatenacja plików `src/styles/renderer.*.css` i `editor.*.css`) | czysty CSS bez preprocesora, pełna kontrola nad kolejnością `@layer` | PostCSS, Lightning CSS |
| 5 | ESLint 9 (flat config) + typescript-eslint + react-hooks, Prettier | standard ekosystemu | Biome |
| 6 | Licencje sprawdzane skryptem `scripts/check-licenses.mjs` na bazie `pnpm licenses list` (allow-lista SPDX; `--write` generuje `THIRD_PARTY_LICENSES.md`) | brak dodatkowej zależności | license-checker |
| 7 | Nazwa paczki `complexeditor` ustawiona w `packages/editor/package.json` (pole `name`); demo importuje przez `workspace:*` | jedno źródło prawdy dla publikacji; zmiana nazwy = zmiana pola + find/replace importów w demo | alias w tsconfig paths |
| 8 | `tailwindcss` jako opcjonalna peerDependency z zakresem `>=3.0.0` | projekt z v3 lub bez Tailwinda nie dostaje błędów instalacji; wersja sprawdzana w runtime | `^4` (blokowałoby v3) |

## Uwagi i ograniczenia (na bieżąco)

- Brak zdalnego repozytorium (GitHub CLI `gh` nie jest zainstalowane, brak `remote`). Commity są lokalne; push wymaga dodania `origin` przez właściciela.
- Cykliczne wznawianie sesji: celowo nie zaplanowane na prośbę użytkownika (oszczędzanie limitu). Wznowienie: wiadomość „kontynuuj”.
