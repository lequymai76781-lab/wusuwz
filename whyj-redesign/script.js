const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const searchButton = document.querySelector('.search-toggle');
const searchForm = document.querySelector('#global-search');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (header && header.classList.contains('header-overlay')) {
  const updateHeader = () => header.classList.toggle('scrolled', scrollY > 24);
  updateHeader();
  addEventListener('scroll', updateHeader, { passive: true });
}

menuButton?.addEventListener('click', () => {
  const opening = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute('aria-label', opening ? '关闭导航' : '打开导航');
  mobileNav.classList.toggle('open', opening);
  document.body.classList.toggle('menu-open', opening);
});

mobileNav?.addEventListener('click', (event) => {
  if (!event.target.matches('a')) return;
  menuButton.setAttribute('aria-expanded', 'false');
  mobileNav.classList.remove('open');
  document.body.classList.remove('menu-open');
});

searchButton?.addEventListener('click', () => {
  const opening = searchButton.getAttribute('aria-expanded') !== 'true';
  searchButton.setAttribute('aria-expanded', String(opening));
  searchButton.setAttribute('aria-label', opening ? '关闭搜索' : '打开搜索');
  searchForm.hidden = !opening;
  if (opening) searchForm.querySelector('input').focus();
});

searchForm?.addEventListener('submit', (event) => event.preventDefault());

addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (mobileNav?.classList.contains('open')) {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '打开导航');
    mobileNav.classList.remove('open');
    document.body.classList.remove('menu-open');
    menuButton.focus();
  }
  if (searchForm && !searchForm.hidden) {
    searchForm.hidden = true;
    searchButton.setAttribute('aria-expanded', 'false');
    searchButton.setAttribute('aria-label', '打开搜索');
    searchButton.focus();
  }
});

const hero = document.querySelector('[data-hero]');
if (hero) {
  const slides = [...hero.querySelectorAll('[data-slide]')];
  const tabs = [...hero.querySelectorAll('[data-go]')];
  let current = 0;
  let timer;
  const show = (next) => {
    current = (next + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      const active = index === current;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    tabs.forEach((tab, index) => tab.classList.toggle('active', index === current));
  };
  const stop = () => clearInterval(timer);
  const start = () => {
    stop();
    if (!reduceMotion) timer = setInterval(() => show(current + 1), 7000);
  };
  hero.querySelector('.prev').addEventListener('click', () => { show(current - 1); start(); });
  hero.querySelector('.next').addEventListener('click', () => { show(current + 1); start(); });
  tabs.forEach((tab) => tab.addEventListener('click', () => { show(Number(tab.dataset.go)); start(); }));
  hero.addEventListener('mouseenter', stop);
  hero.addEventListener('mouseleave', start);
  hero.addEventListener('focusin', stop);
  hero.addEventListener('focusout', start);
  start();
}

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
    expertDetail.innerHTML = '<section class="content-section"><h1>未找到专家资料</h1><p><a href="people.html#experts">返回专家团队 →</a></p></section>';
  } else {
    document.title = `${expert.name}｜专家简介｜非物质文化遗产研究中心`;
    const image = expertDetail.querySelector('[data-expert-image]');
    image.src = expert.image;
    image.alt = expert.name;
    expertDetail.querySelector('[data-expert-name]').textContent = expert.name;
    expertDetail.querySelector('[data-expert-role]').textContent = expert.role;
    expertDetail.querySelector('[data-expert-intro]').textContent = expert.intro;
    expertDetail.querySelector('[data-expert-tags]').innerHTML = expert.tags.map((tag) => `<span>${tag}</span>`).join('');
    expertDetail.querySelector('[data-expert-sections]').innerHTML = expert.sections.map(([title, body], index) => `
      <section class="expert-section">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <div><h2>${title}</h2><p>${body}</p></div>
      </section>`).join('');
  }
}
