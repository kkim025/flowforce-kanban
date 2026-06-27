// screenshot-wiki.cjs — headless screenshots of the wiki feature
// for PR #24 visual evidence.
//
// Uses Playwright with bundled Chromium. Reads the test user's JWT
// from /tmp/wiki-shot/token.txt and the board id from board.json.
//
// Usage:
//   node screenshot-wiki.cjs
// Output: PNG files in /tmp/wiki-shot/

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = '/tmp/wiki-shot';
// The user's environment has two Vite listeners; 5174 is the one
// that actually serves module assets (5173 was a stale index-only
// fallback). 5174 is the authoritative dev server for this repo.
const WEB = 'http://[::1]:5174';

const token = fs.readFileSync(path.join(OUT, 'token.txt'), 'utf8').trim();
const user = JSON.parse(fs.readFileSync(path.join(OUT, 'user.json'), 'utf8'));
const board = JSON.parse(fs.readFileSync(path.join(OUT, 'board.json'), 'utf8'));

function log(...args) {
    console.log('[shot]', ...args);
}

async function shot(page, name) {
    const file = path.join(OUT, name);
    await page.screenshot({ path: file, fullPage: false });
    const { size } = fs.statSync(file);
    log(`  ${name}  ${(size / 1024).toFixed(1)} KB`);
}

async function gotoAndWait(page, url, readyPredicate, timeoutMs = 15000) {
    log(`  navigate -> ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    try {
        await page.waitForFunction(readyPredicate, { timeout: timeoutMs });
    } catch {
        log(`    (pred not satisfied in ${timeoutMs}ms, continuing)`);
    }
    // Let any framer-motion settle before the snap.
    await page.waitForTimeout(800);
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => log('  [pageerror]', e.message));
    page.on('requestfailed', (r) =>
        log('  [reqfail]', r.url(), r.failure()?.errorText),
    );

    // 1. Log in via the web's /login. The simplest path: post to
    //    /auth/register again would 409 (existing user). Easier:
    //    seed localStorage with the already-issued JWT and reload.
    await page.goto(WEB + '/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(
        ({ token, user }) => {
            localStorage.setItem('flowforce_token', token);
            localStorage.setItem('flowforce_user', JSON.stringify(user));
        },
        { token, user },
    );
    log('seeded localStorage');

    // 2. Wiki index — populated sidebar + empty-state-removed because
    //    we have pages.
    await gotoAndWait(
        page,
        `${WEB}/boards/${board.id}/wiki`,
        // The sidebar links to page titles once the tree loads.
        (txt) => /Architecture/.test(document.body.innerText),
    );
    await shot(page, '1-wiki-index.png');

    // 3. Wiki page view — open the "Architecture" page (has nested
    //    "API Endpoints" child so the sidebar highlights the active page).
    await page.locator('a:has-text("Architecture")').first().click();
    // After click the URL becomes /boards/<id>/wiki/<pageId>; wait
    // for the page title test-id rather than re-navigating.
    try {
        await page.waitForSelector('[data-testid="wiki-page-title"]', {
            timeout: 8000,
        });
    } catch {
        log('  (page-title not found in 8s, continuing)');
    }
    await page.waitForTimeout(800);
    await shot(page, '2-wiki-page-view.png');

    // 4. Edit view — click the Edit button.
    await page.locator('[data-testid="wiki-edit-button"]').click();
    await page.waitForSelector('[data-testid="wiki-edit-save"]', { timeout: 5000 });
    await page.waitForTimeout(800);
    await shot(page, '3-wiki-page-edit.png');

    // Cancel edit so we stay on the page for the next shot.
    // The Cancel button is the sibling of Save in the action row.
    const cancelBtn = page
        .locator('[data-testid="wiki-edit-save"]')
        .locator('xpath=../button[contains(., "Cancel")]')
        .first();
    await cancelBtn.click();
    await page.waitForTimeout(800);

    // 5. Trash view.
    await gotoAndWait(
        page,
        `${WEB}/boards/${board.id}/wiki/trash`,
        (txt) => /Trash is empty|Deprecated Notes/i.test(document.body.innerText),
        8000,
    );
    await shot(page, '4-wiki-trash.png');

    // 6. History drawer on a page — open Welcome and click history.
    await gotoAndWait(
        page,
        `${WEB}/boards/${board.id}/wiki`,
        (txt) => /Architecture/.test(document.body.innerText),
        8000,
    );
    const welcomeLink = page.locator('a:has-text("Welcome")').first();
    await welcomeLink.click();
    await page.waitForSelector('[data-testid="wiki-page-title"]', { timeout: 5000 });
    await page.locator('[data-testid="wiki-history-toggle"]').click();
    await page.waitForSelector('[data-testid="wiki-history-limit"]', { timeout: 5000 });
    await page.waitForTimeout(800);
    await shot(page, '5-wiki-history.png');

    await browser.close();
    log('all done');
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
