/* ResinPro clone - shared layout & state
   Renders top banner, topbar, header, mega menu, mobile menu, modals, footer
   and manages cart / wishlist in localStorage. */

const Store = {
  keyWish: 'rp_wishlist',
  getWish() { try { return JSON.parse(localStorage.getItem(this.keyWish)) || []; } catch (e) { return []; } },
  setWish(v) { localStorage.setItem(this.keyWish, JSON.stringify(v)); updateWishUI(); document.dispatchEvent(new Event('rp:wish')); },
  toggleWish(id) {
    id = parseInt(id, 10);
    let w = this.getWish();
    if (w.includes(id)) { w = w.filter(x => x !== id); } else { w.push(id); }
    this.setWish(w);
  },
  inWish(id) { return this.getWish().includes(parseInt(id, 10)); }
};

let toastTimer;
function showToast(msg) {
  let el = document.getElementById('rp-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rp-toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:#0b4649;color:#fff;' +
      'padding:12px 22px;border-radius:25px;z-index:2000;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.25);' +
      'opacity:0;transition:opacity .25s ease;pointer-events:none;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
}

function productCardHTML(p) {
  const badge = p.badge ? `<span class="discount-badge ${p.badgeClass || ''}">${p.badge}</span>` : '';
  const wish = Store.inWish(p.id) ? 'active' : '';
  const href = p.slug ? `product.html?p=${encodeURIComponent(p.slug)}` : `product.html?p=${p.id}`;
  const variation = (p.variations || []).length > 1
    ? `<select class="card-variation" data-card-variation="${p.id}" aria-label="Option de ${escHTML(p.name)}">
        ${p.variations.map((v, i) => `<option value="${i}">${escHTML(v.value)}</option>`).join('')}
      </select>` : '';
  const moldClass = (p.cat || []).includes('moules') ? ' mold-card' : '';
  return `
  <div class="product-card fade-up${moldClass}" data-id="${p.id}">
    <div class="card-img-wrap">
      ${badge}
      <button class="wishlist-btn ${wish}" data-wish="${p.id}" title="Favoris">
        <svg viewBox="0 0 21 18" width="18" height="16" fill="currentColor"><path d="M10.5 17.35C7.13 15.41.59 10.7.5 6.01.41.89 6.17-1.43 10.5 2.97 14.83-1.43 20.59.89 20.5 6.01c-.09 4.7-6.63 9.4-10 11.34Z"/></svg>
      </button>
      <a href="${href}"><img src="${p.img}" alt="${escHTML(p.alt || p.name)}" loading="lazy"></a>
      <div class="card-add-bar">
        ${variation}
        <div class="qty-stepper card-qty" data-card-qty="${p.id}" role="group" aria-label="Quantité">
          <button type="button" data-card-qty-step="-1" aria-label="Diminuer la quantité">−</button>
          <span data-qty-val>1</span>
          <button type="button" data-card-qty-step="1" aria-label="Augmenter la quantité">+</button>
        </div>
        <button class="quick-add" data-quick-add="${p.id}" type="button">Ajouter au panier</button>
      </div>
    </div>
    <div class="card-body">
      <a href="${href}" class="card-title d-block">${p.name}</a>
      ${p.priceFrom > 0 ? `<p class="product-price">${p.priceTo > p.priceFrom ? '<span class="from">À partir de </span>' : ''}${p.priceFrom.toFixed(2).replace('.', ',')} DT</p>` : ''}
    </div>
  </div>`;
}

function renderProductGrid(container, products, cols) {
  if (!container) return;
  const c = cols || { xs: 12, sm: 6, md: 4, lg: 3 };
  container.innerHTML = products.map(p => {
    const cls = `col-${c.xs}` + (c.sm ? ` col-sm-${c.sm}` : '') + (c.md ? ` col-md-${c.md}` : '') + (c.lg ? ` col-lg-${c.lg}` : '');
    return `<div class="${cls} mb-4">${productCardHTML(p)}</div>`;
  }).join('');
  bindWishlistButtons();
  observeFadeUps();
}

function bindWishlistButtons() {
  document.querySelectorAll('[data-wish]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const id = parseInt(btn.dataset.wish, 10);
      Store.toggleWish(id);
      const on = Store.inWish(id);
      btn.classList.toggle('active', on);
      btn.classList.remove('pulse');
      void btn.offsetWidth;
      btn.classList.add('pulse');
      showToast(on ? 'Ajouté aux favoris' : 'Retiré des favoris');
    });
  });
}

function updateWishUI() {
  document.querySelectorAll('[data-wish]').forEach(btn => {
    btn.classList.toggle('active', Store.inWish(parseInt(btn.dataset.wish, 10)));
  });
}

/* ------------------------ shared markup ------------------------ */
function headerHTML() {
  const catBlocks = CATEGORIES.map(c => {
    if (c.featured) {
      return `<li class="nav-item featured"><a class="nav-link" href="${c.url}">${c.name}</a></li>`;
    }
    const cols = c.groups.map(g => `
      <div class="col-lg-4">
        <h5 class="menu"><a class="menuchild" href="${g.url}">${g.name}</a></h5>
        <ul>${g.items.map(i => `<li><a class="dropdown-item" href="category.html?c=${slugify(g.name)}">${i}</a></li>`).join('')}</ul>
      </div>`).join('');
    return `<li class="nav-item mega-menu">
      <a class="nav-link" href="${c.url}">${c.name}</a>
      <div class="mega-menu-content"><div class="row">${cols}</div></div>
    </li>`;
  }).join('');

  const mobileCats = CATEGORIES.map((c, idx) => {
    const subs = c.groups.map(g => `
      <div class="group-sub-menu">
        <div class="row py-3" style="border-bottom:1px solid var(--line);">
          <div class="col"><a href="${g.url}" style="color:var(--teal)">${g.name}</a></div>
        </div>
      </div>`).join('');
    return `<div class="block-single-menu">
      <div class="row py-3 menu-cat-main" data-cat-toggle="${idx}" style="cursor:pointer;">
        <div class="col"><a href="${c.url}" onclick="event.stopPropagation()">${c.name}</a></div>
        ${c.groups.length ? '<div class="col-auto"><svg width="18" height="18" viewBox="0 0 24 24" style="fill:var(--green);transform:rotate(90deg)"><polygon points="10,6 16,12 10,18"></polygon></svg></div>' : ''}
      </div>
      <div class="menu-cat-sub" data-cat-panel="${idx}">
        <div class="all-cat-back hoverLink" data-cat-back><div class="row py-3"><div class="col ps-0">Toutes les catégories</div></div></div>
        <div class="row align-items-center subcatMain py-3"><div class="col"><h4>${c.name}</h4></div>
          <div class="col-auto"><a href="${c.url}" class="small fw-bold" style="text-decoration:underline">Tout voir</a></div></div>
        ${subs}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="header-topbar pt-2 pb-3">
    <div class="container bigheader">
      <div class="row align-items-center pt-2 pt-lg-0">
        <div class="col-12 text-center">
          <span class="linkutiliheader justify-content-center">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="1.6" style="margin-right:6px;"><path d="M1 3h13v13H1zM14 8h4l3 3v5h-7z" stroke-linejoin="round"/><circle cx="5.5" cy="18.5" r="1.8"/><circle cx="17.5" cy="18.5" r="1.8"/></svg>
            Livraison gratuite pour les commandes supérieures à 500 DT
          </span>
        </div>
      </div>
    </div>
  </div>

  <header class="sticky">
    <div class="header-bg pb-3">
      <div class="d-block d-lg-none">
        <div class="container">
          <div class="row align-items-center">
            <div class="col-2">
              <button class="mobile-menu-toggler bg-transparent border-0" aria-label="menu">
                <svg fill="white" viewBox="0 0 40 40" width="40" height="40"><rect x="2" y="6" width="36" height="4" rx="2"></rect><rect x="2" y="18" width="36" height="4" rx="2"></rect><rect x="2" y="30" width="36" height="4" rx="2"></rect></svg>
              </button>
            </div>
            <div class="col text-center"><a href="index.html" class="logo-col d-inline-block"><img src="images/ASWEQQ.png" alt="ASWEK" class="rp-logo-img" style="height:38px;margin:0 auto;"></a></div>
            <div class="col-3 fast-links">
              <div class="d-flex align-items-end justify-content-end">
                <a class="text-white text-center" href="wishlist.html">
                  <div><svg viewBox="0 0 21 18" width="22" height="20" fill="white"><path d="M10.5 17.35C7.13 15.41.59 10.7.5 6.01.41.89 6.17-1.43 10.5 2.97 14.83-1.43 20.59.89 20.5 6.01c-.09 4.7-6.63 9.4-10 11.34Z"/></svg><span class="d-block very-small mt-1">Favoris</span></div>
                </a>
              </div>
            </div>
            <div class="col-12 mt-3">
              <div class="search-prod">
                <form action="search.html" method="get">
                  <input type="text" name="s" placeholder="Rechercher un produit">
                  <button type="submit"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="6"/><path d="M13 13l5 5"/></svg></button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="d-none d-lg-block">
        <div class="container bigheader">
          <div class="row align-items-center">
            <div class="col-auto logo-col"><a href="index.html"><img src="images/ASWEQQ.png" alt="ASWEK" class="rp-logo-img" style="height:54px;"></a></div>
            <div class="col ps-5">
              <form action="search.html" method="get">
                <div class="search-prod">
                  <input type="text" name="s" placeholder="Rechercher un produit">
                  <button type="submit" title="Rechercher"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="6"/><path d="M13 13l5 5"/></svg></button>
                </div>
              </form>
            </div>
            <div class="col-auto fast-links">
              <div class="d-flex align-items-end">
                <a class="text-white text-center ms-4" href="https://www.facebook.com/profile.php?id=100063645544794" target="_blank" rel="noopener" title="Facebook">
                  <div><svg viewBox="0 0 24 24" width="23" height="23" fill="white"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z"/></svg><span class="d-block very-small mt-1">Facebook</span></div>
                </a>
                <a class="text-white text-center ms-4" href="https://www.google.com/maps/place/Reva/@36.4585903,10.7452986,393m/data=!3m1!1e3!4m6!3m5!1s0x1302990abb6c485b:0x753c20aca4f79418!8m2!3d36.4584901!4d10.7455893!16s%2Fg%2F11fnwcgzvl?entry=ttu&g_ep=EgoyMDI2MTAxOC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener" title="Google Maps">
                  <div><svg viewBox="0 0 24 24" width="23" height="23"><path fill="#34A853" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z"/><circle cx="12" cy="9" r="2.6" fill="#fff"/><path fill="#4285F4" d="M12 2c3.87 0 7 3.13 7 7 0 1.3-.43 2.87-1.15 4.57L12 9l-5.85 4.57C5.43 11.87 5 10.3 5 9c0-3.87 3.13-7 7-7Z" fill-opacity=".55"/></svg><span class="d-block very-small mt-1">Maps</span></div>
                </a>
                <a class="text-white text-center ms-4" href="https://wa.me/21629170566" target="_blank" rel="noopener" title="WhatsApp">
                  <div><svg viewBox="0 0 32 32" width="23" height="23"><path fill="#25D366" d="M16 3C8.8 3 3 8.8 3 16c0 2.3.6 4.5 1.7 6.4L3 29l6.8-1.8c1.9 1 4 1.6 6.2 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3Z"/><path fill="#fff" d="M16 6.2c-5.4 0-9.8 4.4-9.8 9.8 0 1.9.5 3.6 1.5 5.1l-1 3.6 3.7-1c1.4.8 3.1 1.2 4.8 1.2h.6c5.4 0 9.8-4.4 9.8-9.8S21.4 6.2 16 6.2Zm5.8 13.9c-.2.7-1.4 1.3-1.9 1.4-.5.1-1.1.1-1.8-.2-.4-.1-.9-.3-1.5-.6-2.7-1.2-4.5-4-4.6-4.1-.1-.2-1.1-1.4-1.1-2.7s.7-2 .9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4-.1.6.5l.9 2c.1.2.1.3 0 .5l-.3.5-.5.5c-.2.2-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1.9 2 1.2 2.3 1.4.3.2.5.1.6-.1l.9-1.1c.2-.3.3-.2.6-.1l1.9.9c.3.2.5.3.6.4.1.2.1.7-.1 1.3Z"/></svg><span class="d-block very-small mt-1">WhatsApp</span></div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="submenu d-none d-lg-block">
      <div class="container vocimenu">
        <div class="row"><div class="col-12">
          <ul class="menu-list d-flex justify-content-between w-100 mb-0 align-items-center py-1">
            <div class="d-flex">${catBlocks}</div>
          </ul>
        </div></div>
      </div>
    </div>
  </header>

  <div class="mobile-menu" id="mobileMenu">
    <div class="mobile-menu-overlay"></div>
    <div class="mobile-menu-content">
      <div class="row align-items-center">
        <div class="col"><h6 class="fw-bold mb-0">Catégories</h6></div>
        <div class="col-auto text-end px-0"><button class="close-menu">&times;</button></div>
      </div>
      <div class="menu-list">${mobileCats}</div>
    </div>
  </div>`;
}

function modalsHTML() {
  return ``;
}

function footerHTML() {
  return `
  <footer>
    <div class="container py-4">
      <div class="row footer-trust text-center">
        <div class="col-3 col-lg-3">
          <img src="images/trust.svg" alt="" style="margin:0 auto;">
          <h6>Trustpilot</h6>
          <div class="small">★★★★★</div>
        </div>
        <div class="col-3 col-lg-3"><img src="images/shipping.svg" alt="" style="margin:0 auto;"><h6>Livraison rapide</h6>
          <div class="small d-none d-lg-block">Service de livraison rapide avec coursier express en 24h</div></div>
        <div class="col-3 col-lg-3"><img src="images/pagamenti_sicuri.svg" alt="" style="margin:0 auto;"><h6>Commande via WhatsApp</h6>
          <div class="small d-none d-lg-block">Commandez en toute confiance et recevez une confirmation sur WhatsApp.</div></div>
        <div class="col-3 col-lg-3"><img src="images/reso.svg" alt="" style="margin:0 auto;"><h6>Fabriqué en sécurité</h6>
          <div class="small d-none d-lg-block">Procédures simples et pratiques pour le retour des marchandises.</div></div>
      </div>
    </div>
    <div class="overflow-hidden mb-3"><hr></div>
    <div class="container py-4">
      <div class="row">
        ${FOOTER_LINKS.map(col => `
          <div class="col-12 col-md-4">
            <h5 class="footer">${col.title}</h5>
            <ul class="menu-link-footer">${col.items.map(i => {
              const href = i === 'Favoris' ? 'wishlist.html'
                : i === 'Guides projet' ? 'guides.html'
                : '#';
              return `<li><a href="${href}">${i}</a></li>`;
            }).join('')}</ul>
          </div>`).join('')}
      </div>
      <div class="d-flex flex-wrap align-items-center justify-content-between mt-4" style="gap:16px;">
        <div class="small">© ${new Date().getFullYear()} ASWEK</div>
      </div>
    </div>
    <div class="linking-footer-statics">
      <div class="container">
        <a href="#">Peinture antidérapante transparente pour carreaux extérieurs</a>
        <a href="#">Résine époxy pour tables et bois</a>
        <a href="#">Silicone liquide pour moules</a>
        <a href="#">Pigments métalliques pour résine</a>
        <a href="#">Traitement et entretien de piscine</a>
      </div>
    </div>
  </footer>

  <div class="cmplz-cookiebanner" id="cookieBanner">
    <div class="container">
      <strong>Ce site utilise des cookies</strong>
      <p class="mb-0">Nous utilisons des cookies pour améliorer votre expérience. En naviguant, vous acceptez notre politique de confidentialité.</p>
      <div class="cmplz-buttons">
        <button class="btn-primary" data-cookie-accept>Tout accepter</button>
        <button class="btn-primary-outline" data-cookie-accept>Refuser</button>
        <button class="btn-primary-outline" data-cookie-accept>Préférences</button>
      </div>
    </div>
  </div>

  <a class="wa-float" href="https://wa.me/21629170566" target="_blank" rel="noopener" aria-label="WhatsApp" title="Contactez-nous sur WhatsApp">
    <svg viewBox="0 0 32 32"><path d="M16 3C8.8 3 3 8.8 3 16c0 2.3.6 4.5 1.7 6.4L3 29l6.8-1.8c1.9 1 4 1.6 6.2 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3Zm7.6 18.3c-.3.9-1.8 1.7-2.5 1.8-.6.1-1.4.1-2.3-.2-.5-.2-1.2-.4-2-.8-3.6-1.5-5.9-5.1-6.1-5.4-.2-.2-1.4-1.9-1.4-3.6s.9-2.6 1.2-2.9c.3-.3.7-.4.9-.4h.6c.2 0 .5-.1.8.6l1.1 2.6c.1.2.1.4 0 .6l-.4.6-.6.7c-.2.2-.4.4-.2.8.2.4.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.4.2.6.1.8-.1l1.2-1.4c.2-.3.4-.2.7-.1l2.4 1.1c.4.2.6.3.7.5.1.2.1.9-.2 1.7Z"/></svg>
  </a>`;
}

function slugify(s) {
  return s.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getQuery(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name) || params.get(name.toUpperCase());
}

function escHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function prettyCat(c) {
  return c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function observeFadeUps() {
  const els = document.querySelectorAll('.fade-up:not(.visible)');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('visible')); return; }
  els.forEach(el => {
    const container = el.closest('.owl-carousel, .grid-list, .cat-grid, .row') || el.parentElement;
    const group = container ? [...container.querySelectorAll('.fade-up')] : [el];
    let idx = group.indexOf(el);
    if (idx < 0) idx = 0;
    const stagger = Math.min(idx, 10) * 70;
    if (stagger) el.style.setProperty('--stagger', stagger + 'ms');
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); } });
  }, { threshold: 0.08 });
  els.forEach(e => io.observe(e));
}

/* Animated counters for stat boxes (data-count="4.8" data-suffix="+") */
function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const run = (el) => {
    const to = parseFloat(el.dataset.count);
    const dec = (el.dataset.decimals | 0);
    const suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = to.toFixed(dec) + suffix; return; }
    const dur = 1200, start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * eased).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
  }, { threshold: 0.4 });
  els.forEach(e => io.observe(e));
}

function initLayout(activeCat) {
  const top = document.getElementById('rp-header');
  if (top) top.innerHTML = headerHTML();
  const modals = document.getElementById('rp-modals');
  if (modals) modals.innerHTML = modalsHTML();
  const foot = document.getElementById('rp-footer');
  if (foot) foot.innerHTML = footerHTML();

  const mm = document.getElementById('mobileMenu');
  document.querySelectorAll('.mobile-menu-toggler').forEach(b =>
    b.addEventListener('click', () => { mm.classList.add('open'); document.body.classList.add('body-no-scroll'); }));
  const closeMobile = () => { mm.classList.remove('open'); document.body.classList.remove('body-no-scroll'); };
  mm.querySelector('.close-menu').addEventListener('click', closeMobile);
  mm.querySelector('.mobile-menu-overlay').addEventListener('click', closeMobile);

  document.querySelectorAll('[data-cat-toggle]').forEach(row => {
    row.addEventListener('click', () => {
      const idx = row.dataset.catToggle;
      const panel = mm.querySelector(`[data-cat-panel="${idx}"]`);
      if (!panel) return;
      mm.querySelectorAll('[data-cat-panel]').forEach(p => { if (p !== panel) p.classList.remove('active'); });
      panel.classList.add('active');
    });
  });
  mm.querySelectorAll('[data-cat-back]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); b.closest('[data-cat-panel]').classList.remove('active'); }));

  const banner = document.getElementById('cookieBanner');
  if (banner && !localStorage.getItem('rp_cookie_ok')) {
    setTimeout(() => banner.classList.add('show'), 900);
  }
  document.querySelectorAll('[data-cookie-accept]').forEach(b =>
    b.addEventListener('click', () => { localStorage.setItem('rp_cookie_ok', '1'); banner.classList.remove('show'); }));

  updateWishUI();
  observeFadeUps();
}

document.addEventListener('DOMContentLoaded', () => initLayout());
