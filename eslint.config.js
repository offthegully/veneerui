import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import noHardcodedColors from './eslint-rules/no-hardcoded-colors.js'

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
