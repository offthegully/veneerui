/**
 * Ambient type for the plain-JS `@veneerui/lint-core/font-packages` module.
 *
 * The CLI's `add fonts` flow reaches it transitively through `@veneerui/setup-core`
 * (`fonts.ts`), whose source this package type-checks — and the generated JS carries
 * no types of its own. tsup still bundles the real JS at build time (resolved via
 * setup-core's own lint-core devDependency), so the published CLI has no runtime dep.
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
