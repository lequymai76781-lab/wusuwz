const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const searchButton = document.querySelector('.search-toggle');
const searchForm = document.querySelector('#global-search');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const closeSearch = ({ restoreFocus = false } = {}) => {
  if (!searchButton || !searchForm) return;
  searchButton.setAttribute('aria-expanded', 'false');
  searchButton.setAttribute('aria-label', '打开搜索');
  searchForm.hidden = true;
  if (restoreFocus) searchButton.focus();
};

const closeMobileNav = ({ restoreFocus = false } = {}) => {
  if (!menuButton || !mobileNav) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '打开导航');
  mobileNav.classList.remove('open');
  document.body.classList.remove('menu-open');
  if (restoreFocus) menuButton.focus();
};

menuButton?.addEventListener('click', () => {
  const opening = menuButton.getAttribute('aria-expanded') !== 'true';
  if (opening) closeSearch();
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute('aria-label', opening ? '关闭导航' : '打开导航');
  mobileNav?.classList.toggle('open', opening);
  document.body.classList.toggle('menu-open', opening);
});

mobileNav?.addEventListener('click', (event) => {
  if (event.target.matches('a')) closeMobileNav();
});

searchButton?.addEventListener('click', () => {
  const opening = searchButton.getAttribute('aria-expanded') !== 'true';
  if (opening) closeMobileNav();
  searchButton.setAttribute('aria-expanded', String(opening));
  searchButton.setAttribute('aria-label', opening ? '关闭搜索' : '打开搜索');
  searchForm.hidden = !opening;
  if (opening) searchForm.querySelector('input')?.focus();
});

searchForm?.addEventListener('submit', (event) => event.preventDefault());

addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (mobileNav?.classList.contains('open')) closeMobileNav({ restoreFocus: true });
  else if (searchForm && !searchForm.hidden) closeSearch({ restoreFocus: true });
});

addEventListener('resize', () => {
  if (innerWidth > 1120 && mobileNav?.classList.contains('open')) closeMobileNav();
});

const hero = document.querySelector('[data-hero]');
if (hero) {
  const slides = [...hero.querySelectorAll('[data-slide]')];
  const dots = [...hero.querySelectorAll('[data-go]')];
  const previousButton = hero.querySelector('.prev');
  const nextButton = hero.querySelector('.next');
  let current = 0;
  let timer;
  let pointerStart = null;

  const show = (next) => {
    current = (next + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      const active = index === current;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, index) => {
      const active = index === current;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  const stop = () => clearInterval(timer);
  const start = () => {
    stop();
    if (!reduceMotion && slides.length > 1) timer = setInterval(() => show(current + 1), 6500);
  };
  const choose = (next) => { show(next); start(); };

  previousButton?.addEventListener('click', () => choose(current - 1));
  nextButton?.addEventListener('click', () => choose(current + 1));
  dots.forEach((dot) => dot.addEventListener('click', () => choose(Number(dot.dataset.go))));
  hero.addEventListener('mouseenter', stop);
  hero.addEventListener('mouseleave', start);
  hero.addEventListener('focusin', stop);
  hero.addEventListener('focusout', start);
  hero.addEventListener('pointerdown', (event) => { pointerStart = event.clientX; });
  hero.addEventListener('pointerup', (event) => {
    if (pointerStart === null) return;
    const delta = event.clientX - pointerStart;
    pointerStart = null;
    if (Math.abs(delta) > 50) choose(current + (delta < 0 ? 1 : -1));
  });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  show(0);
  start();
}

const heritageTrack = document.querySelector('[data-heritage-track]');
if (heritageTrack) {
  let trackFrame = 0;

  const resetHeritageTrackMotion = () => {
    heritageTrack.style.setProperty('--track-progress', '0');
    heritageTrack.style.setProperty('--track-scroll-shift', '0px');
    heritageTrack.style.setProperty('--track-pointer-shift', '0px');
  };

  const updateHeritageTrack = () => {
    trackFrame = 0;
    if (reduceMotion) {
      resetHeritageTrackMotion();
      return;
    }
    const bounds = heritageTrack.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight + bounds.height)));
    heritageTrack.style.setProperty('--track-progress', progress.toFixed(4));
    heritageTrack.style.setProperty('--track-scroll-shift', `${Math.round((.5 - progress) * 32)}px`);
  };

  const requestHeritageTrackUpdate = () => {
    if (!trackFrame) trackFrame = requestAnimationFrame(updateHeritageTrack);
  };

  heritageTrack.addEventListener('pointermove', (event) => {
    if (reduceMotion) return;
    const bounds = heritageTrack.getBoundingClientRect();
    const normalized = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5));
    heritageTrack.style.setProperty('--track-pointer-shift', `${Math.round(normalized * 16)}px`);
  });
  heritageTrack.addEventListener('pointerleave', () => {
    heritageTrack.style.setProperty('--track-pointer-shift', '0px');
  });
  addEventListener('scroll', requestHeritageTrackUpdate, { passive: true });
  addEventListener('resize', requestHeritageTrackUpdate);
  updateHeritageTrack();
}

const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));

const renderNewsList = (container, items, limit) => {
  const visible = Number.isFinite(limit) ? items.slice(0, limit) : items;
  container.innerHTML = visible.map((item) => `
    <article class="news-row">
      <time datetime="${escapeHTML(item.date)}">${escapeHTML(item.date)}</time>
      <div><span class="category">${escapeHTML(item.category)}</span><h3><a href="news-detail.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.title)}</a></h3>${item.summary ? `<p>${escapeHTML(item.summary)}</p>` : ''}</div>
      <a class="row-arrow" href="news-detail.html?id=${encodeURIComponent(item.id)}" aria-label="查看${escapeHTML(item.title)}">→</a>
    </article>`).join('');
};

document.querySelectorAll('[data-news-list]').forEach((container) => {
  const items = container.hasAttribute('data-skip-featured') ? (window.NEWS || []).filter((entry) => !entry.featured) : (window.NEWS || []);
  renderNewsList(container, items, Number(container.dataset.limit) || undefined);
});

document.querySelectorAll('[data-news-featured]').forEach((container) => {
  const item = (window.NEWS || []).find((entry) => entry.featured) || (window.NEWS || [])[0];
  if (!item) return;
  container.innerHTML = `<time datetime="${escapeHTML(item.date)}">${escapeHTML(item.date)}</time><span>${escapeHTML(item.category)}</span><h3>${escapeHTML(item.title)}</h3>${item.summary ? `<p>${escapeHTML(item.summary)}</p>` : ''}<a href="news-detail.html?id=${encodeURIComponent(item.id)}">阅读全文 →</a>`;
});

const renderMediaList = (container, items, limit) => {
  const visible = Number.isFinite(limit) ? items.slice(0, limit) : items;
  container.innerHTML = visible.length ? visible.map((item) => `
    <article class="media-row">
      <div class="media-meta"><time datetime="${escapeHTML(item.date)}">${escapeHTML(item.date)}</time>${item.source ? `<span>${escapeHTML(item.source)}</span>` : ''}</div>
      <h3><a href="media-detail.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.title)}</a></h3>
      <a class="row-arrow" href="media-detail.html?id=${encodeURIComponent(item.id)}" aria-label="查看${escapeHTML(item.title)}">→</a>
    </article>`).join('') : '<p class="pending-copy">媒体聚焦真实内容待补充</p>';
};

document.querySelectorAll('[data-media-list]').forEach((container) => {
  renderMediaList(container, window.MEDIA || [], Number(container.dataset.limit) || undefined);
});

const renderNoticeList = (container, items, limit) => {
  const visible = Number.isFinite(limit) ? items.slice(0, limit) : items;
  container.innerHTML = visible.map((item) => {
    const [day, month = ''] = item.date.split(' ');
    return `<article class="notice-item"><time><b>${escapeHTML(day)}</b><span>${escapeHTML(month)}</span></time><div><span>${escapeHTML(item.category)}</span><h3><a href="notice-detail.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.title)}</a></h3></div><a class="row-arrow" href="notice-detail.html?id=${encodeURIComponent(item.id)}" aria-label="查看${escapeHTML(item.title)}">→</a></article>`;
  }).join('');
};

document.querySelectorAll('[data-notice-list]').forEach((container) => {
  renderNoticeList(container, window.NOTICES || [], Number(container.dataset.limit) || undefined);
});

const articleTypes = {
  news: { page: 'news.html', label: '中心动态' },
  notice: { page: 'notices.html', label: '通知公告' },
  media: { page: 'media.html', label: '媒体聚焦' }
};

const renderArticleDetail = (root, items, type) => {
  const id = new URLSearchParams(location.search).get('id');
  const item = items.find((entry) => entry.id === id);
  const config = articleTypes[type];
  if (!item) {
    document.title = `内容未找到｜非物质文化遗产研究中心`;
    root.innerHTML = `<article><h1>未找到相关内容</h1><p>该内容可能尚未导入或链接有误。</p><a class="back-people" href="${config.page}">← 返回${config.label}</a></article>`;
    return;
  }
  document.title = `${item.title}｜${config.label}｜非物质文化遗产研究中心`;
  root.querySelector('[data-article-title]').textContent = item.title;
  root.querySelector('[data-article-date]').textContent = item.date;
  root.querySelector('[data-article-category]').textContent = item.source || item.category;
  root.querySelector('[data-article-body]').innerHTML = item.body
    ? `<p>${escapeHTML(item.body)}</p>`
    : '<p class="pending-copy">正文资料待导入</p>';
};

const newsDetail = document.querySelector('[data-news-detail]');
if (newsDetail) renderArticleDetail(newsDetail, window.NEWS || [], 'news');
const noticeDetail = document.querySelector('[data-notice-detail]');
if (noticeDetail) renderArticleDetail(noticeDetail, window.NOTICES || [], 'notice');
const mediaDetail = document.querySelector('[data-media-detail]');
if (mediaDetail) renderArticleDetail(mediaDetail, window.MEDIA || [], 'media');

const filterButtons = [...document.querySelectorAll('[data-filter]')];
filterButtons.forEach((button) => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  filterButtons.forEach((item) => item.classList.toggle('active', item === button));
  document.querySelectorAll('[data-category]').forEach((card) => {
    card.hidden = filter !== 'all' && card.dataset.category !== filter;
  });
}));

const expertDetail = document.querySelector('[data-expert-detail]');
if (expertDetail && window.EXPERTS) {
  const id = new URLSearchParams(location.search).get('id');
  const expert = window.EXPERTS.find((item) => item.id === id);
  if (!expert) {
    document.title = '专家未找到｜非物质文化遗产研究中心';
    expertDetail.innerHTML = '<section class="content-section"><h1>未找到专家资料</h1><p><a href="people.html#members">返回中心成员 →</a></p></section>';
  } else {
    document.title = `${expert.name}｜专家简介｜非物质文化遗产研究中心`;
    const image = expertDetail.querySelector('[data-expert-image]');
    image.src = expert.image;
    image.alt = expert.name;
    expertDetail.querySelector('[data-expert-name]').textContent = expert.name;
    const centerRoles = { 'su-jianjiao': '主任', 'lv-yongfeng': '副主任' };
    expertDetail.querySelector('[data-expert-role]').textContent = [centerRoles[expert.id], expert.role].filter(Boolean).join(' · ');
    expertDetail.querySelector('[data-expert-intro]').textContent = expert.intro;
    expertDetail.querySelector('[data-expert-tags]').innerHTML = expert.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join('');
    expertDetail.querySelector('[data-expert-sections]').innerHTML = expert.sections.map(([title, body], index) => `
      <section class="expert-section"><span>${String(index + 1).padStart(2, '0')}</span><div><h2>${escapeHTML(title)}</h2><p>${escapeHTML(body)}</p></div></section>`).join('');
  }
}
