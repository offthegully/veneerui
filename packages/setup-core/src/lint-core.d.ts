/**
 * Ambient types for the plain-JS `@veneerui/lint-core` module setup-core consumes.
 * Only `fonts.ts` reaches into lint-core (for the bundled-font package list); the
 * detector module is used by eslint-plugin-veneer and the conformance test, which
 * keep their own declarations. tsup/vitest still bundle the real JS — lint-core is
 * a devDependency, so it's inlined.
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
