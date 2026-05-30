import { defineConfig } from 'tsup';

export default defineConfig({
  // One entry per subpath in the exports map. The Node value checker (css-tree)
  // is isolated in node.ts so it never lands in the browser bundle (index.js);
  // vite.ts carries the anti-flash plugin; themes.ts is the side-effect-free,
  // server-importable data slice (no createContext).
  entry: ['src/index.ts', 'src/themes.ts', 'src/vite.ts', 'src/node.ts', 'src/next.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: 'es2022',
  // react/react-dom/vite are peers and css-tree is a runtime dep — tsup keeps
  // declared deps external by default, so none of them get inlined.
});
