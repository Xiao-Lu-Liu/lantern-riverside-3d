import { chromium } from 'playwright';

export async function openScene({ url = process.env.SCENE_URL || 'http://127.0.0.1:5173/', width = 1280, height = 720 } = {}) {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.__SCENE_READY__ && window.__ASSET_STATUS__?.pavilionLoaded && window.__ASSET_STATUS__?.lanternLoaded, null, { timeout: 90000 });
    return { browser, context, page, errors };
  } catch (error) { await browser.close(); throw error; }
}
