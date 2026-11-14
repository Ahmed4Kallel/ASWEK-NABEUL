/* ASWEK - sélecteur de langue FR / AR / EN (traductions pré-générées) */
(function () {
  const STORE = 'aswek_lang';
  const lang = (localStorage.getItem(STORE) || 'fr').toLowerCase();
  const getJson = (u) => fetch(u, { cache: 'force-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);

  function norm(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function addSwitcher() {
    const bar = document.querySelector('.header-topbar .row');
    if (!bar || bar.querySelector('.as-lang-switch')) return;
    const wrap = document.createElement('div');
    wrap.className = 'as-lang-switch';
    wrap.innerHTML = `<select aria-label="Langue">
      <option value="fr">FR</option>
      <option value="ar">AR</option>
      <option value="en">EN</option>
    </select>`;
    const sel = wrap.querySelector('select');
    sel.value = lang;
    sel.addEventListener('change', () => {
      localStorage.setItem(STORE, sel.value);
      location.reload();
    });
    bar.appendChild(wrap);
  }

  function translate(dict) {
    if (!dict) return;
    const T = (k) => dict[k] || null;

    document.querySelectorAll('input[name="s"]').forEach(inp => {
      const v = T('search_placeholder');
      if (v) inp.placeholder = v;
    });
    const searchPageInput = document.getElementById('searchInput');
    if (searchPageInput && T('search_placeholder')) searchPageInput.placeholder = T('search_placeholder');
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn && T('search_button')) searchBtn.textContent = T('search_button');
    const searchTitle = document.getElementById('searchTitle');
    if (searchTitle && !searchTitle.querySelector('strong') && T('search_title')) searchTitle.textContent = T('search_title');

    const mapTab = { desc: 'product_tabs_description', usage: 'product_tabs_usage', secu: 'product_tabs_safety', avis: 'product_reviews' };
    document.querySelectorAll('.rp-product-tab-btn').forEach(b => {
      const k = mapTab[b.dataset.tab];
      if (k && T(k)) b.textContent = T(k);
    });
    const defTitle = document.querySelector('.ai-definition-title');
    if (defTitle && T('product_definition')) defTitle.textContent = T('product_definition');
    const favBtn = document.getElementById('wishBtn');
    if (favBtn && T('product_add_fav')) {
      const svg = favBtn.querySelector('svg');
      favBtn.textContent = '';
      if (svg) favBtn.appendChild(svg);
      favBtn.appendChild(document.createTextNode(' ' + T('product_add_fav')));
    }

    const h1 = document.querySelector('.page-title-cat');
    if (h1 && /guides? projet/i.test(h1.textContent) && T('guides_title')) h1.textContent = T('guides_title');

    document.querySelectorAll('.menu-link-footer a, .mini-cart a').forEach(a => {
      if (/^favoris$/i.test(a.textContent.trim()) && T('nav_favorites')) a.textContent = T('nav_favorites');
    });
    const wishLabel = document.querySelector('.fast-links a[href="wishlist.html"] .very-small');
    if (wishLabel && T('nav_favorites')) wishLabel.textContent = T('nav_favorites');

    const map = {};
    Object.keys(dict).forEach(k => { const v = dict[k]; if (typeof v === 'string' && v.trim()) map[norm(v)] = v; });

    const skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1 };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (skip[node.parentNode && node.parentNode.nodeName]) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const raw = node.nodeValue;
      const key = norm(raw);
      if (map[key] && map[key] !== raw.trim()) {
        const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
        node.nodeValue = lead + map[key] + trail;
      }
    });

    document.querySelectorAll('input[placeholder]').forEach(inp => {
      const k = norm(inp.placeholder);
      if (map[k]) inp.placeholder = map[k];
    });

    document.title = document.title;
  }

  function boot() {
    addSwitcher();

    if (!document.getElementById('asI18nCss')) {
      const st = document.createElement('style');
      st.id = 'asI18nCss';
      st.textContent = `
        .header-topbar .container{position:relative}
        .as-lang-switch{position:absolute;right:14px;top:50%;transform:translateY(-50%);z-index:5}
        .as-lang-switch select{border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;border-radius:6px;padding:6px 10px;font-size:12px;min-height:32px}
        .as-lang-switch select option{color:#0F2530}
        [dir="rtl"] body{font-family:"Noto Naskh Arabic","Segoe UI",Tahoma,sans-serif}
        [dir="rtl"] .search-prod input{text-align:right}
        @media(max-width:991px){
          .as-lang-switch{right:8px;top:6px;transform:none}
          .header-topbar .linkutiliheader{display:inline-block;padding:0 74px}
          [dir="rtl"] .header-topbar .linkutiliheader{padding:0 74px}
        }
      `;
      document.head.appendChild(st);
    }

    if (lang === 'fr') return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.classList.add('lang-' + lang);

    getJson('data/ai/i18n.json').then(j => {
      if (!j) return;
      translate(j[lang]);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
