---
"@offthegully/veneerui": minor
"veneerui": minor
"create-veneerui": minor
---

Scope the runtime to shipped + developer-authored themes: remove the runtime
theme-import API (`importTheme`, the import/preview surface) and the ImportPanel /
PreviewBanner registry components. Persisted storage slims to only the visitor's
choices (`currentId`, `enabledIds`, `currentTokens`) instead of the whole theme
library. The CLI additionally gains package-manager awareness (npm / pnpm / yarn /
bun) for installs and hints.
