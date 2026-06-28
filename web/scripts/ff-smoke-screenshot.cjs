// flowforce-kanban smoke check + screenshot capture.
//
// Required for every frontend PR (per skill step 9). Boots Playwright, signs
// in a fresh user via the real /auth/register + /auth/login API, waits for
// the board to render, probes the DOM for real content, and saves a PNG to
// /tmp/ff-screenshot-<num>.png. Exits non-zero on any gate failure.
//
// USAGE:
//   node scripts/ff-smoke-screenshot.cjs --num <issue> [--email <e>] [--password <p>]
//
// Pre-conditions (caller's job — see SKILL.md step 5a):
//   - Dev API on http://127.0.0.1:5000 (or wherever api/.env PORT points).
//   - Vite on http://127.0.0.1:5173.
//   - Playwright installed (web/node_modules has playwright-core in pnpm tree).
//
// What it gates on:
//   1. pageErrors === []           — no provider-tree crashes
//   2. bodyLen > 200              — React mounted something
//   3. bodyPreview !~ /Loading Board/  — board actually rendered
//   4. tokenInfo.hoursUntilExp    — logged to stdout for diffs vs previous runs
//
// History:
//   - Created 2026-06-27 after issue #29 exposed the gap that the skill
//     referenced this script but it didn't exist anywhere.
//   - Uses real HTTP + real DB + real JWT — supertest mocks are NOT enough
//     to catch provider-tree or hook-ancestry bugs.

const path = require('path');
const fs = require('fs');

// Resolve playwright-core out of the web workspace's pnpm tree. Don't add
// playwright as a new dep — it's already there transitively.
const PW_PATHS = [
  '/home/paul/flowforce-kanban/web/node_modules/.pnpm/playwright-core@1.61.1/node_modules/playwright-core',
];
let chromium;
for (const p of PW_PATHS) {
  try {
    chromium = require(p).chromium;
    if (chromium) break;
  } catch (_) { /* try next */ }
}
if (!chromium) {
  console.error('FATAL: playwright-core not found. Install with: pnpm --dir web add -D playwright');
  process.exit(4);
}

// Probe Vite's bind interface. Some dev boxes only bind IPv6 (e.g. local
// setups where Vite is on `[::1]:5173`), so try both and pick the one that
// answers. The previous IPv4-only assumption caused ERR_CONNECTION_REFUSED.
const { request } = require('http');
async function probeUrl(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = request({ host: new URL(url).hostname, port: new URL(url).port, path: '/', method: 'GET' }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
    req.end();
  });
}
async function resolveBaseUrls() {
  // Probe both port 5000 and port 3000 for the API. The repo's api/.env
  // says PORT=3000 but some dev boxes run the API on 5000 via a wrapper
  // (e.g. the original flowforce-kanban skill memory said "API on :5000").
  // Try the web port first; fall back to whatever answers.
  for (const base of ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://[::1]:5173']) {
    if (!(await probeUrl(base))) continue;
    for (const apiPort of [5000, 3000]) {
      const apiBase = base.replace(':5173', `:${apiPort}`);
      if (await probeUrl(apiBase)) {
        return { web: base, api: apiBase };
      }
    }
    // Web answered but no API port — still return the web base, the
    // script will fail loudly when the register call can't connect.
    return { web: base, api: base.replace(':5173', ':5000') };
  }
  return { web: 'http://127.0.0.1:5173', api: 'http://127.0.0.1:3000' };
}

const argv = require('process').argv.slice(2);
function flag(name, def) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  return argv[i + 1];
}
const num = flag('num', 'local');
const email = flag('email', `smoke-${num}@example.com`);
const password = flag('password', 'hunter2hunter2');
const outPath = `/tmp/ff-screenshot-${num}.png`;

(async () => {
  const { web: webBase, api: apiBase } = await resolveBaseUrls();
  console.log('using', { web: webBase, api: apiBase });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  // Register a fresh user against the real API. /auth/register returns a
  // LoginResponseDto { access_token, user } — same shape as login — so this
  // single call both creates the account and hands us a valid JWT.
  const registerResp = await page.request.post(`${apiBase}/auth/register`, {
    data: { email, password, name: `Smoke ${num}` },
  });
  if (registerResp.status() >= 400 && registerResp.status() !== 409) {
    console.error('register failed:', registerResp.status(), await registerResp.text());
    process.exit(5);
  }

  // Drive the UI login form so we exercise the real AuthProvider path.
  await page.goto(`${webBase}/login`);
  await page.fill('input[placeholder="name@example.com"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for a board action button. The board surface always renders the
  // "New Task" CTA (Button label "New Task"). Using a more generic anchor
  // than "TO DO" so we don't break when default column titles change.
  try {
    await page.waitForSelector('button:has-text("New Task")', { timeout: 15000 });
  } catch (e) {
    console.error('board never rendered:', e.message);
    // Dump body for debugging before failing.
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.error('bodyText (first 400):', bodyText.slice(0, 400));
    process.exit(6);
  }

  const tokenInfo = await page.evaluate(() => {
    const t = localStorage.getItem('flowforce_token');
    if (!t) return null;
    try {
      const p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const dec = JSON.parse(atob(p));
      return {
        exp: dec.exp,
        hoursUntilExp: ((dec.exp - Math.floor(Date.now() / 1000)) / 3600).toFixed(2),
      };
    } catch { return null; }
  });

  // Look for the canonical "Loading Board…" surface. We bound it to the
  // loading-state copy used by the KanbanProvider (`KanbanContext.tsx`),
  // not to any toast / overlay text. Without this narrow match a leftover
  // toast saying "Loading Board…" used to false-positive the gate even
  // though the column headers had already rendered.
  const bodyInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    // A successfully-hydrated board always renders the board chrome:
    // top bar ("Filters" + "New Task"), and one of the action buttons. We
    // use those as a positive signal rather than scraping column header
    // text (which varies across boards).
    const hasBoardChrome =
      text.includes('Filters') && text.includes('New Task');
    // Canonical loading-state copy from KanbanContext.tsx — note the
    // ellipsis is the single character that distinguishes "Loading…" from
    // any toast / overlay.
    const stillLoading =
      !hasBoardChrome && text.includes('Loading Board…');
    return {
      bodyLen: text.length,
      bodyPreview: text.slice(0, 400),
      hasBoardChrome,
      stillLoading,
    };
  });

  await page.screenshot({ path: outPath, fullPage: false });

  const result = { pageErrors, tokenInfo, bodyInfo, outPath };
  console.log(JSON.stringify(result, null, 2));

  // Gates. Treat all three as blocking.
  const failures = [];
  if (pageErrors.length > 0) failures.push(`pageErrors: ${JSON.stringify(pageErrors)}`);
  if (bodyInfo.bodyLen < 200) failures.push(`bodyLen ${bodyInfo.bodyLen} < 200 — React didn't mount`);
  if (bodyInfo.stillLoading) failures.push("body still shows 'Loading Board' — hydration hung");
  if (!fs.existsSync(outPath)) failures.push(`screenshot not written: ${outPath}`);

  if (failures.length > 0) {
    console.error('SMOKE GATE FAILED:');
    for (const f of failures) console.error('  -', f);
    process.exit(2);
  }
  console.log('SMOKE GATE PASSED');
  await browser.close();
})().catch((e) => {
  console.error('script crashed:', e);
  process.exit(3);
});
