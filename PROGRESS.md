# Progress

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done. Spec: `prompt-edytor.md`. Decisions: `REPORT.md`.

## Next step

Stage 5 — editor (`packages/editor/src/editor/`, styles `src/styles/editor.*.css`). Stage 4 is done (all blocks + islands, 99 tests).

1. `editor/state/`: pure document operations (insert, move, remove, duplicate, update props/style/classes/content, wrap, path helpers, id regeneration) + history (undo/redo with coalescing of typing) + selection; unit tests.
2. `editor/tiptap/`: Tiptap (MIT extensions only) schema for inline marks; lossless conversion `InlineContent ⇄ ProseMirror JSON` with round-trip tests.
3. Editor render context: same block render components; `renderBlocks` wraps blocks in `BlockFrame` (outline by category, hover label, selection, action bar, drop zones), `renderInline` = Tiptap field, `renderText` = plain contentEditable; art direction preview by device.
4. UI: 3 panels (palette with search + structure tree, canvas with device widths / locale / outline toggle / undo-redo / autosave status, inspector Basic/Advanced with declarative field renderers and responsive device switcher + reset).
5. DnD with dnd-kit (palette → canvas incl. specific column, reorder in canvas and tree, nesting rules via `canContain`).
6. Slash menu, keyboard shortcuts, markdown shortcuts, paste from Word/Docs/web (HTML → blocks, sanitized), copy/paste blocks via clipboard JSON, autosave (`onChange`/`onSave` debounce).
7. Editor CSS in `@layer ce.editor`, scoped to `.ce-editor`; outline colors as `--ce-outline-*`.

Note for shell use: the Bash tool here strips `\\` inside heredocs; write files with the Write tool.

## 14. Stages

- [x] 1. Monorepo, tooling, CI (pnpm workspace, TS strict, ESLint, Prettier, Vitest, tsup, changesets, license check, GitHub Actions)
- [x] 2. Data format: types, Zod, migrations, helpers, tests
- [x] 3. Block engine: `defineBlock`, registry, theme, renderer + responsive styles, `@layer`, slots & `classes`
- [x] 4. All blocks: renderers and styles
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
- [x] Renderer fallback for unknown blocks (visible in dev, nothing in production)
- [x] Security: no raw HTML, URL sanitizing, embed allow-list
- [x] Localized values strategy (§11)
- [x] Helpers: TOC headings, reading time, plain text

### 5. Blocks

- [x] Heading · [x] Paragraph · [x] Quote · [x] Callout · [x] Code · [x] Separator
- [x] Inline marks: bold, italic, underline, strike, link, highlight, palette color, code, sup, sub (renderer)
- [x] List · [x] Table
- [x] Section · [x] Columns · [x] Grid · [x] Nesting depth limit
- [x] Image · [x] Gallery (grid, masonry, bento, slider, scroll strip) · [x] Before/after · [x] Lightbox
- [x] Hero · [x] Video · [x] Embed · [x] File download
- [x] Button(s) · [x] Accordion/FAQ · [x] Tabs · [x] Card · [x] Counter/stats · [x] Timeline

### 6. Common style panel

Renderer side done; inspector UI comes in stage 5.

- [x] Margin/padding scale · [x] Width · [x] Align · [x] Background · [x] Radius/border/shadow
- [x] Scroll animations · [x] Visibility per device · [x] Anchor + custom class · [x] Style variants (class + project classes)

### 7. Responsiveness

- [x] Theme breakpoints · [ ] Device switcher + reset in inspector · [x] Custom breakpoint for containers (albatross)
- [x] Container queries mode (default) + media mode · [x] No-JS responsive CSS, no per-block inline `<style>`

### 8. Media

- [ ] Callback API · [ ] Link-only mode · [ ] Upload (pick, drop, paste, multi, progress, cancel, retry)
- [ ] Media library modal · [ ] Swappable image component, srcset, lazy · [ ] Demo disk storage + sharp + nginx docs

### 9. Theme & styling

- [x] Theme object → CSS vars (fonts, fluid type, palette, spacing, radii, shadows, breakpoints, variants, dark mode)
- [x] Component override per block (+ Image/Link) · [x] `ce-` classes, `--ce-` vars, `@layer` order vs Tailwind
- [x] No inline property styles (test) · [~] Separate renderer/editor CSS (editor CSS in stage 5)
- [x] Slots `classNames` API (global, per variant, function of props, custom merge) · [ ] typed `defineClassNames` helper
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

- [ ] Saved styles · [ ] Global blocks · [ ] Post templates · [x] `defineBlock` public API (built-ins use it)
- [~] Declarative inspector fields (definitions done, UI in stage 5) · [~] Renderer/UI component overrides (renderer done)

### 13. Demo app

- [ ] Admin: login, posts list, editor, media, global blocks, templates, theme editor
- [ ] Draft/published/scheduled, version history, roles, SEO, TOC, reading time
- [ ] Public `/[locale]/blog`, post page, language switch, hreflang, fallback, dark mode
- [ ] Seed (all blocks), Postgres, docker-compose, `.env.example`
- [ ] Static playground (no DB), deploy docs

### 15. Docs & publishing

- [ ] Package README · [ ] THIRD_PARTY_LICENSES · [ ] Changesets/CHANGELOG · [ ] publish-ready package.json
- [ ] REPORT.md complete (8 sections)
