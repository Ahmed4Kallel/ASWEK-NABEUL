/* ResinPro clone - homepage */

function initSlider() {
  const track = document.getElementById('homeSliderTrack');
  const dots = document.getElementById('homeSliderDots');
  if (!track) return;
  track.innerHTML = HERO_SLIDES.map(s => `
    <div class="slide"><a href="${s.link}"><picture>
      <source media="(max-width:767px)" srcset="${s.mobile}">
      <img src="${s.img}" alt="slide">
    </picture></a></div>`).join('');
  dots.innerHTML = HERO_SLIDES.map((_, i) => `<button data-dot="${i}" class="${i === 0 ? 'active' : ''}"></button>`).join('');
  let idx = 0;
  const go = (n) => {
    idx = (n + HERO_SLIDES.length) % HERO_SLIDES.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i === idx));
  };
  document.querySelector('.swiper-prev').addEventListener('click', () => go(idx - 1));
  document.querySelector('.swiper-next').addEventListener('click', () => go(idx + 1));
  dots.querySelectorAll('button').forEach(b => b.addEventListener('click', () => go(parseInt(b.dataset.dot, 10))));
  let auto = setInterval(() => go(idx + 1), 6000);
  const slider = document.getElementById('homeSlider');
  slider.addEventListener('mouseenter', () => clearInterval(auto));
  slider.addEventListener('mouseleave', () => { auto = setInterval(() => go(idx + 1), 6000); });
}

function bsCardHTML(p) {
  const href = p.slug ? `product.html?p=${encodeURIComponent(p.slug)}` : `product.html?p=${p.id}`;
  const badge = p.badge ? `<span class="discount-badge ${p.badgeClass || ''}">${p.badge}</span>` : '';
  return `
  <a class="bs-card" href="${href}" aria-label="${p.name}">
    <div class="bs-card-img">${badge}<img src="${p.img}" alt="${p.name}" loading="lazy" draggable="false"></div>
    <div class="bs-card-name">${p.name}</div>
    <div class="bs-card-price">À partir de ${p.priceFrom} ${p.cur === 'TND' ? 'TND' : (p.cur || 'TND')}</div>
  </a>`;
}

function sectionMarquee(section, index) {
  const products = section.ids.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
  const items = products.map(p => bsCardHTML(p)).join('');
  return `
  <section class="section ${index % 2 === 1 ? 'section-soft' : ''}">
    <div class="container">
      <div class="bs-banner fade-up">
        <h2 class="bs-title">${section.title}</h2>
        <a class="bs-link" href="${section.link}">${section.linkText}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg></a>
      </div>
      <div class="bs-marquee">
        <button class="bs-arrow bs-left" type="button" aria-label="Précédent"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></button>
        <div class="bs-scroller" tabindex="0">
          <div class="bs-track">${items}${items}</div>
        </div>
        <button class="bs-arrow bs-right" type="button" aria-label="Suivant"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button>
      </div>
    </div>
  </section>`;
}

function initSectionMarquee(scroller) {
  if (!scroller || scroller.dataset.bsInit) return;
  scroller.dataset.bsInit = '1';
  const marquee = scroller.closest('.bs-marquee');
  const track = scroller.querySelector('.bs-track');
  const leftBtn = marquee.querySelector('.bs-left');
  const rightBtn = marquee.querySelector('.bs-right');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = 42;

  let raf = 0, lastTs = 0, offscreen = true, hoverPause = false, cooldownUntil = 0;
  let pos = scroller.scrollLeft, lastSet = pos;

  const unit = () => {
    const kids = track.children;
    const n = Math.floor(kids.length / 2);
    if (!n) return 1;
    const start = kids[0].getBoundingClientRect().left;
    const end = kids[n - 1].getBoundingClientRect().right;
    return (end - start) + 18 || 1;
  };
  const cardStep = () => {
    const first = track.children[0];
    return first ? first.getBoundingClientRect().width + 18 : 260;
  };

  function tick(ts) {
    raf = 0;
    if (offscreen || document.hidden) { lastTs = 0; return; }
    if (!lastTs) lastTs = ts;
    const dt = Math.min(100, ts - lastTs); lastTs = ts;
    if (!hoverPause && !reduceMotion && performance.now() >= cooldownUntil) {
      if (Math.abs(scroller.scrollLeft - lastSet) > 1.5) pos = scroller.scrollLeft;
      pos += (SPEED * dt) / 1000;
      const u = unit();
      if (pos >= u) pos -= u;
      else if (pos <= 0) pos += u;
      lastSet = Math.round(pos);
      if (scroller.scrollLeft !== lastSet) scroller.scrollLeft = lastSet;
    } else if (Math.abs(scroller.scrollLeft - lastSet) > 1.5) {
      pos = lastSet = Math.round(scroller.scrollLeft);
    }
    raf = requestAnimationFrame(tick);
  }

  function sync() {
    if (!offscreen && !document.hidden && !raf) raf = requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver(en => { offscreen = !(en[0].isIntersecting && en[0].intersectionRatio > 0.05); sync(); }, { threshold: [0, 0.05, 0.5] });
  io.observe(scroller);
  document.addEventListener('visibilitychange', sync);

  scroller.addEventListener('mouseenter', () => { hoverPause = true; });
  scroller.addEventListener('mouseleave', () => { hoverPause = false; });
  scroller.addEventListener('touchstart', () => { cooldownUntil = performance.now() + 2800; }, { passive: true });
  scroller.addEventListener('wheel', () => { cooldownUntil = performance.now() + 2800; }, { passive: true });

  const nudge = (dir) => {
    scroller.scrollBy({ left: dir * cardStep(), behavior: 'smooth' });
    cooldownUntil = performance.now() + 2600;
  };
  if (leftBtn) leftBtn.addEventListener('click', () => nudge(-1));
  if (rightBtn) rightBtn.addEventListener('click', () => nudge(1));
}

function sectionProducts(section, index) {
  const products = section.ids
    ? section.ids.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean)
    : [];
  const cards = products.map(p => `<div class="owl-item">${productCardHTML(p)}</div>`).join('');
  return `
  <section class="section ${index % 2 === 1 ? 'section-soft' : ''}">
    <div class="container">
      <div class="carousel-head">
        <h2 class="section-title fade-up mb-0">${section.title}</h2>
        <div class="d-flex align-items-center" style="gap:16px;">
          <a class="text-btn" href="${section.link}">${section.linkText}
            <svg viewBox="0 0 24 24"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></a>
          <div class="carousel-nav">
            <button data-scroll-left aria-label="Précédent"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/></svg></button>
            <button data-scroll-right aria-label="Suivant"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg></button>
          </div>
        </div>
      </div>
      <div class="owl-carousel owl-theme">${cards}</div>
    </div>
  </section>`;
}

function sectionCategories(section, index) {
  const cards = section.categories.map(c => `
    <div class="col-6 col-lg-3 mb-4">
      <a class="refcat-card fade-up" href="${c.url}">
        <img src="${c.img}" alt="${c.name}" loading="lazy">
        <span class="refcat-inner">
          <span class="refcat-title"><span class="refcat-name">${c.name}</span></span>
          <span class="refcat-buy">acheter</span>
        </span>
      </a>
    </div>`).join('');
  return `
  <section class="section ${index % 2 === 1 ? 'section-soft' : ''}">
    <div class="container">
      <div class="carousel-head">
        <h2 class="section-title fade-up mb-0">${section.title}</h2>
        <a class="text-btn" href="${section.link}">${section.linkText}
          <svg viewBox="0 0 24 24"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></a>
      </div>
      <div class="row">${cards}</div>
    </div>
  </section>`;
}

function initHomeSections() {
  const wrap = document.getElementById('homeSections');
  if (!wrap) return;
  wrap.innerHTML = HOMEPAGE_SECTIONS.map((s, i) =>
    s.categories ? sectionCategories(s, i) :
    (s.marquee ? sectionMarquee(s, i) : sectionProducts(s, i))).join('');
  document.querySelectorAll('.bs-marquee .bs-scroller').forEach(initSectionMarquee);

  wrap.querySelectorAll('.owl-carousel').forEach(car => {
    const head = car.closest('section').querySelector('.carousel-head');
    const left = head.querySelector('[data-scroll-left]');
    const right = head.querySelector('[data-scroll-right]');
    if (left) left.addEventListener('click', () => car.scrollBy({ left: -car.clientWidth * 0.8, behavior: 'smooth' }));
    if (right) right.addEventListener('click', () => car.scrollBy({ left: car.clientWidth * 0.8, behavior: 'smooth' }));
  });
  bindWishlistButtons();
  observeFadeUps();
}

function initServiceBadges() {
  const wrap = document.getElementById('serviceBadges');
  if (!wrap) return;
  const icons = ['🛒', '🚚', '🎧', '👥', '🎓', '🇮🇹', '📦'];
  wrap.innerHTML = SERVICE_BADGES.map((b, i) => `
    <div class="col-12 col-md-4 col-lg-3 mb-4">
      <div class="service-badge fade-up">
        <div class="ico">${icons[i] || '★'}</div>
        <h4>${b.title}</h4>
        <p>${b.text}</p>
      </div>
    </div>`).join('');
}

function statParts(value) {
  const m = String(value).match(/^([\d.,]+)(.*)$/);
  if (!m) return { count: null, text: value };
  const num = parseFloat(m[1].replace(',', '.'));
  const dec = (m[1].split(/[.,]/)[1] || '').length;
  return { count: num, suffix: m[2] || '', dec };
}

function initStats() {
  const wrap = document.getElementById('statsRow');
  if (!wrap) return;
  wrap.innerHTML = STATS.map(s => {
    const p = statParts(s.value);
    const counter = p.count != null
      ? `<h3 data-count="${p.count}" data-decimals="${p.dec}" data-suffix="${p.suffix}">0${p.suffix}</h3>`
      : `<h3 class="stat-text">${s.value}</h3>`;
    return `
    <div class="col-6 col-lg-3 mb-4">
      <div class="stat-box fade-up">
        ${counter}
        <p>${s.label}</p>
      </div>
    </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initSlider();
  initHomeSections();
  initServiceBadges();
  initStats();
  initCounters();
  observeFadeUps();
});

/* Vidéo d'accueil : lecture auto (muette) quand visible, pause hors écran, boutons lecture/son */
document.addEventListener('DOMContentLoaded', () => {
  const v = document.getElementById('atelierVideo');
  if (!v) return;
  const frame = v.closest('.video-frame'), playBtn = document.getElementById('videoPlay'), soundBtn = document.getElementById('videoSound');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let userPaused = reduce;
  const sync = () => frame.classList.toggle('paused', v.paused);
  v.addEventListener('play', sync); v.addEventListener('pause', sync); sync();
  playBtn.addEventListener('click', () => {
    if (v.paused) { userPaused = false; v.play().catch(() => {}); } else { userPaused = true; v.pause(); }
  });
  soundBtn.addEventListener('click', () => {
    v.muted = !v.muted;
    soundBtn.classList.toggle('on', !v.muted);
    soundBtn.setAttribute('aria-pressed', String(!v.muted));
    soundBtn.setAttribute('aria-label', v.muted ? 'Activer le son' : 'Couper le son');
    if (!v.muted && v.paused) { userPaused = false; v.play().catch(() => {}); }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { if (!userPaused) v.play().catch(() => {}); } else v.pause();
    }), { threshold: 0.4 }).observe(frame);
  }
});
