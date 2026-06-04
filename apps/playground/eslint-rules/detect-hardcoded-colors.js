/**
 * The hardcoded-color detector now lives in `@veneerui/lint-core/detect` so the
 * playground ESLint rule, the conformance test, and eslint-plugin-veneer all share
 * one definition. This thin re-export keeps the existing local import paths
 * (`./detect-hardcoded-colors.js`) working.
 */
export * from '@veneerui/lint-core/detect';
