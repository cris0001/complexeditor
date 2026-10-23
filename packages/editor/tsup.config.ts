import { defineConfig, type Options } from 'tsup';

const shared: Options = {
  format: ['esm'],
  dts: true,
  sourcemap: true,
  treeshake: true,
  splitting: true,
  target: 'es2022',
  external: ['react', 'react-dom', 'tailwindcss'],
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
  // Client-only entries.
  {
    ...shared,
    entry: { 'editor/index': 'src/editor/index.ts' },
    banner: { js: "'use client';" },
  },
]);
