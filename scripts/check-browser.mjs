import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { openScene } from './browser.mjs';

const output = path.resolve(process.env.CHECK_OUTPUT || '.local-checks/browser');
await mkdir(output, { recursive: true });
const { browser, page, errors } = await openScene();
const report = { time: new Date().toISOString(), checks: [] };
const pass = name => { report.checks.push(name); console.log(`PASS ${name}`); };
try {
  const introButton = await page.locator('#start-walk').boundingBox();
  await page.keyboard.press('2');
  await page.waitForFunction(() => document.getElementById('intro').inert);
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, { x: introButton.x + introButton.width / 2, y: introButton.y + introButton.height / 2 });
  assert.equal(hit, 'CANVAS');
  pass('隐藏的欢迎按钮不再挡住鼠标');

  await page.mouse.click(700, 350);
  assert.equal(await page.evaluate(() => document.pointerLockElement === null), true);
  assert.equal(await page.locator('canvas').evaluate(el => getComputedStyle(el).cursor), 'grab');
  pass('漫游单击后光标保留');
  await page.screenshot({ path: path.join(output, '漫游-拖动前.png') });
  await page.mouse.move(700, 350); await page.mouse.down();
  await page.mouse.move(920, 395, { steps: 12 });
  assert.equal(await page.locator('canvas').evaluate(el => getComputedStyle(el).cursor), 'grabbing');
  await page.mouse.up();
  await page.screenshot({ path: path.join(output, '漫游-拖动后.png') });
  pass('漫游拖动时显示抓取光标，松开可继续操作');

  await page.keyboard.press('l');
  await page.waitForTimeout(150);
  report.explicitPointerLockGranted = await page.evaluate(() => document.pointerLockElement !== null);
  await page.keyboard.press('1');
  await page.waitForFunction(() => document.pointerLockElement === null);
  if (report.explicitPointerLockGranted) assert.equal(await page.locator('#toast').textContent(), '鼠标光标已恢复');
  await page.mouse.move(710, 350); await page.mouse.down();
  await page.mouse.move(870, 375, { steps: 10 }); await page.mouse.up();
  await page.screenshot({ path: path.join(output, '全景-拖动后.png') });
  assert.equal(await page.evaluate(() => document.pointerLockElement === null), true);
  assert.equal(await page.getByRole('button', { name: '全景', exact: true }).getAttribute('class'), 'active');
  pass('切回全景后可拖动且没有鼠标锁定');
  await page.waitForTimeout(2000);
  report.panoramaPerformance = await page.locator('#perf').textContent();

  await page.getByRole('button', { name: '导览', exact: true }).click();
  const first = await page.evaluate(() => window.__capture());
  await page.waitForTimeout(500);
  const second = await page.evaluate(() => window.__capture());
  assert.notEqual(first, second);
  pass('普通浏览方式下导览和水面持续动画');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#capture-btn').click();
  const download = await downloadPromise;
  await download.saveAs(path.join(output, '留影功能.png'));
  pass('留影能保存实际画面');

  await page.waitForTimeout(1200);
  report.performance = await page.locator('#perf').textContent();
  report.assets = await page.evaluate(() => window.__ASSET_STATUS__);
  assert.deepEqual(errors, []);
  pass('两组模型加载成功，页面没有未处理错误');
  await page.getByRole('button', { name: '游戏下载', exact: true }).click();
  assert.equal(await page.getByRole('link', { name: 'App Store · iPhone / iPad ↗' }).getAttribute('href'), 'https://apps.apple.com/us/app/nookvale-puzzles/id6825582989');
  assert.equal(await page.getByRole('link', { name: 'Google Play · Android ↗' }).getAttribute('href'), 'https://play.google.com/store/apps/details?id=com.hikoo.zhaodongdong');
  await page.screenshot({ path: path.join(output, '游戏下载入口.png') });
  await page.keyboard.press('Escape');
  pass('游戏下载面板包含两个正确的商店入口');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '游戏下载', exact: true }).click();
  const storeBox = await page.getByRole('link', { name: 'Google Play · Android ↗' }).boundingBox();
  assert.ok(storeBox && storeBox.x >= 0 && storeBox.y >= 0 && storeBox.x + storeBox.width <= 390 && storeBox.y + storeBox.height <= 844);
  await page.screenshot({ path: path.join(output, '手机尺寸预览.png') });
  await page.keyboard.press('Escape');
  pass('手机尺寸下下载入口可见可操作');
  report.status = 'passed';
  console.log(JSON.stringify({ performance: report.performance, assets: report.assets }));
} catch (error) { report.status = 'failed'; report.error = error.stack; throw error; }
finally {
  report.pageErrors = errors;
  await writeFile(path.join(output, '浏览器验证.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
