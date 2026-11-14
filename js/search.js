/* ASWEK — page de recherche intelligente */

(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function catLabel(p) {
    const c = (p.cat || []).find(x => x !== 'aswek' && !x.startsWith('aswek-')) || '';
    return c ? c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
  }

  function runSearch() {
    const params = new URLSearchParams(location.search);
    const q = (params.get('s') || '').trim();
    const input = document.getElementById('searchInput');
    if (input) input.value = q;
    const titleEl = document.getElementById('searchTitle');
    const countEl = document.getElementById('searchCount');
    const grid = document.getElementById('searchGrid');
    const catsEl = document.getElementById('searchCategories');
    const hintEl = document.getElementById('searchHint');

    if (!q) {
      if (titleEl) titleEl.innerHTML = 'Résultats de recherche';
      if (countEl) countEl.textContent = 'Entrez un terme pour lancer la recherche';
      if (grid) grid.innerHTML = '';
      if (catsEl) catsEl.innerHTML = '';
      if (hintEl) hintEl.textContent = '';
      return;
    }

    const engine = window.ASWEKSearch;
    if (!engine) {
      if (countEl) countEl.textContent = 'Recherche indisponible.';
      return;
    }

    Promise.all([
      engine.search(q, 24),
      engine.searchCategories(q, 5),
      engine.correct(q)
    ]).then(([results, cats, corr]) => {
      const bestScore = results.length ? results[0].score : 0;

      if (titleEl) titleEl.innerHTML = `Résultats de recherche pour : <strong>${esc(q)}</strong>`;
      if (countEl) countEl.textContent = results.length
        ? `${results.length} résultat${results.length !== 1 ? 's' : ''} trouvé${results.length !== 1 ? 's' : ''}`
        : 'Aucun résultat exact';

      // correction orthographique
      if (hintEl) {
        if (corr.changed && corr.corrected && corr.corrected.toLowerCase() !== q.toLowerCase()) {
          hintEl.innerHTML = `Orthographe corrigée : <a href="search.html?s=${encodeURIComponent(corr.corrected)}">rechercher « ${esc(corr.corrected)} »</a>`;
        } else if (results.length) {
          hintEl.textContent = `${results.length} produit${results.length > 1 ? 's' : ''} classé${results.length > 1 ? 's' : ''} par pertinence.`;
        } else {
          hintEl.textContent = '';
        }
      }

      // catégories correspondantes
      if (catsEl) {
        catsEl.innerHTML = cats.length ? cats.map(c =>
          `<a href="${esc(c.url)}">${esc(c.name)}${c.parent ? ` <span style="opacity:.6">· ${esc(c.parent)}</span>` : ''}</a>`
        ).join('') : '';
      }

      if (grid) {
        if (!results.length) {
          engine.logNoResult(q, { results: 0 });
          const alts = engine.suggest(q, 6);
          alts.then(d => {
            const alt = (d.alternatives || []).slice(0, 4);
            grid.innerHTML = `<div class="col-12 empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
              <h3>Aucun produit trouvé pour « ${esc(q)} »</h3>
              <p>Vérifiez l'orthographe${corr.corrected && corr.changed ? ` ou essayez <a href="search.html?s=${encodeURIComponent(corr.corrected)}">« ${esc(corr.corrected)} »</a>` : ''}.</p>
              ${alt.length ? `<div class="as-search-hint" style="margin-bottom:8px;">Vouliez-vous dire :</div>
                <div class="as-search-cats">${alt.map(p => `<a href="product.html?p=${encodeURIComponent(p.slug)}">${esc(p.name)}</a>`).join('')}</div>` : ''}
              <p class="mt-3"><a href="shop.html">Parcourir toute la boutique</a></p>
            </div>`;
          });
        } else {
          grid.innerHTML = results.map(r => {
            const p = r.product;
            return `<div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">${productCardHTML(p)}</div>`;
          }).join('');
          if (typeof bindWishlistButtons === 'function') bindWishlistButtons();
          if (typeof observeFadeUps === 'function') observeFadeUps();
          if (typeof window.ASWEK_applyShortDescriptions === 'function') window.ASWEK_applyShortDescriptions();
        }
      }
    }).catch(() => {
      if (countEl) countEl.textContent = 'Recherche momentanément indisponible.';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    runSearch();
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('searchBtn');
    const go = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const v = input.value.trim();
      if (!v) { location.href = 'search.html'; return; }      if (window.ASWEKSearch) {
        window.ASWEKSearch.suggest(v, 1).then(d => {
          if (!d.products.length) window.ASWEKSearch.logNoResult(v, { results: 0 });
          location.href = 'search.html?s=' + encodeURIComponent(v);
        }).catch(() => { location.href = 'search.html?s=' + encodeURIComponent(v); });
      } else {
        location.href = 'search.html?s=' + encodeURIComponent(v);
      }
    };
    if (btn) btn.addEventListener('click', go);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  });
})();
