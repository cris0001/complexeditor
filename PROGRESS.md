# Progress

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done. Spec: `prompt-edytor.md`. Decisions: `REPORT.md`.

## Next step

Stage 8 — demo app (`apps/demo`, Next.js 16 App Router + Tailwind v4). Already there: `/playground` (no DB, localStorage) and `lib/sample-docs.ts`.

1. Database: Drizzle + PostgreSQL (`docker-compose.yml`, `.env.example`), schema: users (roles admin/editor/author), posts (translation group, locale, slug, status draft/published/scheduled, publishAt, SEO fields, document JSON, generatedCss, translatedFromHash), post_versions, media, global_blocks, saved_styles, templates, theme settings.
2. Auth: simple own auth (argon2/scrypt via node:crypto, HTTP-only session cookie, sessions table) with roles → editor permissions.
3. Media: route handler upload (sharp → WebP, several sizes, limits, safe names) into `UPLOAD_DIR` outside the app, `/media/[...path]` route for development, nginx example in docs.
4. Admin `/admin`: login, posts list (filters language/status), editor page (autosave via server action / route), version history with preview/restore, media library page, global blocks, templates, theme editor with live preview.
5. Public: `/[locale]/blog`, `/[locale]/blog/[slug]` (RSC renderer, TOC, reading time, hreflang, language switch, fallback policy, dark mode).
6. Seed script with PL/EN posts showing every block (block catalog page).
7. Playground: README section on deploying it (static, Vercel).

Notes: the Bash tool here strips `\\` in heredocs and the Write tool turns `\uXXXX` into real characters; use the Edit tool for such code. `pnpm --filter complexeditor build` before running the demo.

## 14. Stages

- [x] 1. Monorepo, tooling, CI
- [x] 2. Data format: types, Zod, migrations, helpers, tests
- [x] 3. Block engine: `defineBlock`, registry, theme, renderer + responsive styles, `@layer`, slots & `classes`
- [x] 4. All blocks: renderers and styles (+ client islands)
- [x] 5. Editor: state, history, canvas, panels, DnD, Tiptap + conversion, outlines, inspector, slash menu, shortcuts, paste
- [x] 6. Media: upload, link, media library
- [x] 7. i18n (UI + content), permissions, saved styles, global blocks, templates, variants
- [~] 8. Demo app with all features and seed (playground done)
- [ ] 9. Tailwind live mode
- [ ] 10. E2E tests, accessibility, performance (bundle size renderer vs editor)
- [ ] 11. Documentation and publish preparation

## Detailed checklist

### 4. Data format

- [x] Block shape (id, type, props, style, classes per slot, content, children, untranslated marker)
- [x] Responsive values · [x] version + migrations · [x] Zod validation, readable errors, unknown block warning + fallback
- [x] Security: no raw HTML, URL sanitizing, embed allow-list (script embeds for X/Instagram), safe class lists
- [x] Localized values strategy · [x] Helpers: TOC, reading time, plain text, translation hash/copy

### 5. Blocks

- [x] Heading · Paragraph · Quote · Callout · Code · Separator · inline marks
- [x] List · Table · Section · Columns · Grid · nesting limit
- [x] Image · Gallery (grid, masonry, bento, slider, strip) · Before/after · Lightbox
- [x] Hero · Video · Embed · File · Buttons · Accordion/FAQ · Tabs · Card · Stats · Timeline · Global block

### 6. Common style panel

- [x] Margin/padding · Width · Align · Background · Radius/border/shadow · Animations · Visibility · Anchor + class · Variants

### 7. Responsiveness

- [x] Theme breakpoints · device switcher + set-here dot + reset · custom switch point (albatross) · container queries (default) + media mode · no-JS responsive CSS

### 8. Media

- [x] Callback API · link-only mode · upload (pick, drop on canvas, paste, multiple → gallery, progress, cancel, retry)
- [x] Media library (grid, search, infinite scroll, single/multi select, alt/caption per language, delete, dimensions)
- [x] Swappable Image component, srcset, lazy, width/height
- [ ] Demo disk storage + sharp + nginx docs (stage 8)

### 9. Theme & styling

- [x] Theme → CSS vars (fonts, fluid type, palette, spacing, radii, shadows, breakpoints, buttons, dark mode)
- [x] Component overrides · `ce-`/`--ce-` naming · `@layer` order vs Tailwind · no inline property styles (tests)
- [x] Separate renderer/editor CSS (editor scoped to `.ce-editor`)
- [x] Slots `classNames` API + typed `defineClassNames` · variants · custom class field (allow-list / off)
- [ ] `complexeditor/tailwind` theme integration (stage 9)
- [ ] Tailwind live mode (stage 9)
- [ ] Theme editor in demo (stage 8)

### 10. Editor UI

- [x] 3 panels (palette + search, structure tree with DnD, canvas, inspector Basic/Advanced) · action bar
- [x] Category outlines (colors, hover label, selected box, depth offsets, empty drop zone, drop indicator, toggle)
- [x] Slash menu · shortcuts + markdown shortcuts · document undo/redo
- [x] Paste from Word/Docs/web · block copy/paste (also across posts) · autosave + status + retry
- [x] Keyboard/aria/focus basics · touch (pointer events) · permissions
- [ ] Manual a11y audit + e2e (stage 10)

### 11. i18n

- [x] UI dictionaries PL/EN + overrides + extra languages · renderer strings PL/EN
- [x] Content: language switch, "Copy from PL", untranslated markers, outdated-translation hash
- [x] Media alt/caption per language · [x] global blocks / templates per language
- [ ] Demo routing `/pl`, `/en`, hreflang, fallback (stage 8)

### 12. Reuse & extensibility

- [x] Saved styles (save, insert, apply) · global blocks (reference, edit dialog, detach, lazy load) · templates
- [x] `defineBlock` (built-ins use it) · declarative inspector fields + custom field types · renderer/UI overrides

### 13. Demo app

- [~] Admin (login, posts, editor, media, global blocks, templates, theme editor)
- [ ] Draft/published/scheduled, version history, roles, SEO, TOC, reading time
- [ ] Public blog, language switch, hreflang, fallback, dark mode
- [ ] Seed (all blocks), Postgres, docker-compose, `.env.example`
- [x] Static playground (no DB) · [ ] deploy docs

### 15. Docs & publishing

- [ ] Package README · [ ] THIRD_PARTY_LICENSES · [ ] Changesets/CHANGELOG · [ ] publish-ready package.json
- [ ] REPORT.md complete (8 sections)
