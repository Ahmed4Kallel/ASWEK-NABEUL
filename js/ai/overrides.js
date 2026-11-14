/* ASWEK — surcharges administrateur (validées par l'humain)
 *
 * Source de vérité côté site : data/ai/overrides-applied.json
 * (compilé par scripts/apply-overrides.js à partir de data/admin/overrides.json).
 *
 * Règle : le site public ne lit JAMAIS data/admin/overrides.json.
 * Seules les descriptions avec status = "approved" sont publiées.
 *
 * Les autres modules (product.js, product-ai.js) consultent window.ASWEKOverrides
 * pour ne pas écraser les valeurs de surcharge qu'ils applique ici.
 */
(function () {
  'use strict';

  const EMPTY = { seo: {}, synonyms: {}, descriptions: {} };
  const state = { data: EMPTY, loaded: false };

  function currentSlug() {
    try {
      const q = new URLSearchParams(location.search).get('p');
      if (q) return q;
    } catch (e) {}
    try { if (typeof product !== 'undefined' && product && product.slug) return product.slug; } catch (e) {}
    return null;
  }

  function setMeta(name, content, attr) {
    if (!content) return;
    const a = attr || 'name';
    let el = document.querySelector(`meta[${a}="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute(a, name); document.head.appendChild(el); }
    el.setAttribute('content', content);
  }

  function apply() {
    const slug = currentSlug();
    if (!slug) return;
    const ov = (state.data.seo || {})[slug];
    if (!ov) return;

    if (ov.seo_title) document.title = ov.seo_title;
    if (ov.seo_desc) setMeta('description', ov.seo_desc);
    if (ov.keywords && ov.keywords.length) setMeta('keywords', ov.keywords.join(', '));
    setMeta('og:title', document.title, 'property');
    const d = document.querySelector('meta[name="description"]');
    if (d) setMeta('og:description', d.content, 'property');

    if (ov.h1) {
      const h1 = document.querySelector('.product-title-h1') || document.querySelector('h1');
      if (h1) h1.textContent = ov.h1;
    }
    if (ov.alt_main) {
      const main = document.querySelector('.product-main-img img');
      if (main) main.alt = ov.alt_main;
      document.querySelectorAll('#thumbs .thumbnail-image img').forEach((img, i) => {
        img.alt = ov.alt_main + (i > 0 ? ` — vue ${i + 1}` : '');
      });
    }
  }

  const ready = fetch('data/ai/overrides-applied.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .then(j => {
      if (j && typeof j === 'object') {
        state.data = {
          seo: j.seo || {},
          synonyms: j.synonyms || {},
          descriptions: j.descriptions || {}
        };
      }
      return state.data;
    })
    .catch(() => state.data)
    .then(d => {
      state.loaded = true;
      apply();
      window.dispatchEvent(new CustomEvent('aswek:overrides-ready', { detail: d }));
      return d;
    });

  // le H1 et les images sont créés par product.js : on réapplique après leur rendu
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  }
  window.addEventListener('rp:content-ready', apply);

  window.ASWEKOverrides = {
    ready: ready,
    get: (slug) => {
      const d = state.data || EMPTY;
      return {
        seo: (d.seo || {})[slug] || null,
        synonyms: (d.synonyms || {})[slug] || null,
        description: (d.descriptions || {})[slug] || null
      };
    },
    data: () => state.data,
    loaded: () => state.loaded,
    approvedDescription: (slug) => {
      const d = ((state.data.descriptions || {})[slug]) || null;
      return d && d.status === 'approved' ? d : null;
    }
  };
})();
