# Claude Code — start here

The full agent guide for this repo — the Veneer design-system rules, the token
vocabulary, and the conventions for writing themeable components — lives in
@AGENTS.md. Read it before writing or editing any UI.

The one rule that matters most: **never hardcode colors or other visual values;
drive everything from theme tokens.** Raw palette utilities (`bg-blue-500`),
arbitrary colors (`bg-[#fff]`), and bare color literals fail CI via the
`veneer/no-hardcoded-colors` lint rule and the conformance test.
