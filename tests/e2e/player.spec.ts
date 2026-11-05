import { test, expect } from '@playwright/test';

test('desktop URL video, controls, custom badge and duration limit', async ({ page }) => {
  const errors: string[] = [];
  const decoderRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/heic|libheif|libde265/i.test(request.url())) decoderRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  const player = page.locator('.live-photo');
  const video = () => page.locator('.live-photo video');
  await expect.poll(() => page.locator('.live-photo__image').evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  await player.hover();
  await page.mouse.down();
  await expect(player).toHaveAttribute('data-state', 'playing');
  await expect.poll(() => video().evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.1);
  await page.mouse.up();
  await expect(player).toHaveAttribute('data-frame-visible', 'false');
  await expect(video()).toHaveJSProperty('paused', true);

  await player.focus();
  await page.keyboard.down('Space');
  await expect(player).toHaveAttribute('data-state', 'playing');
  await page.keyboard.up('Space');
  await expect(player).toHaveAttribute('data-state', 'idle');
  await page.getByRole('button', { name: '点击切换 TAP' }).click();
  await player.click();
  await expect(player).toHaveAttribute('data-state', 'playing');
  await player.click();
  await expect(player).toHaveAttribute('data-state', 'idle');

  await player.click();
  await expect(player).toHaveAttribute('data-state', 'playing');
  await expect.poll(() => video().evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.1);
  // Dispatch without moving focus: ordinary blur also stops playback, which
  // would otherwise hide a missing reset handler.
  await page.getByRole('button', { name: '重置播放' }).dispatchEvent('click');
  await expect(player).toHaveAttribute('data-state', 'idle');
  await expect(player).toHaveAttribute('data-frame-visible', 'false');
  await expect(video()).toHaveJSProperty('paused', true);
  await expect(video()).toHaveJSProperty('currentTime', 0);

  await page.getByLabel('标识样式').selectOption('styled');
  await page.getByLabel('标识位置').selectOption('bottom-right');
  const badge = player.locator('.live-photo__badge');
  await expect(badge).toHaveText('动态照片');
  await player.scrollIntoViewIfNeeded();
  const photoBounds = (await player.boundingBox())!;
  const badgeBounds = (await badge.boundingBox())!;
  // Verify the selected corner is actually laid out by CSS, rather than
  // merely accepting a position attribute without moving the badge.
  expect(badgeBounds.x).toBeGreaterThan(photoBounds.x + photoBounds.width / 2);
  expect(badgeBounds.y).toBeGreaterThan(photoBounds.y + photoBounds.height / 2);
  expect(badgeBounds.x + badgeBounds.width).toBeLessThan(photoBounds.x + photoBounds.width);
  expect(badgeBounds.y + badgeBounds.height).toBeLessThan(photoBounds.y + photoBounds.height);

  await page.getByRole('button', { name: '长按播放 HOLD' }).click();
  await player.hover();
  await page.mouse.down();
  await expect(player).toHaveAttribute('data-state', 'playing');
  await expect(badge).toHaveText('播放中');
  await page.mouse.up();
  await expect(badge).toHaveText('动态照片');
  await page.getByLabel('显示实况标识').uncheck();
  await expect(badge).toHaveCount(0);
  await page.getByLabel('显示实况标识').check();
  await expect(badge).toHaveText('动态照片');
  await page.getByLabel('标识样式').selectOption('custom');
  await expect(badge).toHaveText('一瞬 · 有声有色');
  await page.getByLabel('标识样式').selectOption('default');
  await page.getByLabel('标识位置').selectOption('top-left');
  await expect(badge).toHaveText('实况');

  const loop = page.getByRole('checkbox', { name: /循环播放/ });
  await loop.check();
  await expect(video()).toHaveJSProperty('loop', true);
  await page.getByLabel('最大播放时长（秒）').selectOption('1');
  await expect(loop).toBeEnabled();
  await expect(video()).toHaveJSProperty('loop', true);
  await player.hover();
  await page.mouse.down();
  await expect(player).toHaveAttribute('data-state', 'playing');
  let previousTime = 0;
  let wraps = 0;
  await expect.poll(async () => {
    const currentTime = await video().evaluate((element: HTMLVideoElement) => element.currentTime);
    if (currentTime + 0.25 < previousTime) wraps++;
    previousTime = currentTime;
    return wraps;
  }, { timeout: 6500, intervals: [50, 75, 100] }).toBeGreaterThanOrEqual(3);
  await expect(player).toHaveAttribute('data-state', 'playing');
  await expect(player).toHaveAttribute('data-frame-visible', 'true');
  await expect(video()).toHaveJSProperty('paused', false);
  await page.mouse.up();
  await expect(player).toHaveAttribute('data-state', 'idle');
  await expect(player).toHaveAttribute('data-frame-visible', 'false');
  await expect(video()).toHaveJSProperty('currentTime', 0);

  await loop.uncheck();
  await expect(video()).toHaveJSProperty('loop', false);
  for (let attempt = 0; attempt < 2; attempt++) {
    await player.hover();
    await page.mouse.down();
    await expect(player).toHaveAttribute('data-state', 'playing');
    await expect.poll(() => video().evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.1);
    // Keep holding: the media limit itself must stop playback before release.
    await expect(player).toHaveAttribute('data-state', 'idle');
    await expect(player).toHaveAttribute('data-frame-visible', 'false');
    await expect(video()).toHaveJSProperty('paused', true);
    await expect(video()).toHaveJSProperty('currentTime', 0);
    await page.mouse.up();
  }
  await page.getByLabel('最大播放时长（秒）').selectOption('0');
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  expect(decoderRequests).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
});

test('mobile layout, real touch hold and inline playback', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const decoderRequests: string[] = [];
  page.on('request', request => { if (/heic|libheif|libde265/i.test(request.url())) decoderRequests.push(request.url()); });
  await page.goto('http://localhost:5173/');
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect.poll(() => page.locator('.live-photo__image').evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const player = page.locator('.live-photo');
  await player.scrollIntoViewIfNeeded();
  const rect = (await player.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }] });
  await expect(player).toHaveAttribute('data-state', 'playing');
  await expect.poll(() => page.locator('video').evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.1);
  expect(await page.locator('video').evaluate((element: HTMLVideoElement) => element.playsInline)).toBe(true);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(player).toHaveAttribute('data-state', 'idle');
  await expect(player).toHaveAttribute('data-frame-visible', 'false');
  await expect(page.locator('video')).toHaveJSProperty('paused', true);
  expect(await page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  expect(decoderRequests).toEqual([]);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await context.close();
});
