/**
 * `@offthegully/veneerui/node` — the Node/CI surface. Kept off the main entry so the
 * `css-tree` dependency never reaches the browser bundle. Gallery CI (Phase 4)
 * imports the value checker from here and `validateTheme` from the main entry.
 */
export { nodeCheckValue } from './value-check-node';
