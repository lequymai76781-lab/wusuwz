const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const visualDir = path.join(__dirname, 'artifacts');
fs.mkdirSync(visualDir, { recursive: true });
const browserExecutable = [process.env.BROWSER_EXECUTABLE, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean).find(fs.existsSync);
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const file = path.resolve(root, decodeURIComponent(pathname === '/' ? '/index.html' : pathname).replace(/^\/+/, ''));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return response.writeHead(404).end('Not found');
  response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

const readModules = (page) => page.locator('[data-home-quadrant]').evaluateAll((nodes) => nodes.map((node) => {
  const box = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  return { name: node.dataset.homeQuadrant, x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height, background: style.backgroundColor, image: style.backgroundImage, overflowX: node.scrollWidth - node.clientWidth, overflowY: node.scrollHeight - node.clientHeight };
}));
const officialDirections = [
  '数智技术赋能非遗的价值链延伸与良好发展',
  '数智驱动非遗的文旅融合与科学化循证',
  '非遗数智传播与活态转化研究'
];

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ ...(browserExecutable ? { executablePath: browserExecutable } : {}), headless: true });
  try {
    for (const viewport of [{ name: '1920', width: 1920, height: 1080 }, { name: '1440', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });

      assert.deepEqual(await page.locator('[data-home-quadrant]').evaluateAll((nodes) => nodes.map((node) => node.dataset.homeQuadrant)), ['news', 'notices', 'results', 'media']);
      assert.equal(await page.locator('.module-mark').count(), 0);
      assert.equal(await page.locator('[data-home-quadrant="media"] .media-row').count(), 3);
      assert.deepEqual(await page.locator('.media-brand img').evaluateAll((nodes) => nodes.map((node) => node.alt)), ['人民日报', '光明日报', '光明日报']);
      assert.equal(await page.locator('.media-brand img').evaluateAll((nodes) => nodes.every((node) => node.complete && node.naturalWidth > 0 && node.getAttribute('src').startsWith('assets/media/'))), true);
      assert.equal(await page.locator('[data-home-quadrant="media"] a[target="_blank"][rel="noopener noreferrer"]').count(), 6);
      assert.equal(await page.locator('main').evaluate((node) => getComputedStyle(node, '::after').backgroundImage), 'none');

      for (let index = 0; index < officialDirections.length; index += 1) {
        await page.locator('.home-hero-index button').nth(index).click();
        assert.equal((await page.locator('[data-slide].active .research-direction-title').textContent()).trim(), officialDirections[index]);
      }
      assert.deepEqual(await page.locator('.home-hero-index b').allInnerTexts(), ['RESEARCH 01', 'RESEARCH 02', 'RESEARCH 03']);
      assert.deepEqual(await page.locator('.home-hero-index small').allInnerTexts(), ['研究一', '研究二', '研究三']);

      const notice = page.getByRole('link', { name: '《非物质文化遗产保护传承“十五五”规划》印发', exact: true }).first();
      assert.equal(await notice.getAttribute('href'), 'https://mp.weixin.qq.com/s/YxdFFkSIV-O7y6eB7g4PRA');
      assert.equal(await notice.getAttribute('target'), '_blank');
      assert.equal(await notice.getAttribute('rel'), 'noopener noreferrer');
      const noticeTime = page.locator('[data-home-quadrant="notices"] .notice-item').first().locator('time');
      assert.equal(await noticeTime.getAttribute('datetime'), '2026-09-21');
      assert.match((await noticeTime.innerText()).replace(/\s+/g, ' '), /21.*2026\.09/);

      const divider = page.locator('.home-cultural-divider');
      assert.equal(await divider.count(), 1);
      assert.equal(await divider.locator('svg').count(), 1);
      assert.equal(await divider.locator('img').count(), 0);
      assert.ok(await divider.locator('[data-bianzhong-bell]').count() >= 3, 'bianzhong rhythm needs repeated abstract bell outlines');
      const dividerBox = await divider.boundingBox();
      assert.ok(dividerBox.height >= 40 && dividerBox.height <= 80, `divider height ${dividerBox.height}px is outside 40-80px`);

      const modules = await readModules(page);
      modules.forEach((item) => {
        assert.equal(item.image, 'none', `${item.name} owns a decorative texture`);
        assert.ok(item.overflowX <= 1 && item.overflowY <= 1, `${viewport.name} ${item.name} overflows`);
      });
      const byName = Object.fromEntries(modules.map((item) => [item.name, item]));
      if (viewport.width >= 1041) {
        assert.ok(byName.news.width > byName.notices.width * 1.35, 'top-left news must remain clearly wider than top-right notices');
        assert.ok(byName.media.width > byName.results.width * 1.35, 'bottom-right media must remain clearly wider than bottom-left results');
        assert.ok(byName.notices.x > byName.news.right, 'notices must stay in the top-right position');
        assert.ok(byName.results.x < byName.media.x, 'results must stay left of media');
        assert.ok(byName.results.y > byName.news.bottom, 'results must stay below news with breathing room');
        assert.ok(byName.media.y > byName.notices.bottom, 'media must stay below notices with breathing room');
        assert.ok(Math.max(...modules.map((item) => item.height)) - Math.min(...modules.map((item) => item.height)) >= 80, `${viewport.name} modules became equal-height again`);
      } else {
        for (let index = 1; index < modules.length; index += 1) {
          assert.ok(modules[index].y >= modules[index - 1].bottom + 18, 'mobile modules overlap');
          assert.ok(Math.abs(modules[index].width - modules[0].width) <= 2, 'mobile module widths differ');
        }
      }

      const footerBox = await page.locator('.site-footer').boundingBox();
      assert.ok(Math.abs(footerBox.y - (dividerBox.y + dividerBox.height)) <= 2, 'bianzhong divider must connect directly to the footer');

      assert.equal(await page.locator('.identity-copy b').innerText(), '湖北省非物质文化遗产中心');
      assert.equal(await page.locator('.site-footer h2').innerText(), '湖北省非物质文化遗产中心');
      assert.ok(await page.locator('html').evaluate((node) => node.scrollWidth - node.clientWidth) <= 1, `${viewport.name} page overflows`);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(visualDir, `home-final-${viewport.name}-full.png`), fullPage: true });
      await page.close();
    }
    console.log('home final visual QA passed');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error);
  server.close();
  process.exitCode = 1;
});
