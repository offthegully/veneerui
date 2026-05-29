/**
 * Theme-review capture — drives the playground with the Playwright CLI to
 * screenshot every theme at several viewports and collect layout/typography
 * metrics for the cross-theme polish review.
 *
 * Each theme is selected deterministically by seeding the playground's
 * localStorage library blob (`veneer.theme-library.v1`) before first paint —
 * the same key the anti-flash script reads — so any theme (even ones not in the
 * default switcher set) loads flash-free without clicking through the UI.
 *
 * Playwright is not a declared dependency; it is resolved from the npm/npx cache
 * (see resolvePlaywright). The browser binary is whatever `npx playwright install
 * chromium` put in place — we pick the first cached build that actually launches.
 *
 * Usage:
 *   node scripts/theme-review/capture.cjs \
 *     --base http://localhost:5173 \
 *     --out  scripts/theme-review/shots \
 *     --themes default-light,terminal,...   (default: all 13) \
 *     --viewports desktop:1440,tablet:768,mobile:390
 *
 * Output:
 *   <out>/<theme>__<viewport>.png         full-page screenshot
 *   <out>/metrics.json                    typography + overflow metrics per theme/viewport
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const STORAGE_KEY = 'veneer.theme-library.v1';

const ALL_THEMES = [
  'default-light',
  'default-dark',
  'brutalist',
  'editorial',
  'glassmorphic',
  'high-contrast',
  'monospaced',
  'neon-arcade',
  'neumorphic',
  'sunset-paper',
  'terminal',
  'warm-library',
  'windows-95',
];

const DEFAULT_VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    if (!k || !k.startsWith('--')) continue;
    out[k.slice(2)] = argv[i + 1];
  }
  return out;
}

/** Find a Playwright module in the npx cache that can actually launch. */
function resolvePlaywright() {
  // 1) Project dependency, if one ever gets added.
  try {
    return require('playwright');
  } catch {
    /* fall through to cache search */
  }
  // 2) npx cache — collect every cached `playwright` and prefer stable versions.
  const cacheRoot = path.join(os.homedir(), '.npm', '_npx');
  const candidates = [];
  let hashes = [];
  try {
    hashes = fs.readdirSync(cacheRoot);
  } catch {
    /* no cache */
  }
  for (const h of hashes) {
    const p = path.join(cacheRoot, h, 'node_modules', 'playwright', 'index.js');
    if (fs.existsSync(p)) {
      let version = '';
      try {
        version = require(path.join(cacheRoot, h, 'node_modules', 'playwright', 'package.json')).version;
      } catch {
        /* ignore */
      }
      candidates.push({ path: p, version, stable: /^\d+\.\d+\.\d+$/.test(version) });
    }
  }
  // Stable releases first (their browser builds are likeliest installed).
  candidates.sort((a, b) => Number(b.stable) - Number(a.stable));
  if (candidates.length === 0) {
    throw new Error(
      'Playwright not found. Run `npx playwright install chromium` first (and ensure the npx cache has a playwright build).',
    );
  }
  return candidates;
}

/** The localStorage blob that pins a single theme as current (see storage.ts). */
function libraryBlob(themeId) {
  return JSON.stringify({
    themes: [],
    enabledIds: [themeId],
    currentId: themeId,
    pinned: true,
  });
}

/**
 * Collected in-page. Captures typography anchors (so the review can compare text
 * sizes across themes) and overflow signals (a cheap overlap/cut-off proxy).
 */
function collectMetrics() {
  const round = (n) => Math.round(n * 10) / 10;
  const vw = window.innerWidth;

  // Typography anchors: first occurrence of each structural tag + its rendered size.
  const TAGS = ['h1', 'h2', 'h3', 'p', 'button', 'a'];
  const typography = {};
  for (const tag of TAGS) {
    const els = Array.from(document.querySelectorAll(tag)).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && el.textContent.trim().length > 0;
    });
    typography[tag] = els.slice(0, 6).map((el) => {
      const cs = getComputedStyle(el);
      return {
        fontSize: round(parseFloat(cs.fontSize)),
        lineHeight: cs.lineHeight === 'normal' ? 'normal' : round(parseFloat(cs.lineHeight)),
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily.split(',')[0].replace(/['"]/g, ''),
        text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 50),
      };
    });
  }

  // Horizontal overflow — the page should never scroll sideways. Anything wider
  // than the viewport, or any element whose right edge spills past it, is a
  // layout-break / overlap signal worth a human (or vision) look.
  const docW = document.documentElement.scrollWidth;
  const offscreenRight = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1) {
      offscreenRight.push({
        selector: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
        right: round(r.right),
        overflowPx: round(r.right - vw),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      });
    }
    if (offscreenRight.length >= 25) break;
  }

  return {
    viewportWidth: vw,
    documentScrollWidth: docW,
    horizontalOverflowPx: round(docW - vw),
    hasHorizontalOverflow: docW > vw + 1,
    offscreenRightCount: offscreenRight.length,
    offscreenRight: offscreenRight.slice(0, 15),
    typography,
  };
}

async function tryLaunch(candidates) {
  // candidates may be a module (project dep) or an array of cache entries.
  if (!Array.isArray(candidates)) {
    const browser = await candidates.chromium.launch();
    return { browser, version: 'project' };
  }
  let lastErr;
  for (const c of candidates) {
    try {
      const pw = require(c.path);
      const browser = await pw.chromium.launch();
      return { browser, version: c.version };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error('No cached Playwright build could launch chromium: ' + (lastErr && lastErr.message));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = (args.base || 'http://localhost:5173').replace(/\/$/, '');
  const outDir = path.resolve(args.out || path.join(__dirname, 'shots'));
  const themes = args.themes ? args.themes.split(',').map((s) => s.trim()).filter(Boolean) : ALL_THEMES;
  const viewports = args.viewports
    ? args.viewports.split(',').map((s) => {
        const [name, width] = s.split(':');
        const vp = DEFAULT_VIEWPORTS.find((v) => v.name === name);
        return { name, width: Number(width), height: vp ? vp.height : 900 };
      })
    : DEFAULT_VIEWPORTS;

  fs.mkdirSync(outDir, { recursive: true });

  const resolved = resolvePlaywright();
  const { browser, version } = await tryLaunch(resolved);
  console.log(`[capture] base=${base} themes=${themes.length} viewports=${viewports.map((v) => v.name).join('/')} playwright=${version}`);

  const metrics = {};
  let shotCount = 0;

  for (const themeId of themes) {
    metrics[themeId] = {};
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      // Seed the theme before any page script runs (anti-flash reads this).
      await context.addInitScript(
        ([key, value]) => {
          try {
            window.localStorage.setItem(key, value);
          } catch {
            /* ignore */
          }
        },
        [STORAGE_KEY, libraryBlob(themeId)],
      );
      const page = await context.newPage();
      try {
        await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });
        await page.evaluate(() => document.fonts && document.fonts.ready);
        await page.waitForTimeout(400); // settle entrance transitions
        const file = path.join(outDir, `${themeId}__${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const m = await page.evaluate(collectMetrics);
        metrics[themeId][vp.name] = m;
        shotCount++;
        const flag = m.hasHorizontalOverflow ? ` ⚠ overflow +${m.horizontalOverflowPx}px` : '';
        console.log(`[capture] ${themeId} @ ${vp.name} → ${path.basename(file)}${flag}`);
      } catch (e) {
        metrics[themeId][vp.name] = { error: String(e && e.message) };
        console.log(`[capture] ${themeId} @ ${vp.name} FAILED: ${e && e.message}`);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  const metricsPath = path.join(outDir, 'metrics.json');
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
  console.log(`[capture] done — ${shotCount} screenshots + ${path.basename(metricsPath)} in ${outDir}`);
}

main().catch((e) => {
  console.error('[capture] fatal:', e && e.stack ? e.stack : e);
  process.exit(1);
});
