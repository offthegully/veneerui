import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
// The rule bodies are shared from lint-core (the same source eslint-plugin-veneer
// bundles), so the playground dogfoods the exact rules a consumer gets. Imported
// as plain-JS source — no build step needed, so it works at lint time in CI.
import {
  noHardcodedColors,
  noBakedShadow,
  noIslandSpacing,
  noDeadOpacity,
} from '@veneerui/lint-core/rule'

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
      veneer: {
        rules: {
          'no-hardcoded-colors': noHardcodedColors,
          'no-baked-shadow': noBakedShadow,
          'no-island-spacing': noIslandSpacing,
          'no-dead-opacity': noDeadOpacity,
        },
      },
    },
    rules: {
      // Adoption contract: every visual value comes from a theme token, never an
      // island. Colors are obvious; the other three catch the axes that fail
      // silently (baked shadows, off-scale spacing, dead v4 opacity).
      'veneer/no-hardcoded-colors': 'error',
      'veneer/no-baked-shadow': 'error',
      'veneer/no-island-spacing': 'error',
      'veneer/no-dead-opacity': 'error',
    },
  },
  {
    // Tests assert *about* utilities (color fixtures, expected token values, and
    // island examples like `cn("shadow-md")`), so they legitimately contain them.
    // The conformance test is the guard for the actual UI; exempt the whole suite.
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'veneer/no-hardcoded-colors': 'off',
      'veneer/no-baked-shadow': 'off',
      'veneer/no-island-spacing': 'off',
      'veneer/no-dead-opacity': 'off',
    },
  },
])
