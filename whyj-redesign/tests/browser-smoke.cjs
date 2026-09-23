const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const visualDir = process.env.VISUAL_DIR || path.join(__dirname, 'artifacts');
fs.mkdirSync(visualDir, { recursive: true });

const browserCandidates = [
  process.env.BROWSER_EXECUTABLE,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);
const browserExecutable = browserCandidates.find((candidate) => fs.existsSync(candidate));

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf'
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

async function inspectPage(page, url, expectedHeading) {
  const errors = [];
  const onConsole = (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); };
  const onPageError = (error) => errors.push(`pageerror: ${error.message}`);
  const onResponse = (response) => { if (response.status() >= 400) errors.push(`response ${response.status()}: ${response.url()}`); };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200, `${url} should return 200`);
  assert.match((await page.locator('h1').first().innerText()).trim(), expectedHeading, `${url} should show the expected h1`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${url} has ${overflow}px horizontal overflow`);
  assert.deepEqual(errors, [], `${url} emitted browser errors`);
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('response', onResponse);
}

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    ...(browserExecutable ? { executablePath: browserExecutable } : {}),
    headless: true
  });
  try {
    const viewports = [
      { name: '1920', width: 1920, height: 1080 },
      { name: '1440', width: 1440, height: 900 },
      { name: '1366', width: 1366, height: 768 },
      { name: 'tablet', width: 820, height: 1024 },
      { name: 'mobile', width: 390, height: 844 }
    ];

    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await inspectPage(page, `${base}/index.html`, /数智技术赋能非遗的价值链延伸与良好发展/);
      assert.equal(await page.locator('[data-home-section]').count(), 2, 'home should contain the banner and one core grid');
      assert.equal(await page.locator('[data-slide].active').count(), 1, 'carousel should show exactly one slide');
      const firstTitle = await page.locator('[data-slide].active h1, [data-slide].active h2').innerText();
      await page.locator('.home-hero .next').click();
      await page.waitForTimeout(800);
      const nextTitle = await page.locator('[data-slide].active h1, [data-slide].active h2').innerText();
      assert.notEqual(firstTitle, nextTitle, 'next control should change the active slide');
      await page.screenshot({ path: path.join(visualDir, `home-${viewport.name}.png`), fullPage: false });

      if (viewport.width <= 1120) {
        await page.locator('.menu-toggle').click();
        await page.waitForTimeout(350);
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
        assert.ok(await page.locator('#mobile-nav').evaluate((node) => node.classList.contains('open')));
        const menuBox = await page.locator('#mobile-nav').boundingBox();
        assert.ok(menuBox && menuBox.height >= viewport.height - 100, `mobile menu is only ${menuBox?.height || 0}px high at ${viewport.width}px`);
        if (viewport.name === 'mobile') await page.screenshot({ path: path.join(visualDir, 'menu-mobile.png'), fullPage: false });
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
      }
      await page.close();
    }

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const routes = [
      ['/news.html', /中心动态/],
      ['/media.html', /媒体聚焦/],
      ['/notices.html', /通知公告/],
      ['/news-detail.html?id=national-heritage-meeting-2024', /2024年全国非物质文化遗产保护工作会议/],
      ['/notice-detail.html?id=heritage-day-notice', /文化和自然遗产日/],
      ['/research-award-detail.html', /中心研究员王安妮教授成果荣获湖北省社会科学优秀成果奖二等奖/],
      ['/about.html#organization', /中心简介/],
      ['/people.html#members', /学术团队/],
      ['/people-detail.html?id=su-jianjiao', /苏健蛟/],
      ['/research.html#value-chain', /研究方向/],
      ['/perspectives.html', /他山之石/],
      ['/contact.html', /联系我们/],
      ['/fieldwork.html', /田野调查/],
      ['/heritage.html', /非遗档案/],
      ['/resources.html', /数字资源/],
      ['/policies.html', /政策法规/]
    ];
    for (const [route, heading] of routes) await inspectPage(page, base + route, heading);
    await page.goto(`${base}/news.html`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-news-list] .news-row').count(), 4);
    await page.screenshot({ path: path.join(visualDir, 'news-list-1440.png'), fullPage: false });
    await page.goto(`${base}/media.html`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-media-list] .media-row').count(), 3);
    await page.goto(`${base}/notices.html`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-notice-list] .notice-item').count(), 3);
    await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('a[href="https://www.whsu.edu.cn/"]').first().getAttribute('target'), '_blank');
    await page.locator('.search-toggle').click();
    assert.equal(await page.locator('#global-search').isVisible(), true, 'search form should open');
    assert.equal(await page.locator('#global-search input').evaluate((node) => node === document.activeElement), true, 'search input should receive focus');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#global-search').isHidden(), true, 'search form should close on Escape');
    await page.close();
    console.log(`browser smoke: ${viewports.length} viewports and ${routes.length} routes passed`);
    console.log(`screenshots: ${visualDir}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error);
  server.close();
  process.exitCode = 1;
});
