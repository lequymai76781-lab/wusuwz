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

    const track = desktop.locator('[data-heritage-track]');
    assert.equal(await track.count(), 1, 'homepage should contain one large visual heritage track');
    assert.ok((await track.boundingBox()).height >= 100, 'heritage transition should retain visible presence');
    const displayWordSize = parseFloat(await track.locator('.heritage-track__sequence').first().evaluate((node) => getComputedStyle(node).fontSize));
    assert.ok(displayWordSize >= 30, 'heritage transition typography should remain prominent');

    const heroIndex = desktop.locator('.home-hero-index [data-go]');
    assert.equal(await heroIndex.count(), 3, 'banner should expose three labelled visual index items');
    assert.match(await heroIndex.nth(0).innerText(), /01[\s\S]*SPORT HERITAGE[\s\S]*体育非遗/);
    assert.match(await heroIndex.nth(1).innerText(), /02[\s\S]*DIGITAL HERITAGE[\s\S]*数智非遗/);
    assert.match(await heroIndex.nth(2).innerText(), /03[\s\S]*COMMUNICATION[\s\S]*传播转化/);
    await heroIndex.nth(2).click();
    assert.equal(await heroIndex.nth(2).getAttribute('aria-current'), 'true');

    const grid = desktop.locator('.home-core-grid');
    assert.equal(await grid.evaluate((node) => getComputedStyle(node).borderTopWidth), '0px', 'editorial grid must not have an outer frame');
    const news = await desktop.locator('[data-home-quadrant="news"]').boundingBox();
    const media = await desktop.locator('[data-home-quadrant="media"]').boundingBox();
    const notices = await desktop.locator('[data-home-quadrant="notices"]').boundingBox();
    const results = await desktop.locator('[data-home-quadrant="results"]').boundingBox();
    assert.ok(news.width > media.width + 100, 'first row should carry its visual weight on center updates');
    assert.ok(results.width > notices.width + 100, 'second row should carry its visual weight on research outputs');
    assert.ok(notices.y > news.y + news.height + 56, 'editorial rows need generous vertical breathing room');

    const firstNewsSize = parseFloat(await desktop.locator('[data-home-quadrant="news"] .news-row').nth(0).locator('h3').evaluate((node) => getComputedStyle(node).fontSize));
    const secondNewsSize = parseFloat(await desktop.locator('[data-home-quadrant="news"] .news-row').nth(1).locator('h3').evaluate((node) => getComputedStyle(node).fontSize));
    assert.ok(firstNewsSize >= secondNewsSize + 8, 'lead news should be visually distinct from the supporting list');
    const mediaTitleSize = parseFloat(await desktop.locator('[data-home-quadrant="media"] .media-row h3').first().evaluate((node) => getComputedStyle(node).fontSize));
    assert.ok(mediaTitleSize >= 18, 'media focus headlines should remain legible without overpowering center updates');
    const noticeDateSize = parseFloat(await desktop.locator('[data-home-quadrant="notices"] .notice-item time b').first().evaluate((node) => getComputedStyle(node).fontSize));
    assert.ok(noticeDateSize >= 40, 'notice dates should act as visual anchors');
    const resultNumberSize = parseFloat(await desktop.locator('.research-result-item .result-index').first().evaluate((node) => getComputedStyle(node).fontSize));
    assert.ok(resultNumberSize >= 55, 'research outputs should use large archival numbering');

    const progressBefore = parseFloat(await track.evaluate((node) => getComputedStyle(node).getPropertyValue('--track-progress'))) || 0;
    await desktop.evaluate(() => window.scrollTo(0, document.querySelector('[data-heritage-track]').offsetTop + 360));
    await desktop.waitForTimeout(120);
    const progressAfter = parseFloat(await track.evaluate((node) => getComputedStyle(node).getPropertyValue('--track-progress'))) || 0;
    assert.ok(Math.abs(progressAfter - progressBefore) > 0.05, 'heritage track motion should respond gently to scrolling');
    await desktop.close();

    const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const reduced = await reducedContext.newPage();
    await reduced.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    await reduced.evaluate(() => window.scrollTo(0, document.querySelector('[data-heritage-track]').offsetTop + 360));
    await reduced.waitForTimeout(120);
    const reducedProgress = parseFloat(await reduced.locator('[data-heritage-track]').evaluate((node) => getComputedStyle(node).getPropertyValue('--track-progress'))) || 0;
    assert.equal(reducedProgress, 0, 'reduced-motion preference should keep the visual track static');
    await reducedContext.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    const quadrants = mobile.locator('[data-home-quadrant]');
    const first = await quadrants.nth(0).boundingBox();
    const second = await quadrants.nth(1).boundingBox();
    assert.ok(second.y > first.y + first.height + 40, 'mobile modules should remain visibly separated');
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `mobile homepage has ${overflow}px horizontal overflow`);
    await mobile.close();

    console.log('home v3 visual browser test passed');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error);
  server.close();
  process.exitCode = 1;
});
