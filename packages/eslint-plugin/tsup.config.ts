import { defineConfig } from 'tsup';

export default defineConfig({
  // Bundle @veneerui/lint-core (a private workspace package) into the published
  // artifact so the plugin is self-contained — ESM + CJS so it loads under any
  // ESLint config style.
  entry: ['src/index.js'],
  format: ['esm', 'cjs'],
  target: 'node20',
  clean: true,
  dts: false,
});
