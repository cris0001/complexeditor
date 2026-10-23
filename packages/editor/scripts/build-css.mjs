// Concatenates the CSS sources into the two published stylesheets.
// Order matters: the layer declaration must come first.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const srcDir = join(root, 'src', 'styles');
const outDir = join(root, 'dist');

async function bundle(prefix, outFile) {
  const files = (await readdir(srcDir)).filter((f) => f.startsWith(prefix) && f.endsWith('.css')).sort();
  const parts = await Promise.all(files.map((f) => readFile(join(srcDir, f), 'utf8')));
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, outFile), parts.join('\n'));
}

await bundle('renderer', 'styles.css');
await bundle('editor', 'editor.css');
