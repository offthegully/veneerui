import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin, { noHardcodedColors } from './index.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('veneer/no-hardcoded-colors', () => {
  it('passes valid token usage and flags hardcoded colors', () => {
    ruleTester.run('no-hardcoded-colors', noHardcodedColors, {
      valid: [
        { code: 'const c = "bg-primary text-text-muted border-border rounded-md";' },
        { code: 'const c = "bg-[image:var(--gradient-primary)]";' },
        { code: 'const c = "[border-width:var(--border-width-default)] border-border";' },
        { code: 'const s = <div style={{ color: "var(--color-primary)" }} />;' },
      ],
      invalid: [
        { code: 'const c = "flex bg-blue-500 p-2";', errors: [{ messageId: 'palette-utility' }] },
        { code: 'const c = "rounded text-[#fff]";', errors: [{ messageId: 'arbitrary-color' }] },
        { code: 'const c = "text-white";', errors: [{ messageId: 'palette-utility' }] },
        {
          code: 'const s = <div style={{ color: "#ff0000" }} />;',
          errors: [{ messageId: 'inline-color' }],
        },
      ],
    });
  });

  it('ships a flat-config recommended preset', () => {
    if (!plugin.configs?.recommended?.rules?.['veneer/no-hardcoded-colors']) {
      throw new Error('missing recommended preset');
    }
  });
});
