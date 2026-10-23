// Builds the two published stylesheets from `src/styles/*.css` plus generated parts:
// - the default theme tokens (themeToCss) right after the layer declaration,
// - the responsive rules of every built-in block (responsiveCss) at the end.
// Runs after tsup and imports the freshly built renderer entry.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(root, 'src', 'styles');
const outDir = join(root, 'dist');

const { themeToCss, responsiveCss, defaultRegistry, defaultTheme } = await import(
  pathToFileURL(join(outDir, 'renderer', 'index.js')).href
);

async function sources(prefix) {
  const files = (await readdir(srcDir))
    .filter((f) => f.startsWith(`${prefix}.`) && f.endsWith('.css'))
    .sort();
  return Promise.all(files.map((f) => readFile(join(srcDir, f), 'utf8')));
}

const [layers, ...rendererParts] = await sources('renderer');
const renderer = [
  layers,
  themeToCss(defaultTheme),
  ...rendererParts,
  responsiveCss({ theme: defaultTheme, rules: defaultRegistry.responsiveRules() }),
].join('\n');

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'styles.css'), renderer);
await writeFile(join(outDir, 'editor.css'), (await sources('editor')).join('\n'));
