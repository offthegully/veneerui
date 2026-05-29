export const meta = {
  name: 'theme-polish-review',
  description: 'Screenshot every playground theme (Playwright CLI) and review polish + cross-theme consistency',
  whenToUse:
    'Reviewing the playground themes for polish: no overlap/overflow, consistent structure theme-to-theme, and text sizes that do not drift drastically between themes. Report-only — proposes fixes, changes nothing.',
  phases: [
    { title: 'Capture', detail: 'Run capture.cjs: 13 themes × 3 viewports → screenshots + metrics.json' },
    { title: 'Review', detail: 'One agent per theme: read its 3 screenshots + metrics, find in-theme polish issues' },
    { title: 'Synthesize', detail: 'Cross-theme pass: structure parity, text-size drift, final report' },
  ],
}

// ---- Inputs (args) -----------------------------------------------------------
// args.base   dev/preview server URL (required for a live run)
// args.out    output dir for shots + metrics (default: scripts/theme-review/shots)
const BASE = (args && args.base) || 'http://localhost:5175'
const OUT = (args && args.out) || 'scripts/theme-review/shots'

const THEMES = [
  'default-light', 'default-dark', 'brutalist', 'editorial', 'glassmorphic',
  'high-contrast', 'monospaced', 'neon-arcade', 'neumorphic', 'sunset-paper',
  'terminal', 'warm-library', 'windows-95',
]
const VIEWPORTS = ['desktop', 'tablet', 'mobile']

// ---- Schemas -----------------------------------------------------------------
const CAPTURE_SCHEMA = {
  type: 'object',
  required: ['outDir', 'themesCaptured', 'overflow'],
  properties: {
    outDir: { type: 'string', description: 'Absolute path where screenshots + metrics.json were written' },
    themesCaptured: { type: 'integer' },
    shots: { type: 'integer', description: 'Total screenshots written' },
    overflow: {
      type: 'array',
      description: 'Every theme/viewport with horizontal overflow (overlap/cut-off proxy)',
      items: {
        type: 'object',
        required: ['theme', 'viewport', 'px'],
        properties: {
          theme: { type: 'string' },
          viewport: { type: 'string' },
          px: { type: 'number' },
        },
      },
    },
    failures: { type: 'array', items: { type: 'string' }, description: 'theme@viewport that failed to capture' },
  },
}

const FINDING = {
  type: 'object',
  required: ['title', 'severity', 'viewport', 'category', 'detail'],
  properties: {
    title: { type: 'string' },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    viewport: { type: 'string', enum: ['desktop', 'tablet', 'mobile', 'all'] },
    category: {
      type: 'string',
      enum: ['overlap', 'overflow', 'clipping', 'spacing', 'alignment', 'legibility', 'contrast', 'typography', 'polish'],
    },
    detail: { type: 'string', description: 'What is wrong and where on the page' },
    suggestion: { type: 'string', description: 'Proposed fix (which token / element). No code is applied.' },
  },
}

const THEME_REVIEW_SCHEMA = {
  type: 'object',
  required: ['theme', 'verdict', 'findings'],
  properties: {
    theme: { type: 'string' },
    verdict: { type: 'string', enum: ['polished', 'minor-issues', 'needs-work'] },
    summary: { type: 'string', description: 'One-paragraph impression of the theme across the three viewports' },
    findings: { type: 'array', items: FINDING },
  },
}

const SYNTH_SCHEMA = {
  type: 'object',
  required: ['reportPath', 'overallVerdict', 'topIssues'],
  properties: {
    reportPath: { type: 'string' },
    overallVerdict: { type: 'string' },
    textSizeDrift: {
      type: 'array',
      description: 'Anchors (h1/h2/body/button) whose size varies drastically across themes',
      items: {
        type: 'object',
        properties: {
          anchor: { type: 'string' },
          minPx: { type: 'number' },
          maxPx: { type: 'number' },
          spreadPx: { type: 'number' },
          outliers: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    structureOutliers: { type: 'array', items: { type: 'string' }, description: 'Themes whose page structure diverges from the shared baseline' },
    topIssues: { type: 'array', items: { type: 'string' }, description: 'Ranked, most important fixes first' },
  },
}

// ---- Phase 1: Capture --------------------------------------------------------
phase('Capture')
const capture = await agent(
  `Run the theme-review screenshot capture, then report what it produced.

Working directory: the veneer repo root.
Run exactly this command (it drives the Playwright CLI; give it up to 300s):

  node scripts/theme-review/capture.cjs --base ${BASE} --out ${OUT} --viewports desktop:1440,tablet:768,mobile:390

It captures all 13 themes at 3 viewports each (39 screenshots) and writes <out>/metrics.json.
After it finishes:
- Resolve the absolute path of the output dir (${OUT} relative to repo root).
- Read metrics.json and list every theme/viewport where hasHorizontalOverflow is true (with horizontalOverflowPx).
- Note any "FAILED" lines from the command output as failures (theme@viewport).

Return the structured summary. Do NOT edit any files.`,
  { label: 'capture:playwright', phase: 'Capture', schema: CAPTURE_SCHEMA },
)

const outDir = capture.outDir
log(`Captured ${capture.shots || ''} shots into ${outDir} — ${capture.overflow.length} overflow flag(s)`)

// ---- Phase 2: Per-theme review (pipeline) ------------------------------------
// Each theme reviews independently the moment capture is done; no barrier needed.
const reviews = await pipeline(
  THEMES,
  (theme) =>
    agent(
      `You are reviewing ONE playground theme for visual polish. The playground is a single long landing page that re-skins per theme; all themes share the SAME page structure, only tokens (color/type/spacing/border/radius/shadow/motion) differ.

Theme: "${theme}"

Read these full-page screenshots (they exist on disk):
${VIEWPORTS.map((v) => `  - ${outDir}/${theme}__${v}.png  (${v})`).join('\n')}

Also read the metrics for this theme from ${outDir}/metrics.json (the "${theme}" key): it gives rendered font sizes per tag (h1/h2/h3/p/button/a), and horizontal-overflow / offscreen-right elements per viewport.

Judge, per viewport:
- Overlap / overflow / clipping: elements colliding, text cut off, anything spilling past the viewport edge (cross-check offscreenRight + hasHorizontalOverflow in metrics).
- Spacing & alignment: cramped or broken layout, misaligned columns, awkward wrapping (esp. mobile).
- Legibility & contrast: text too small/large, low contrast against its surface, unreadable on this theme.
- General polish: does it look intentional and finished, or rough?

Be concrete: name the section (hero, "What makes it different" cards, "Open source" banner, Documentation cards, footer) and the viewport. Only report real, visible problems — do not invent issues for a clean theme. This is REPORT ONLY; suggest fixes but change nothing.

Return the structured review.`,
      { label: `review:${theme}`, phase: 'Review', schema: THEME_REVIEW_SCHEMA },
    ),
)

const themeReviews = reviews.filter(Boolean)

// ---- Phase 3: Cross-theme synthesis (barrier) --------------------------------
phase('Synthesize')
const synth = await agent(
  `You are writing the final theme-polish review report. You have (a) per-theme reviews and (b) the raw metrics for all themes.

GOAL the user cares about: every theme should look polished, with NOTHING overlapping; theme-to-theme the STRUCTURE should look as close as possible (same layout/rhythm), while only the content/visual treatment differs; and text sizes should NOT differ drastically from one theme to the next.

Inputs:
- Per-theme reviews (JSON): ${JSON.stringify(themeReviews)}
- Capture overflow flags (JSON): ${JSON.stringify(capture.overflow)}
- Full metrics: read ${outDir}/metrics.json

Do this cross-theme analysis from metrics.json:
1. TEXT-SIZE DRIFT — for each anchor (h1 first item, h2 first item, p first item, button first item), collect the rendered fontSize across all 13 themes. Report min/max/spread and call out outlier themes whose size is far from the pack. Drastic drift between themes is a primary concern.
2. STRUCTURE PARITY — using overflow flags and the per-theme findings, identify any theme whose layout diverges from the shared baseline (breaks, missing sections, wildly different rhythm).
3. Aggregate the per-theme findings into a ranked Top Issues list (highest severity / most themes affected first).

Then WRITE a markdown report to ${outDir}/REPORT.md with these sections:
  # Theme Polish Review
  - Summary table: theme | verdict | # findings | overflow?
  - Cross-theme text-size drift (a table per anchor with the px per theme, outliers bolded)
  - Structure parity notes
  - Top issues (ranked, with suggested fix + affected themes/viewports)
  - Per-theme detail (each theme's findings)
Reference screenshots by relative filename (e.g. \`terminal__mobile.png\`).

Return the structured summary (reportPath = the REPORT.md path you wrote).`,
  { label: 'synthesize:report', phase: 'Synthesize', schema: SYNTH_SCHEMA },
)

return {
  outDir,
  report: synth.reportPath,
  overallVerdict: synth.overallVerdict,
  themesReviewed: themeReviews.length,
  topIssues: synth.topIssues,
  textSizeDrift: synth.textSizeDrift,
}
