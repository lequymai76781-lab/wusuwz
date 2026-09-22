const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const browserCandidates = [
  process.env.BROWSER_EXECUTABLE,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);
const browserExecutable = browserCandidates.find((candidate) => fs.existsSync(candidate));
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png' };

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return response.writeHead(404).end('Not found');
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
    assert.equal(await desktop.locator('[data-home-quadrant]').count(), 4);
    assert.equal(await desktop.locator('[data-home-section]').count(), 2);
    const heroRatio = await desktop.locator('.home-hero').evaluate((node) => node.getBoundingClientRect().height / innerHeight);
    assert.ok(heroRatio >= 0.55 && heroRatio <= 0.65, `banner ratio should be near 60vh, got ${heroRatio}`);
    const desktopGridDisplay = await desktop.locator('.home-core-grid').evaluate((node) => getComputedStyle(node).display);
    assert.equal(desktopGridDisplay, 'grid');
    assert.equal(await desktop.locator('[data-home-quadrant="news"] .news-row').count(), 3);
    assert.equal(await desktop.locator('[data-home-quadrant="media"] .media-row').count(), 3);
    assert.equal(await desktop.locator('[data-home-quadrant="notices"] .notice-item').count(), 2);
    assert.equal(await desktop.locator('[data-home-quadrant="results"] .research-result-item').count(), 2);
    assert.equal(await desktop.locator('[data-home-quadrant="news"]').getByText('“春节——中国人庆祝传统新年的社会实践”列入相关名录').count(), 0);

    const mediaResponse = await desktop.goto(`${base}/media.html`, { waitUntil: 'networkidle' });
    assert.equal(mediaResponse.status(), 200);
    assert.equal(await desktop.locator('[data-media-list] .media-row').count(), 3);
    const officialLinks = desktop.locator('[data-media-list] .media-row h3 a');
    assert.equal(await officialLinks.first().getAttribute('target'), '_blank');
    assert.equal(await officialLinks.first().getAttribute('href'), 'https://paper.people.com.cn/rmrb/pc/content/202609/17/content_30181548.html');
    await desktop.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    const mobileColumns = await mobile.locator('.home-core-grid').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    assert.equal(mobileColumns, 1);
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `mobile homepage has ${overflow}px horizontal overflow`);
    await mobile.close();
    console.log('home v2.1 browser test passed');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error);
  server.close();
  process.exitCode = 1;
});

