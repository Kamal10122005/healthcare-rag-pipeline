/**
 * Responsive / runtime smoke check in a real browser.
 *
 * Loads every route at desktop, tablet and mobile widths against a running
 * server and reports, per route and width:
 *   - horizontal overflow (document wider than the viewport)
 *   - console errors and page exceptions
 *   - failed network requests
 *   - a screenshot written to screenshots/
 *
 * Usage:
 *   npm run build && npm run preview &        # or: npm run dev
 *   node scripts/responsive-check.mjs http://localhost:4173
 *
 * Requires a Chromium/Chrome binary. Either `npx playwright install chromium`,
 * or point CHROME_PATH at an installed Chrome.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const OUT = path.resolve('screenshots');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];

const ROUTES = ['/assistant', '/evidence', '/library', '/knowledge', '/safety', '/settings'];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });

  for (const route of ROUTES) {
    const page = await context.newPage();
    const consoleErrors = [];
    const networkErrors = [];

    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      // Google Fonts is a CDN request; it fails in an offline/sandboxed
      // environment and says nothing about the application.
      const url = message.location()?.url ?? '';
      if (url.includes('fonts.g')) return;
      consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', (request) => {
      // Google Fonts is expected to fail in an offline sandbox.
      if (!request.url().includes('fonts.g')) {
        networkErrors.push(`${request.url()} — ${request.failure()?.errorText}`);
      }
    });

    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      // Elements that stick out past the right edge of the viewport.
      overflowing: Array.from(document.querySelectorAll('*'))
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`),
      navVisible: !!document.querySelector('nav'),
      mainText: (document.querySelector('main')?.textContent ?? '').trim().length,
    }));

    const overflow = metrics.scrollWidth > metrics.clientWidth;
    const problems = [];
    if (overflow)
      problems.push(
        `H-OVERFLOW ${metrics.scrollWidth}>${metrics.clientWidth} :: ${metrics.overflowing.join(' | ')}`,
      );
    if (metrics.mainText < 40) problems.push('MAIN EMPTY');
    if (consoleErrors.length) problems.push(`CONSOLE: ${consoleErrors.join(' ~ ').slice(0, 300)}`);
    if (networkErrors.length) problems.push(`NETWORK: ${networkErrors.join(' ~ ').slice(0, 200)}`);

    const label = `${viewport.name.padEnd(7)} ${route.padEnd(11)}`;
    if (problems.length) {
      failures += 1;
      console.log(`FAIL ${label} ${problems.join(' || ')}`);
    } else {
      console.log(`ok   ${label} w=${metrics.clientWidth} text=${metrics.mainText}`);
    }

    await page.screenshot({
      path: path.join(OUT, `${viewport.name}${route.replace(/\//g, '-')}.png`),
      fullPage: false,
    });
    await page.close();
  }

  await context.close();
}

await browser.close();
console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
