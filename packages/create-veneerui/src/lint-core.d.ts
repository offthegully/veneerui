/**
 * Ambient types for the one plain-JS `@veneerui/lint-core` module that reaches
 * this package transitively — `@veneerui/setup-core`'s `fonts.ts` re-export pulls
 * in the bundled-font list. tsup still bundles the real JS; this is types-only.
 */
declare module '@veneerui/lint-core/font-packages' {
  export interface FontPackage {
    family: string;
    pkg: string;
    imports: string[];
    note?: string;
  }
  export const FONT_PACKAGES: readonly FontPackage[];
}
