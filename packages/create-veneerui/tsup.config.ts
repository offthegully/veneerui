import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  // Everything bundles (setup-core TS source + @clack/prompts). Shebang makes
  // dist/index.js executable via the `create-veneerui` bin.
  banner: { js: '#!/usr/bin/env node' },
  dts: false,
});
