// Fontsource packages ship CSS, not type declarations, so the bare side-effect
// imports in main.tsx need an ambient module declaration.
declare module '@fontsource/*';
declare module '@fontsource-variable/*';
