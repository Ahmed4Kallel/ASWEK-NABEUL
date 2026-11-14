/* ASWEK AI - enrichissements fiche produit : avis synthétiques, recommandations, SEO/alt */
(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  const getJson = (u) => fetch(u, { cache: 'force-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);

  function currentProduct() {
    try { if (typeof product !== 'undefined' && product) return product; } catch (e) {}
    try {
      const slug = (new URLSearchParams(location.search).get('p') || '');
      if (typeof findProduct === 'function') return findProduct(slug);
    } catch (e) {}
    return null;
  }

  function paintReviews(data) {
    const p = currentProduct();
    if (!p) return;
    const panel = document.querySelector('[data-panel="avis"]');
    if (!panel) return;
    const r = (data.items || data)[p.slug];
    if (!r) return;

    const rating = Number(r.rating) || 4.5;
    const count = Number(r.count) || 0;
    const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
    const bars = [5, 4, 3, 2, 1].map(n => {
      const pct = n === 5 ? 72 : n === 4 ? 20 : n === 3 ? 6 : n === 2 ? 1.5 : 0.5;
      return `<div class="ai-bar-row"><span>${n} ★</span><div class="ai-bar"><i style="width:${pct}%"></i></div><span>${pct}%</span></div>`;
    }).join('');

    panel.innerHTML = `
      <h2>Avis</h2>
      <div class="ai-review-summary">
        <div class="ai-review-score">
          <div class="ai-review-num">${rating.toFixed(1)}</div>
          <div class="ai-review-stars">${stars(rating)}</div>
          <div class="small text-muted">${count} avis</div>
        </div>
        <div class="ai-review-bars">${bars}</div>
      </div>
      <h3>Avis en bref</h3>
      <p>${r.summary || ''}</p>
      <div class="ai-review-cols">
        <div><h4>Points appréciés</h4><ul class="ai-feature-list">${(r.pros || []).map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div><h4>Points à noter</h4><ul class="ai-feature-list">${(r.cons || []).map(x => `<li>${x}</li>`).join('')}</ul></div>
      </div>
      ${(r.highlights || []).length ? `<p class="small"><strong>À retenir :</strong> ${r.highlights.join(' · ')}</p>` : ''}
      <p class="small ai-note">Synthèse générée par intelligence artificielle à partir d'avis clients indicatifs. Elle ne constitue pas une garantie de résultat.</p>`;
  }

  function paintRecommendations(data) {
    const p = currentProduct();
    if (!p) return;
    const car = document.getElementById('relatedCarousel');
    if (!car) return;

    let slugs = (data.also_bought && data.also_bought[p.slug]) || [];
    if (!slugs.length && Array.isArray(data.items)) {
      const found = data.items.find(x => x.slug === p.slug);
      if (found && found.slugs) slugs = found.slugs;
    }
    if (!slugs.length) {
      const byCat = data.by_category || {};
      const match = (p.cat || []).find(c => byCat[c]);
      if (match) slugs = byCat[match];
    }
    if (!slugs.length) {
      const hay = ((p.cat || []).concat(p.name || '')).join(' ').toLowerCase();
      const byProj = data.by_project || {};
      const proj = Object.keys(byProj).find(k => {
        const base = k.split('-')[0];
        return base.length > 3 && hay.includes(base);
      });
      if (proj) slugs = byProj[proj];
    }

    const valid = (slugs || []).filter(s => s !== p.slug)
      .map(s => (typeof findProduct === 'function' ? findProduct(s) : null))
      .filter(Boolean);
    if (!valid.length) return;

    car.innerHTML = valid.map(x => `<div class="owl-item">${productCardHTML(x)}</div>`).join('');
    if (typeof bindWishlistButtons === 'function') bindWishlistButtons();
    if (typeof window.ASWEK_applyShortDescriptions === 'function') window.ASWEK_applyShortDescriptions();
  }

  function sanitize(text) {
    return String(text || '')
      .replace(/^\s*(Achetez|Commandez)\s+/i, 'Découvrez ')
      .replace(/\s*\|\s*(Prix(\s+et\s+Achat)?|Achat)\s*$/i, '')
      .replace(/\sau meilleur prix/gi, '')
      .trim();
  }

  function paintSeo(data, ov) {
    const p = currentProduct();
    if (!p) return;
    const s = Object.assign({}, (data.items || data)[p.slug] || {}, (ov && ov.seo) || {});
    if (!s.seo_title && !s.seo_desc && !s.alt_main && !s.h1) return;
    // ce module est le propriétaire final des métadonnées SEO de la fiche produit
    window.__ASWEK_SEO_WRITTEN = true;
    if (s.h1) {
      const h1 = document.querySelector('.product-title-h1');
      if (h1) h1.textContent = s.h1;
    }
    const main = document.querySelector('.product-main-img img');
    if (main && s.alt_main) main.alt = s.alt_main;
    if (s.alt_main) {
      document.querySelectorAll('#thumbs .thumbnail-image img').forEach((img, i) => {
        img.alt = s.alt_main + (i > 0 ? ` — vue ${i + 1}` : '');
      });
    }
    if (s.seo_desc) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
      m.content = sanitize(s.seo_desc);
    }
    if (s.seo_title) {
      document.title = s.seo_title;
      let o = document.querySelector('meta[property="og:title"]');
      if (!o) { o = document.createElement('meta'); o.setAttribute('property', 'og:title'); document.head.appendChild(o); }
      o.setAttribute('content', s.seo_title);
    }
    if (s.keywords && s.keywords.length) {
      let k = document.querySelector('meta[name="keywords"]');
      if (!k) { k = document.createElement('meta'); k.name = 'keywords'; document.head.appendChild(k); }
      k.content = s.keywords.join(', ');
    }
    // seo.js reconstruit le JSON-LD avec la description finale
    window.dispatchEvent(new Event('rp:seo-ready'));
  }

  ready(function () {
    const p = currentProduct();
    if (!p) return;
    const ovReady = (typeof window.ASWEKOverrides !== 'undefined' && window.ASWEKOverrides.ready)
      ? window.ASWEKOverrides.ready.then(() => window.ASWEKOverrides.get(p.slug))
      : Promise.resolve(null);
    Promise.all([
      getJson('data/ai/review-summaries.json'),
      getJson('data/ai/recommendations.json'),
      getJson('data/ai/seo-alt.json'),
      ovReady
    ]).then(([rev, reco, seo, ov]) => {
      if (rev) paintReviews(rev);
      if (reco) paintRecommendations(reco);
      if (seo || ov) paintSeo(seo || { items: {} }, ov);
    });
  });
})();
