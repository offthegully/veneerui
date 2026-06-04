---
"veneerui": minor
---

Remove the `doctor` and `migrate` CLI commands. The CLI now focuses on the new-app /
new-theme path: `init`, `add`, and `list` remain unchanged, and the
`no-hardcoded-colors` ESLint rule plus the conformance test still enforce the
"token utilities only" invariant. The migration tooling (the existing-app codemod
and themeability scan) is preserved on the `migration` branch.
