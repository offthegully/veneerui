import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  // Zero runtime deps — everything bundles. Shebang makes dist/cli.js executable
  // via the `veneer` bin.
  banner: { js: '#!/usr/bin/env node' },
  dts: false,
});
