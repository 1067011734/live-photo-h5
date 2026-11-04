import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('desktop real video, hold release, toggle, keyboard, pair and motion imports', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
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

  await page.getByLabel('选择实况照片文件').setInputFiles(['public/demo/coast.jpg', 'public/demo/coast.mp4']);
  await expect(page.locator('.photo-caption h2')).toHaveText('coast.jpg');
  await player.click();
  await expect(player).toHaveAttribute('data-state', 'playing');
  await page.getByRole('button', { name: '恢复示例照片' }).click();

  const jpeg = await readFile('public/demo/coast.jpg');
  const mp4 = await readFile('public/demo/coast.mp4');
  const xml = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:GCamera="http://ns.google.com/photos/1.0/camera/" GCamera:MicroVideo="1" GCamera:MicroVideoOffset="${mp4.length}" /></rdf:RDF></x:xmpmeta>`;
  const payload = Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0'), Buffer.from(xml)]);
  const header = Buffer.from([0xff, 0xe1, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  const motion = Buffer.concat([jpeg.subarray(0, 2), header, payload, jpeg.subarray(2), mp4]);
  await page.getByLabel('选择实况照片文件').setInputFiles({ name: 'pixel-motion.jpg', mimeType: 'image/jpeg', buffer: motion });
  await expect(page.locator('.photo-caption p')).toHaveText('Android Motion Photo');
  await player.click();
  await expect(player).toHaveAttribute('data-state', 'playing');
  await expect.poll(() => video().evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.1);
  await page.getByRole('button', { name: '恢复示例照片' }).click();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
});

test('mobile layout, real touch hold and inline playback', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/');
  await expect.poll(() => page.locator('.live-photo__image').evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const player = page.locator('.live-photo');
  await player.scrollIntoViewIfNeeded();
  const rect = (await player.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }] });
  await expect(player).toHaveAttribute('data-state', 'playing');
  expect(await page.locator('video').evaluate((element: HTMLVideoElement) => element.playsInline)).toBe(true);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(player).toHaveAttribute('data-state', 'idle');
  await expect(player).toHaveAttribute('data-frame-visible', 'false');
  expect(await page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await context.close();
});
