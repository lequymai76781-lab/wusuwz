const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const browserCandidates = [
  process.env.BROWSER_EXECUTABLE,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const browserExecutable = browserCandidates.find((candidate) => fs.existsSync(candidate));
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png'
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return response.writeHead(404).end('Not found');
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ ...(browserExecutable ? { executablePath: browserExecutable } : {}), headless: true });

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktop.goto(`${base}/index.html`, { waitUntil: 'networkidle' });

    const hero = desktop.locator('.home-hero');
    const track = desktop.locator('[data-heritage-track]');
    const grid = desktop.locator('.home-core-grid');
    assert.equal(await track.locator('img').count(), 0, 'cultural transition strip must not repeat a banner image');
    const trackText = await track.innerText();
    assert.match(trackText, /HERITAGE/);
    assert.match(trackText, /SPORT/);
    assert.match(trackText, /DIGITAL/);
    assert.match(trackText, /COMMUNICATION/);

    const heroBox = await hero.boundingBox();
    const trackBox = await track.boundingBox();
    const gridBox = await grid.boundingBox();
    assert.ok(trackBox.height >= 110 && trackBox.height <= 150, `transition strip height should stay between 110 and 150px, got ${trackBox.height}`);
    assert.ok(Math.abs(trackBox.y - (heroBox.y + heroBox.height)) <= 1, 'dynamic typography should connect directly to the banner');
    assert.ok(gridBox.y - (trackBox.y + trackBox.height) >= 64, 'transition strip and content panels need visible breathing space');

    const panels = desktop.locator('[data-home-quadrant]');
    assert.equal(await panels.count(), 4);
    const panelStyles = await panels.evaluateAll((nodes) => nodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        background: style.backgroundColor,
        radius: parseFloat(style.borderTopLeftRadius),
        shadow: style.boxShadow
      };
    }));
    assert.equal(new Set(panelStyles.map((style) => style.background)).size, 4, 'four panels should have four subtle environmental tones');
    panelStyles.forEach((style) => {
      assert.ok(style.radius >= 0 && style.radius <= 4, 'module corners should follow the restrained straight-edge system');
      assert.notEqual(style.shadow, 'none', 'panels should have a very light depth cue');
    });

    const firstNewsSize = parseFloat(await desktop.locator('[data-home-quadrant="news"] .news-row').nth(0).locator('h3').evaluate((node) => getComputedStyle(node).fontSize));
    const secondNewsSize = parseFloat(await desktop.locator('[data-home-quadrant="news"] .news-row').nth(1).locator('h3').evaluate((node) => getComputedStyle(node).fontSize));
    assert.ok(firstNewsSize >= secondNewsSize + 10, 'lead news title should be the news panel visual anchor');
    const mediaMark = desktop.locator('.module-mark-media');
    assert.equal(await mediaMark.innerText(), 'MEDIA');
    assert.ok(parseFloat(await mediaMark.evaluate((node) => getComputedStyle(node).fontSize)) >= 80, 'media panel should use oversized typographic framing');
    const noticeDateSize = parseFloat(await desktop.locator('[data-home-quadrant="notices"] .notice-item time b').first().evaluate((node) => getComputedStyle(node).fontSize));
    assert.ok(noticeDateSize >= 40, 'notice dates should remain unmistakable anchors');
    const resultNumberSize = parseFloat(await desktop.locator('.research-result-item .result-index').first().evaluate((node) => getComputedStyle(node).fontSize));
    assert.ok(resultNumberSize >= 55, 'research numbering should remain a major academic visual anchor');

    const leadNews = desktop.locator('[data-home-quadrant="news"] .news-row').first();
    await leadNews.scrollIntoViewIfNeeded();
    const backgroundBefore = await leadNews.evaluate((node) => getComputedStyle(node).backgroundColor);
    await leadNews.hover();
    await desktop.waitForTimeout(280);
    const backgroundAfter = await leadNews.evaluate((node) => getComputedStyle(node).backgroundColor);
    assert.notEqual(backgroundAfter, backgroundBefore, 'content rows should provide a restrained hover response');

    await track.scrollIntoViewIfNeeded();
    const pointerBefore = parseFloat(await track.evaluate((node) => getComputedStyle(node).getPropertyValue('--track-pointer-shift'))) || 0;
    const pointerBox = await track.boundingBox();
    await desktop.mouse.move(pointerBox.x + pointerBox.width * .86, pointerBox.y + pointerBox.height * .5);
    await desktop.waitForTimeout(120);
    const pointerAfter = parseFloat(await track.evaluate((node) => getComputedStyle(node).getPropertyValue('--track-pointer-shift'))) || 0;
    assert.ok(Math.abs(pointerAfter - pointerBefore) >= 4, 'transition typography should respond gently to pointer movement');
    await desktop.close();

    const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const reduced = await reducedContext.newPage();
    await reduced.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    const reducedTrack = reduced.locator('[data-heritage-track]');
    await reducedTrack.scrollIntoViewIfNeeded();
    const reducedBox = await reducedTrack.boundingBox();
    await reduced.mouse.move(reducedBox.x + reducedBox.width * .86, reducedBox.y + reducedBox.height * .5);
    await reduced.waitForTimeout(120);
    const reducedPointer = parseFloat(await reducedTrack.evaluate((node) => getComputedStyle(node).getPropertyValue('--track-pointer-shift'))) || 0;
    assert.equal(reducedPointer, 0, 'reduced-motion mode should disable pointer-driven movement');
    await reducedContext.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    const mobilePanels = mobile.locator('[data-home-quadrant]');
    const first = await mobilePanels.nth(0).boundingBox();
    const second = await mobilePanels.nth(1).boundingBox();
    assert.ok(second.y > first.y + first.height + 32, 'mobile panels should retain breathing space');
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `mobile homepage has ${overflow}px horizontal overflow`);
    await mobile.close();

    console.log('home v4 visual browser test passed');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error);
  server.close();
  process.exitCode = 1;
});
