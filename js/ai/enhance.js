/* ASWEK AI - descriptions courtes sur les cartes produit */
(function () {
  let SHORT = null;
  let loading = false;
  const queue = [];

  function load() {
    if (SHORT) return Promise.resolve(SHORT);
    if (loading) return new Promise(r => queue.push(r));
    loading = true;
    return fetch('data/ai/short-descriptions.json', { cache: 'force-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const raw = (j && (j.items || j)) || {};
        const map = {};
        if (Array.isArray(raw)) {
          raw.forEach(it => {
            if (!it) return;
            const slug = it.slug || it.id;
            const txt = it.accroche || it.short || it.text || it.description;
            if (slug && txt) map[slug] = txt;
          });
        } else {
          Object.keys(raw).forEach(k => {
            const v = raw[k];
            map[k] = typeof v === 'string' ? v : (v && (v.accroche || v.short || v.text)) || '';
          });
        }
        SHORT = map;
        queue.forEach(fn => fn(SHORT)); queue.length = 0;
        return SHORT;
      })
      .catch(() => { SHORT = {}; queue.forEach(fn => fn(SHORT)); queue.length = 0; return SHORT; });
  }

  function slugFromCard(card) {
    const a = card.querySelector('a[href*="product.html?p="]');
    if (!a) return null;
    const m = a.getAttribute('href').match(/[?&]p=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  window.ASWEK_applyShortDescriptions = function () {
    load().then(map => {
      document.querySelectorAll('.product-card').forEach(card => {
        if (card.querySelector('.ai-short')) return;
        const slug = slugFromCard(card);
        if (!slug) return;
        const txt = map[slug];
        if (!txt || typeof txt !== 'string') return;
        const body = card.querySelector('.card-body') || card;
        const d = document.createElement('div');
        d.className = 'ai-short';
        d.textContent = txt.length > 90 ? txt.slice(0, 87).trim() + '…' : txt;
        body.appendChild(d);
      });
    });
  };

  function boot() {
    if (!document.getElementById('aiCardCss')) {
      const st = document.createElement('style');
      st.id = 'aiCardCss';
      st.textContent = '.ai-short{font-size:12px;color:var(--muted);margin-top:4px;line-height:1.4;min-height:2.8em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}';
      document.head.appendChild(st);
    }
    window.ASWEK_applyShortDescriptions();
    const grid = document.querySelector('.grid-list, #productGrid, #searchGrid');
    if (grid && window.MutationObserver) {
      let t;
      new MutationObserver(() => { clearTimeout(t); t = setTimeout(window.ASWEK_applyShortDescriptions, 120); })
        .observe(grid, { childList: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
