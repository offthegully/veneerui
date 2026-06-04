import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
// The rule body is shared from lint-core (the same source eslint-plugin-veneer
// bundles), so the playground dogfoods the exact rule a consumer gets. Imported
// as plain-JS source — no build step needed, so it works at lint time in CI.
import noHardcodedColors from '@veneerui/lint-core/rule'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      veneer: { rules: { 'no-hardcoded-colors': noHardcodedColors } },
    },
    rules: {
      // Phase 2 adoption contract: colors come from theme tokens, never literals.
      'veneer/no-hardcoded-colors': 'error',
    },
  },
  {
    // Tests assert *about* colors (fixtures, expected token values), so they
    // legitimately contain color literals. The conformance test is the guard
    // for the actual UI; exempt the suite from the rule.
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'veneer/no-hardcoded-colors': 'off',
    },
  },
])
