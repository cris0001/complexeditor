# complexeditor

Block-based content editor for React / Next.js. Work in progress — see the repository root for status.

## Class validation

Classes typed in the editor (`block.classes` per slot and `style.className`) are part of the stored
document, so they are validated by `isSafeClassList` (exported from `complexeditor/schema` as
`schemas.isSafeClassList`):

- max 1000 characters per slot;
- `<`, `` ` ``, `{`, `}`, `;` and `\` are never allowed;
- quotes (`'`, `"`) and `>` are allowed **only inside balanced `[...]`**, and quotes must be paired.

Allowed: `mt-12 md:mt-20`, `content-['x']`, `after:content-["→"]`, `grid-cols-[1fr_2fr]`,
`[&>*]:underline`.
Rejected: `a" onclick="x` (quote outside brackets), `content-['x]` (unpaired), `bg-[red;color:blue]`
(`;` could add a declaration).

Classes that need any of the always-forbidden characters (for example an arbitrary value containing
`;` or `{}`) cannot be stored; define them in your project's CSS and reference them by name instead.
Tailwind live mode adds a stricter, configurable policy for arbitrary values on top of this check.
