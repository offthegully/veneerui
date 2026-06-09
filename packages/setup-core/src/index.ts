/**
 * `@veneerui/setup-core` — the shared setup surface consumed (and bundled) by the
 * `veneerui` CLI and the `create-veneerui` scaffolder. Everything here is pure or
 * fs/process orchestration with no React/Tailwind runtime — just the logic for
 * detecting a project, patching it onto Veneer's tokens, writing the agent guide
 * and VENEER-SETUP.md, copying in registry components, scaffolding a fresh app,
 * and handing off to a coding agent.
 */
export * from './profiles';
export * from './detect';
export * from './patch';
export * from './entry-patch';
export * from './setup-plan';
export * from './agents';
export * from './registry';
export * from './add';
export * from './fonts';
export * from './init';
export * from './scaffold';
export * from './agent';
