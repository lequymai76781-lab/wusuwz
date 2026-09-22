const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const visualDir = path.join(__dirname, 'artifacts');
fs.mkdirSync(visualDir, { recursive: true });

const browserCandidates = [
  process.env.BROWSER_EXECUTABLE,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
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

const assertNoOverflow = async (page, label) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${label} has ${overflow}px horizontal overflow`);
};

const moduleMetrics = async (page) => page.locator('[data-home-quadrant]').evaluateAll((nodes) => nodes.map((node) => {
  const box = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  return {
    name: node.dataset.homeQuadrant,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    background: style.backgroundColor,
    shadow: style.boxShadow,
    radius: style.borderTopLeftRadius,
    overflow: node.scrollWidth - node.clientWidth
  };
}));

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ ...(browserExecutable ? { executablePath: browserExecutable } : {}), headless: true });

  try {
    const viewports = [
      { name: '1920', width: 1920, height: 1080 },
      { name: '1440', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 }
    ];

    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });

      assert.deepEqual(await page.locator('[data-home-quadrant]').evaluateAll((nodes) => nodes.map((node) => node.dataset.homeQuadrant)), ['news', 'media', 'notices', 'results']);
      assert.equal(await page.locator('[data-research-results] .research-result-item').count(), 2);
      assert.equal(await page.locator('[data-home-quadrant="news"] .news-row').count(), 3);
      assert.equal(await page.locator('[data-home-quadrant="notices"] .notice-item').count(), 2);
      assert.equal(await page.locator('[data-home-quadrant="media"] .media-row').count(), 3);
      assert.deepEqual(await page.locator('[data-research-results] .result-action').evaluateAll((nodes) => nodes.map((node) => node.href)), [
        'https://mp.weixin.qq.com/s/7CfV_VVHeiJMG84GoI4UHA',
        'https://mp.weixin.qq.com/s/qg4LxiSi-ZOupq19c1rmjA'
      ]);
      assert.deepEqual(await page.locator('[data-home-quadrant="media"] .media-row h3 a').evaluateAll((nodes) => nodes.map((node) => node.href)), [
        'https://paper.people.com.cn/rmrb/pc/content/202609/17/content_30181548.html',
        'https://epaper.gmw.cn/gmrb/html/content/202609/08/content_24414.html',
        'https://epaper.gmw.cn/gmrb/html/content/202609/04/content_24004.html'
      ]);
      assert.deepEqual(await page.locator('[data-home-quadrant="media"] .media-row h3 a').evaluateAll((nodes) => nodes.map((node) => ({ target: node.target, rel: node.rel }))), [
        { target: '_blank', rel: 'noopener noreferrer' },
        { target: '_blank', rel: 'noopener noreferrer' },
        { target: '_blank', rel: 'noopener noreferrer' }
      ]);
      assert.deepEqual(await page.locator('[data-home-quadrant="media"] .media-source').allInnerTexts(), ['人民日报', '光明日报', '光明日报']);
      const retiredMediaCopy = [['资料', '待核验'], ['来源', '待确认'], ['真实报道将在确认媒体来源后', '发布']].map((parts) => parts.join(''));
      assert.equal(await page.locator('body').innerText().then((text) => retiredMediaCopy.some((copy) => text.includes(copy))), false);
      assert.equal(await page.locator('.identity-copy b').innerText(), '湖北省非物质文化遗产中心');
      assert.equal(await page.locator('.site-footer h2').innerText(), '湖北省非物质文化遗产中心');
      assert.equal(await page.locator('body').innerText().then((text) => text.includes(['非物质文化遗产', '研究中心'].join(''))), false);
      const headerContrast = await page.locator('.site-header').evaluate((header) => {
        const parse = (value) => value.match(/[\d.]+/g).map(Number);
        const composite = (foreground, background) => foreground.slice(0, 3).map((channel, index) => channel * (foreground[3] ?? 1) + background[index] * (1 - (foreground[3] ?? 1)));
        const luminance = (rgb) => {
          const linear = rgb.map((channel) => {
            const normalized = channel / 255;
            return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
          });
          return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
        };
        const background = composite(parse(getComputedStyle(header).backgroundColor), [255, 255, 255]);
        const ratios = [header.querySelector('.identity-copy b'), header.querySelector('.desktop-nav a, .mobile-nav a'), header.querySelector('.icon-button')].map((node) => {
          const foreground = parse(getComputedStyle(node).color);
          const light = Math.max(luminance(foreground), luminance(background));
          const dark = Math.min(luminance(foreground), luminance(background));
          return (light + .05) / (dark + .05);
        });
        return ratios;
      });
      headerContrast.forEach((ratio) => assert.ok(ratio >= 4.5, `${viewport.name} header text contrast is only ${ratio.toFixed(2)}:1`));
      assert.equal(await page.locator('[data-slide].active').count(), 1);
      assert.equal(await page.locator('[data-slide]:not(.active)').count(), 2);

      const brand = await page.locator('[data-brand-lockup]').boundingBox();
      const tools = await page.locator('.header-tools').boundingBox();
      const mark = await page.locator('.identity-mark').boundingBox();
      assert.ok(brand && tools && brand.x + brand.width <= tools.x + 1, `${viewport.name} brand overlaps header tools`);
      assert.ok(mark.width >= (viewport.width <= 620 ? 48 : 58), `${viewport.name} brand mark is too small`);
      const brandNameSize = await page.locator('.identity-copy b').evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
      assert.ok(brandNameSize >= (viewport.width <= 620 ? 14 : 20), `${viewport.name} center name is too small`);
      const pageSurface = await page.locator('body').evaluate((node) => ({ color: getComputedStyle(node).backgroundColor, image: getComputedStyle(node).backgroundImage }));
      assert.notEqual(pageSurface.color, 'rgb(255, 255, 255)', `${viewport.name} background must not be dead white`);
      assert.match(pageSurface.image, /radial-gradient/, `${viewport.name} background needs restrained tonal texture`);
      await assertNoOverflow(page, viewport.name);

      const metrics = await moduleMetrics(page);
      metrics.forEach((item) => assert.ok(item.overflow <= 1, `${viewport.name} ${item.name} overflows by ${item.overflow}px`));
      const byName = Object.fromEntries(metrics.map((item) => [item.name, item]));
      if (viewport.width >= 1241) {
        assert.equal(await page.locator('.desktop-nav').isVisible(), true, `${viewport.name} should show desktop navigation`);
        assert.ok(byName.news.width > byName.media.width * 1.35, 'center news must have clearly greater visual width than media focus');
        assert.ok(byName.results.width > byName.notices.width * 1.35, 'research results must have clearly greater visual width than announcements');
        assert.ok(byName.media.y >= byName.news.y + 60, 'media focus should be vertically offset from center news');
        assert.notEqual(byName.news.shadow, 'none', 'center news needs editorial depth');
        assert.equal(new Set(metrics.map((item) => item.background)).size, 4, 'all four modules need distinct restrained background tones');
        assert.notEqual(byName.media.background, byName.results.background, 'media focus and results need distinct visual systems');
        const texturedModules = await page.locator('[data-home-quadrant]').evaluateAll((nodes) => nodes.filter((node) => getComputedStyle(node).backgroundImage !== 'none').length);
        assert.equal(texturedModules, 4, 'all four modules need restrained texture layers');
      } else {
        for (let index = 1; index < metrics.length; index += 1) {
          const previous = metrics[index - 1];
          const current = metrics[index];
          assert.ok(current.y >= previous.y + previous.height + 45, `${viewport.name} modules need breathing space`);
        }
      }

      const longTitles = page.locator('.research-result-item h3');
      for (let index = 0; index < await longTitles.count(); index += 1) {
        const title = longTitles.nth(index);
        const titleBox = await title.boundingBox();
        const fontSize = await title.evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
        assert.ok(titleBox.height >= fontSize * 2.4, `${viewport.name} long result title should wrap cleanly`);
      }

      const heroCoverage = await page.locator('[data-slide].active img').evaluate((image) => {
        const imageBox = image.getBoundingClientRect();
        const heroBox = image.closest('[data-hero]').getBoundingClientRect();
        return { width: imageBox.width - heroBox.width, height: imageBox.height - heroBox.height };
      });
      assert.ok(heroCoverage.width >= -1 && heroCoverage.height >= -1, `${viewport.name} active hero image does not cover the banner`);
      assert.deepEqual(errors, [], `${viewport.name} emitted browser errors`);
      await page.screenshot({ path: path.join(visualDir, `home-v5-${viewport.name}-full.png`), fullPage: true });
      await page.close();
    }

    const zoomContext = await browser.newContext({ viewport: { width: 1152, height: 720 }, deviceScaleFactor: 1.25 });
    const zoomPage = await zoomContext.newPage();
    await zoomPage.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    assert.equal(await zoomPage.locator('.desktop-nav').isHidden(), true, '125% zoom equivalent should switch to compact navigation');
    assert.equal(await zoomPage.locator('.menu-toggle').isVisible(), true);
    await assertNoOverflow(zoomPage, '125% zoom equivalent');
    const zoomBrand = await zoomPage.locator('[data-brand-lockup]').boundingBox();
    const zoomTools = await zoomPage.locator('.header-tools').boundingBox();
    assert.ok(zoomBrand.x + zoomBrand.width <= zoomTools.x + 1, 'brand overlaps tools at 125% zoom equivalent');
    await zoomPage.screenshot({ path: path.join(visualDir, 'home-v5-zoom-125.png'), fullPage: false });
    await zoomContext.close();

    console.log('home v5 visual QA passed: 1920x1080, 1440x900, mobile, long titles, hero coverage, and 125% zoom equivalent');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error);
  server.close();
  process.exitCode = 1;
});
