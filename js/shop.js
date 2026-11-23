/* ResinPro clone - shop / category page */

const PER_PAGE = 12;
let shopState = { cat: null, brand: null, orderby: 'menu_order', page: 1, priceMax: null, subs: [], view: 'grid' };

const CAT_META = {
  'les-resines': { title: 'Résines', desc: 'Résines époxy ASWEK, résines pour créations, peintures acryliques et colorants.' },
  'resines-epoxy': { title: 'Résines époxy', desc: 'Résines époxy ASWEK pour coulées et créations.' },
  'pour-bijoux-et-creations': { title: 'Résines pour créations', desc: 'Résines ASWEK pour bijoux et créations artistiques.' },
  'peintures-acryliques': { title: 'Peintures acryliques', desc: 'Peintures acryliques ASWEK.' },
  'colorant-resine': { title: 'Colorant pour résine', desc: 'Colorants ASWEK pour résine époxy.' },
  'moules-silicones': { title: 'Silicones et moules', desc: 'Silicones ASWEK pour fabriquer des moules et moules en silicone pour la coulée de résine.' },
  'moules': { title: 'Moules en silicone', desc: 'Moules en silicone ASWEK pour la coulée de résine époxy et les créations décoratives.' },
  'colorants-et-pigments': { title: 'Colorants et Pigments', desc: 'Poudres métalliques, pigments, quartz, silice et décorations ASWEK.' },
  'poudre': { title: 'Poudres métalliques et nacrées', desc: 'Poudres métalliques et nacrées ASWEK.' },
  'pigments-decorations': { title: 'Pigments et décorations', desc: 'Pigments, quartz, silice, feuille d\'or, glitter ASWEK.' },
  'diluants-et-vernis': { title: 'Diluants et Vernis', desc: 'Vernis DECOTOP et VAR, diluants et produits d\'entretien ASWEK.' },
  'vernis-techniques': { title: 'Vernis et peintures techniques', desc: 'Vernis DECOTOP et VAR ASWEK.' },
  'diluants': { title: 'Diluants', desc: 'Diluants ASWEK.' },
  'entretien-nettoyage': { title: 'Entretien et nettoyage', desc: 'Produits d\'entretien et de nettoyage ASWEK.' },
  'bougies-et-cires': { title: 'Bougies et Cires', desc: 'Cires ASWEK pour bougies artisanales.' },
  'cires': { title: 'Cires', desc: 'Cires de soja et de paraffine ASWEK.' },
  'etancheite': { title: 'Étanchéité', desc: 'Produits d\'étanchéité ASWEK.' },
  'etancheite-toitures': { title: 'Étanchéité et toitures', desc: 'DEEP ETANCHE PRO d\'ASWEK pour terrasses et toitures.' },
  'piscine': { title: 'Piscine', desc: 'Traitement et entretien de piscine ASWEK : chlore, pH, floculant.' },
  'traitement-piscine': { title: 'Traitement de l\'eau', desc: 'Traitement de l\'eau de piscine ASWEK.' }
};

function filterProducts() {
  let list = PRODUCTS.slice();
  if (shopState.brand === 'aswek') {
    list = list.filter(p => (p.cat || []).includes('aswek'));
  }
  if (shopState.cat) {
    list = list.filter(p => p.cat && p.cat.includes(shopState.cat));
  }
  if (shopState.subs.length) {
    list = list.filter(p => p.cat && shopState.subs.some(s => p.cat.includes(s)));
  }
  if (shopState.priceMax != null) {
    list = list.filter(p => p.priceFrom <= shopState.priceMax);
  }
  switch (shopState.orderby) {
    case 'price': list.sort((a, b) => a.priceFrom - b.priceFrom); break;
    case 'price-desc': list.sort((a, b) => b.priceFrom - a.priceFrom); break;
    case 'rating': list.sort((a, b) => b.rating - a.rating); break;
    case 'date': list.sort((a, b) => b.id - a.id); break;
    case 'popularity': list.sort((a, b) => b.rating - a.rating || b.variations.length - a.variations.length); break;
    default: break;
  }
  return list;
}

let sbOpen = {};

function renderSidebarCategories() {
  const wrap = document.getElementById('sidebarFilters');
  if (!wrap) return;

  let html = '<div class="sidebar-cats"><div class="sidebar-title">Catégories de produits</div>';

  CATEGORIES.forEach(cat => {
    if (cat.name === 'Aide et Assistance') return;
    const gslug = (g) => g.url.split('c=')[1];
    const subcats = (cat.groups || []).filter(Boolean);
    const cslug = cat.url.split('c=')[1];
    const subActive = subcats.some(g => shopState.cat === gslug(g));
    const isActive = shopState.cat === cslug || subActive;
    const hasSubs = subcats.length > 0;
    const key = cslug || cat.name;
    const open = hasSubs && (sbOpen[key] === true || (sbOpen[key] === undefined && isActive));

    html += `<div class="sb-cat-block ${open ? 'open' : ''}">`;
    if (hasSubs) {
      const subId = 'sb-sub-' + key;
      html += `<div class="sb-cat-head" role="button" tabindex="0" aria-expanded="${open}" aria-controls="${subId}">` +
        `<a class="sb-cat-link ${isActive ? 'active' : ''}" href="${cat.url}">${cat.name}</a>` +
        `<button class="sb-chevron" type="button" aria-label="Développer ${cat.name}">` +
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>` +
        `</button></div>`;
      html += `<div class="sb-sublist-wrap" id="${subId}"><div class="sb-sublist">`;
      html += `<a class="sb-subitem sb-subviewall ${isActive && shopState.cat === cslug ? 'active' : ''}" href="${cat.url}">Tout voir</a>`;
      subcats.forEach(g => {
        const gactive = shopState.cat === gslug(g) ? 'active' : '';
        html += `<a class="sb-subitem ${gactive}" href="${g.url}">${g.name}</a>`;
      });
      html += `</div></div>`;
    } else {
      html += `<a class="sb-cat-link sb-cat-solo ${isActive ? 'active' : ''}" href="${cat.url}">${cat.name}</a>`;
    }
    html += `</div>`;
  });

  html += '</div>';
  wrap.innerHTML = html;

  wrap.querySelectorAll('.sb-cat-head').forEach(head => {
    const toggle = () => {
      const block = head.closest('.sb-cat-block');
      const key = block.querySelector('a.sb-cat-link').getAttribute('href').split('c=')[1];
      const nowOpen = !block.classList.contains('open');
      block.classList.toggle('open', nowOpen);
      head.setAttribute('aria-expanded', nowOpen);
      sbOpen[key] = nowOpen;
    };
    head.addEventListener('click', e => {
      if (e.target.closest('a.sb-cat-link')) { e.preventDefault(); toggle(); }
    });
    const btn = head.querySelector('.sb-chevron');
    btn.addEventListener('click', e => { e.preventDefault(); toggle(); });
    head.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

function renderFilters(all) {
  renderSidebarCategories();
}

function renderShop() {
  const list = filterProducts();
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  shopState.page = Math.min(shopState.page, pages);
  const pageItems = list.slice((shopState.page - 1) * PER_PAGE, shopState.page * PER_PAGE);

  document.getElementById('resultCount').textContent =
    total ? `Affichage de ${(shopState.page - 1) * PER_PAGE + 1}–${Math.min(shopState.page * PER_PAGE, total)} sur ${total} résultats` : 'Aucun produit';

  const grid = document.getElementById('productsGrid');
  grid.classList.toggle('list-view', shopState.view === 'list');
  if (!pageItems.length) {
    grid.innerHTML = '<div class="col-12 empty-state"><h3>Aucun produit trouvé</h3><p>Essayez d’ajuster vos filtres.</p></div>';
  } else {
    renderProductGrid(grid, pageItems, { xs: 12, sm: 6, md: 4, lg: 3 });
  }

  const pag = document.getElementById('pagination');
  pag.innerHTML = '';
  for (let i = 1; i <= pages; i++) {
    const b = document.createElement('a');
    b.href = '#';
    b.textContent = i;
    if (i === shopState.page) b.className = 'current';
    b.addEventListener('click', e => { e.preventDefault(); shopState.page = i; renderShop(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    pag.appendChild(b);
  }
  renderFilters(filterProducts());
  observeFadeUps();
}

function renderBreadcrumb() {
  const crumb = document.getElementById('breadcrumb');
  const name = shopState.cat ? (CAT_META[shopState.cat]?.title || prettyCat(shopState.cat))
    : (shopState.brand === 'aswek' ? 'ASWEK' : 'Boutique');
  crumb.innerHTML = `<a href="index.html">Accueil</a><span class="sep">/</span>` +
    (shopState.cat ? `<a href="shop.html">Boutique</a><span class="sep">/</span>` : '') +
    `<span class="current">${escHTML(name)}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  shopState.cat = getQuery('c');
  shopState.brand = getQuery('brand');
  const meta = shopState.cat && CAT_META[shopState.cat];
  if (meta) {
    document.getElementById('catTitle').textContent = meta.title;
    document.getElementById('catDescription').textContent = meta.desc;
    document.title = meta.title + ' | ASWEK';
  } else if (shopState.brand === 'aswek') {
    document.getElementById('catTitle').textContent = 'ASWEK';
    const descEl = document.getElementById('catDescription');
    if (descEl) descEl.textContent = 'Catalogue ASWEK – résine, piscine, poudre et diluant. Prix en Dinar tunisien (د.ت).';
    document.title = 'ASWEK';
  } else {
    document.getElementById('catTitle').textContent = 'Boutique';
  }
  const ob = getQuery('orderby');
  if (ob) { shopState.orderby = ob; document.getElementById('orderby').value = ob; }

  document.getElementById('orderby').addEventListener('change', e => { shopState.orderby = e.target.value; shopState.page = 1; renderShop(); });
  document.querySelectorAll('.view-toggle button').forEach(b => {
    b.addEventListener('click', () => {
      shopState.view = b.dataset.view;
      document.querySelectorAll('.view-toggle button').forEach(x => x.classList.toggle('active', x === b));
      renderShop();
    });
  });
  renderBreadcrumb();
  renderShop();
});
