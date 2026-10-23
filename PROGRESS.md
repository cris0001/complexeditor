# Progress

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done. Spec: `prompt-edytor.md`. Decisions: `REPORT.md`.

## Next step

Stage 3 — block engine (`packages/editor/src/core/`, `src/renderer/`, `src/styles/`):

1. `core/define-block.ts`: `defineBlock({ type, category, icon, props (zod), defaultProps, slots, textProps, container: { childTypes?, isContainer }, render, editor?, inspector?, i18n })` with typed slot names.
2. `core/registry.ts`: `createRegistry(blocks)` → lookup, `validateOptions()` (feeds `validateDocument` with `blockProps`/`knownTypes`), `textProps`, nesting depth check (default: max 1 container inside a container).
3. `core/theme.ts`: `defineTheme` + default theme, `themeToCss()` → `--ce-*` vars (dark mode, breakpoints).
4. `renderer/`: `<ContentRenderer document registry theme classNames components mergeClasses />` (RSC-safe). Block style → classes + CSS vars only (plan: `--ce-mt`, `--ce-mt-md`… vars resolved by media/container queries in CSS), slot `classes` merging, unknown-block fallback.
5. Test that rendered output never contains inline CSS properties (only `--ce-*` vars).

Note for shell use: the Bash tool here strips `\\` inside heredocs; write files with the Write tool.

## 14. Stages

- [x] 1. Monorepo, tooling, CI (pnpm workspace, TS strict, ESLint, Prettier, Vitest, tsup, changesets, license check, GitHub Actions)
- [x] 2. Data format: types, Zod, migrations, helpers, tests
- [ ] 3. Block engine: `defineBlock`, registry, theme, renderer + responsive styles, `@layer`, slots & `classes`
- [ ] 4. All blocks: renderers and styles
- [ ] 5. Editor: state, history, canvas, panels, DnD, Tiptap + conversion, outlines, inspector, slash menu, shortcuts, paste
- [ ] 6. Media: upload, link, media library
- [ ] 7. i18n (UI + content), permissions, saved styles, global blocks, templates, variants
- [ ] 8. Demo app with all features and seed
- [ ] 9. Tailwind live mode
- [ ] 10. E2E tests, accessibility, performance (bundle size renderer vs editor)
- [ ] 11. Documentation and publish preparation

## Detailed checklist

### 2/4. Data format (spec §4)

- [x] Block shape: id, type, props, style, classes (per slot), content (inline + marks), children
- [x] Responsive values `{ base, sm, md, lg, xl }`
- [x] `version` + migrations
- [x] Zod validation with readable errors; unknown block → warning
- [ ] Renderer fallback for unknown blocks (stage 3)
- [x] Security: no raw HTML, URL sanitizing, embed allow-list
- [x] Localized values strategy (§11)
- [x] Helpers: TOC headings, reading time, plain text

### 5. Blocks

- [ ] Heading · [ ] Paragraph · [ ] Quote · [ ] Callout · [ ] Code · [ ] Separator
- [ ] Inline marks: bold, italic, underline, strike, link, highlight, palette color, code, sup, sub
- [ ] List · [ ] Table
- [ ] Section · [ ] Columns · [ ] Grid · [ ] Nesting depth limit
- [ ] Image · [ ] Gallery (grid, masonry, bento, slider, scroll strip) · [ ] Before/after · [ ] Lightbox
- [ ] Hero · [ ] Video · [ ] Embed · [ ] File download
- [ ] Button(s) · [ ] Accordion/FAQ · [ ] Tabs · [ ] Card · [ ] Counter/stats · [ ] Timeline

### 6. Common style panel

- [ ] Margin/padding scale · [ ] Width · [ ] Align · [ ] Background · [ ] Radius/border/shadow
- [ ] Scroll animations · [ ] Visibility per device · [ ] Anchor + custom class · [ ] Style variants

### 7. Responsiveness

- [ ] Theme breakpoints · [ ] Device switcher + reset in inspector · [ ] Custom breakpoint for containers
- [ ] Container queries mode · [ ] No-JS responsive CSS, no per-block inline `<style>`

### 8. Media

- [ ] Callback API · [ ] Link-only mode · [ ] Upload (pick, drop, paste, multi, progress, cancel, retry)
- [ ] Media library modal · [ ] Swappable image component, srcset, lazy · [ ] Demo disk storage + sharp + nginx docs

### 9. Theme & styling

- [ ] Theme object → CSS vars (fonts, fluid type, palette, spacing, radii, shadows, breakpoints, variants, dark mode)
- [ ] Component override per block · [ ] `ce-` classes, `--ce-` vars, `@layer` order vs Tailwind
- [ ] No inline property styles (test) · [ ] Separate renderer/editor CSS
- [ ] Slots `classNames` API (global, per variant, function of props, custom merge) + types
- [ ] Variants for editors · [ ] Custom CSS class field (allow-list / disable)
- [ ] `complexeditor/tailwind` theme integration
- [ ] Tailwind live mode (browser compile, server helper, `generatedCss`, autocomplete, security, roles, v3/v4 detection)

### 10. Editor UI

- [ ] 3-panel layout (blocks/structure, canvas, inspector Basic/Advanced) · [ ] Action bar
- [ ] Category outlines (colors, hover label, selected, offsets, empty drop zone, drop indicator, toggle)
- [ ] Slash menu · [ ] Shortcuts + markdown shortcuts · [ ] Document undo/redo
- [ ] Paste from Word/Docs/web · [ ] Copy/paste blocks via clipboard · [ ] Autosave + status
- [ ] Keyboard/aria/focus · [ ] Touch · [ ] Permissions config

### 11. i18n

- [ ] UI dictionaries PL/EN + overrides · [ ] Content: translation group, copy from PL, stale translation hash
- [ ] Media alt/caption per language · [ ] Global blocks/templates per language

### 12. Reuse & extensibility

- [ ] Saved styles · [ ] Global blocks · [ ] Post templates · [ ] `defineBlock` public API (built-ins use it)
- [ ] Declarative inspector fields · [ ] Renderer/UI component overrides

### 13. Demo app

- [ ] Admin: login, posts list, editor, media, global blocks, templates, theme editor
- [ ] Draft/published/scheduled, version history, roles, SEO, TOC, reading time
- [ ] Public `/[locale]/blog`, post page, language switch, hreflang, fallback, dark mode
- [ ] Seed (all blocks), Postgres, docker-compose, `.env.example`
- [ ] Static playground (no DB), deploy docs

### 15. Docs & publishing

- [ ] Package README · [ ] THIRD_PARTY_LICENSES · [ ] Changesets/CHANGELOG · [ ] publish-ready package.json
- [ ] REPORT.md complete (8 sections)
