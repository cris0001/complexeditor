import { defineConfig, type Options } from 'tsup';

const shared: Options = {
  format: ['esm'],
  dts: true,
  sourcemap: true,
  // esbuild already tree-shakes ESM; tsup's extra Rollup pass would strip 'use client' directives.
  treeshake: false,
  splitting: true,
  target: 'es2022',
  // `complexeditor/*` self-imports cross the server/client boundary and stay separate modules.
  external: ['react', 'react-dom', 'tailwindcss', /^complexeditor\//],
};

export default defineConfig([
  // Server-safe entries: no 'use client' directive, usable from React Server Components.
  {
    ...shared,
    entry: {
      'schema/index': 'src/schema/index.ts',
      'renderer/index': 'src/renderer/index.ts',
      'i18n/index': 'src/i18n/index.ts',
      'tailwind/index': 'src/tailwind/index.ts',
      'tailwind/server': 'src/tailwind/server.ts',
    },
  },
  // Client-only entries. Interactive renderer islands load their behavior lazily (dynamic import chunks).
  {
    ...shared,
    entry: {
      'editor/index': 'src/editor/index.ts',
      'renderer/client': 'src/renderer/client/index.ts',
    },
    banner: { js: "'use client';" },
  },
]);
