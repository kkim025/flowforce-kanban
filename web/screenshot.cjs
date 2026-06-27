const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  page.on('console', msg => console.log(`[${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.log('[pageerror]', err.message));

  // Seed localStorage on the same origin BEFORE first navigation.
  const token = fs.readFileSync('/tmp/shot-token.txt', 'utf8').trim();
  const user = JSON.parse(fs.readFileSync('/tmp/shot-user.txt', 'utf8'));

  const BASE = 'http://[::1]:5174';

  // First visit to establish origin + set storage
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('flowforce_token', token);
    localStorage.setItem('flowforce_user', JSON.stringify(user));
  }, { token, user });
  const storageCheck = await page.evaluate(() => ({
    hasToken: !!localStorage.getItem('flowforce_token'),
    tokenLen: (localStorage.getItem('flowforce_token') || '').length,
  }));
  console.log('storage after seed:', storageCheck);

  // Now go to login to screenshot it cleanly (need to clear first)
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/shot-1-login.png', fullPage: false });
  console.log('login screenshot ok, body:', (await page.evaluate(() => document.body.innerText)).substring(0, 100));

  // Re-seed and navigate to root
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('flowforce_token', token);
    localStorage.setItem('flowforce_user', JSON.stringify(user));
  }, { token, user });

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  // wait until either board renders or "Loading Board" is gone
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return !/Loading Board/.test(t);
  }, { timeout: 15000 }).catch(() => console.log('still loading after 15s'));
  await page.waitForTimeout(1500);
  const boardState = await page.evaluate(() => ({
    body: document.body.innerText.substring(0, 300),
    hasColumns: document.querySelectorAll('[data-rbd-droppable-id], h1, h2, h3').length,
    url: location.href,
  }));
  console.log('board state:', JSON.stringify(boardState, null, 2));
  await page.screenshot({ path: '/tmp/shot-2-board.png', fullPage: false });
  console.log('board screenshot ok');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });