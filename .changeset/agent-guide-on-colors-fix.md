---
"veneerui": patch
"create-veneerui": patch
---

Fix a contrast bug in the shipped agent guide (`init` / scaffold inject it into a
project's `AGENTS.md`). It described `text-text-on-primary` as covering status fills
and omitted the per-status on-colors — so an agent following it would put white text
on light success/warning/info fills. The guide now documents
`text-text-on-success` / `-on-warning` / `-on-danger` / `-on-info` (each contrasts
with *its own* fill, not the page) and the status `-hover`/`-active`/`-subtle`
states, and clarifies the `text-text-*`/`border-border-*` utility doubling.

A new consumer-contract test guards the shipped guide against this class of drift:
it asserts the guide carries every per-status on-color and every schema-generated
escape-hatch form, so a future hand-edit can't silently drop them again.
