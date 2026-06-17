import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin, {
  noHardcodedColors,
  noBakedShadow,
  noIslandSpacing,
  noDeadOpacity,
} from './index.js';

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

  it('ships a flat-config recommended preset with every rule', () => {
    const rules = plugin.configs?.recommended?.rules ?? {};
    for (const id of [
      'veneer/no-hardcoded-colors',
      'veneer/no-baked-shadow',
      'veneer/no-island-spacing',
      'veneer/no-dead-opacity',
    ]) {
      if (rules[id] !== 'error') throw new Error(`missing recommended preset rule: ${id}`);
    }
  });
});

describe('veneer/no-baked-shadow', () => {
  it('flags shadows only in class contexts (className / clsx args), with the escape-hatch autofix', () => {
    ruleTester.run('no-baked-shadow', noBakedShadow, {
      valid: [
        // Escape hatch, drop-shadow, none, color shadow — all themeable/legit.
        { code: 'const x = <div className="rounded [box-shadow:var(--shadow-card)] drop-shadow-lg shadow-none shadow-primary" />;' },
        // NOT a class context: prose literal and a token-name arg (H1 + token-name FP fixed).
        { code: 'const msg = "use shadow-md in your className";' },
        { code: 'const t = tokenValue(theme, "shadow-card");' },
        { code: 'const meta = { name: "shadow-sm" };' },
        // Per-type validity: shadow-xs / inset-shadow-xl aren't Veneer tokens (H2).
        { code: 'const x = <div className="rounded shadow-xs" />;' },
        { code: 'const c = cn("inset-shadow-xl");' },
      ],
      invalid: [
        // Lone className — previously a false negative (C1).
        {
          code: 'const x = <div className="shadow-md" />;',
          output: 'const x = <div className="[box-shadow:var(--shadow-md)]" />;',
          errors: [{ messageId: 'baked-shadow' }],
        },
        // className among other utilities, with a variant.
        {
          code: 'const x = <div className="rounded-lg hover:shadow-lg p-4" />;',
          output: 'const x = <div className="rounded-lg hover:[box-shadow:var(--shadow-lg)] p-4" />;',
          errors: [{ messageId: 'baked-shadow' }],
        },
        // clsx with a SEPARATE string arg + a conditional — previously missed (C1).
        {
          code: 'const c = clsx("rounded", cond && "text-shadow-glow");',
          output: 'const c = clsx("rounded", cond && "[text-shadow:var(--text-shadow-glow)]");',
          errors: [{ messageId: 'baked-shadow' }],
        },
        // Hoisted helper via cn(), assigned to a const.
        {
          code: 'const card = cn("inset-shadow-sm rounded");',
          output: 'const card = cn("[box-shadow:var(--inset-shadow-sm)] rounded");',
          errors: [{ messageId: 'baked-shadow' }],
        },
        // Template literal in className → reported, NOT auto-fixed.
        {
          code: 'const x = <div className={`rounded shadow-md`} />;',
          output: null,
          errors: [{ messageId: 'baked-shadow' }],
        },
      ],
    });
  });
});

describe('veneer/no-island-spacing', () => {
  it('autofixes integer-px to the multiplier in class contexts; ignores fractional/non-px and prose', () => {
    ruleTester.run('no-island-spacing', noIslandSpacing, {
      valid: [
        { code: 'const x = <div className="p-4.5 gap-2 w-[100vw] max-w-[65ch]" />;' },
        // Fractional px is off-grid (no valid class) → not flagged (H3).
        { code: 'const x = <div className="p-[1.5px]" />;' },
        // Not a class context.
        { code: 'const note = "set p-[18px] somewhere";' },
      ],
      invalid: [
        {
          code: 'const x = <div className="flex p-[18px]" />;',
          output: 'const x = <div className="flex p-4.5" />;',
          errors: [{ messageId: 'island-spacing' }],
        },
        {
          code: 'const c = clsx("-mt-[8px]", "gap-[4px]");',
          output: 'const c = clsx("-mt-2", "gap-1");',
          errors: [{ messageId: 'island-spacing' }, { messageId: 'island-spacing' }],
        },
      ],
    });
  });
});

describe('veneer/no-dead-opacity', () => {
  it('flags v3 *-opacity-N in class contexts (no autofix); passes live forms and prose', () => {
    ruleTester.run('no-dead-opacity', noDeadOpacity, {
      valid: [
        { code: 'const x = <div className="opacity-50 bg-primary/75" />;' },
        { code: 'const doc = "bg-opacity-75 is dead in v4";' },
      ],
      invalid: [
        {
          code: 'const x = <div className="bg-opacity-75" />;',
          output: null, // dead-opacity has no safe single-token autofix
          errors: [{ messageId: 'dead-opacity' }],
        },
      ],
    });
  });
});

describe('class-context coverage (concat, object form, member callees, double-report)', () => {
  it('reaches concat / object keys / member callees, and reports each island exactly once', () => {
    ruleTester.run('no-baked-shadow', noBakedShadow, {
      valid: [
        // cva/tv variant config carries classes as object *values* — a documented
        // out-of-scope shape (cva/tv are intentionally not in CLASS_CALLEES).
        { code: 'const v = cva("rounded", { variants: { size: { lg: "shadow-lg" } } });' },
        // A call that isn't a class-merge helper is never scanned.
        { code: 'const t = tokenValue(theme, "shadow-card");' },
      ],
      invalid: [
        // String concatenation in a class context (H-B).
        {
          code: 'const c = cn("a " + "shadow-md");',
          output: 'const c = cn("a " + "[box-shadow:var(--shadow-md)]");',
          errors: [{ messageId: 'baked-shadow' }],
        },
        // clsx/cn object form — the (string-literal) key is the class.
        {
          code: 'const c = cn({ "shadow-md": on });',
          output: 'const c = cn({ "[box-shadow:var(--shadow-md)]": on });',
          errors: [{ messageId: 'baked-shadow' }],
        },
        // Member callee `styles.cx(...)` (M-A).
        {
          code: 'const c = styles.cx("rounded shadow-md");',
          output: 'const c = styles.cx("rounded [box-shadow:var(--shadow-md)]");',
          errors: [{ messageId: 'baked-shadow' }],
        },
        // Reached by BOTH the JSXAttribute and CallExpression visitors → reported once.
        {
          code: 'const x = <div className={cn("shadow-md")} />;',
          output: 'const x = <div className={cn("[box-shadow:var(--shadow-md)]")} />;',
          errors: [{ messageId: 'baked-shadow' }],
        },
      ],
    });
  });

  it('fixes negatable margins but drops non-margin negatives, and reaches object-key spacing', () => {
    ruleTester.run('no-island-spacing', noIslandSpacing, {
      // `-gap-[4px]` is malformed (only margins negate) → not flagged (L-A).
      valid: [{ code: 'const x = <div className="-gap-[4px]" />;' }],
      invalid: [
        {
          code: 'const x = <div className="-mt-[8px]" />;',
          output: 'const x = <div className="-mt-2" />;',
          errors: [{ messageId: 'island-spacing' }],
        },
        {
          code: 'const c = cn({ "p-[18px]": on });',
          output: 'const c = cn({ "p-4.5": on });',
          errors: [{ messageId: 'island-spacing' }],
        },
      ],
    });
  });
});
