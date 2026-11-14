/* ASWEK — suggestions de recherche instantanées (header desktop + mobile) */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function catLabel(p) {
    try {
      const c = (p.cat || []).find(x => x !== 'aswek' && !x.startsWith('aswek-')) || '';
      return c ? c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
    } catch (e) { return ''; }
  }

  function initForm(form) {
    const input = form.querySelector('input[name="s"]');
    if (!input) return;
    const box = form.querySelector('.search-prod');
    const host = box || form;
    if (host.dataset.asInit) return;
    host.dataset.asInit = '1';
    host.classList.add('as-suggest-host');

    const panel = document.createElement('div');
    panel.className = 'as-suggest-panel';
    panel.setAttribute('role', 'listbox');
    panel.hidden = true;
    host.appendChild(panel);

    let items = [];       // {el, href}
    let active = -1;
    let timer = null;
    let lastQ = '';
    let openToken = 0;

    function close() {
      panel.hidden = true;
      active = -1;
      items = [];
      host.classList.remove('as-open');
      input.setAttribute('aria-expanded', 'false');
    }
    function open() {
      panel.hidden = false;
      host.classList.add('as-open');
      input.setAttribute('aria-expanded', 'true');
    }
    function setActive(i) {
      items.forEach((it, k) => it.el.classList.toggle('active', k === i));
      active = i;
      if (i >= 0 && items[i]) items[i].el.scrollIntoView({ block: 'nearest' });
    }

    function go(href) { close(); location.href = href; }

    function render(data, q) {
      panel.innerHTML = '';
      items = [];
      const hasProducts = data.products.length > 0;
      const corrected = data.corrected && data.corrected.changed ? data.corrected.corrected : '';

      let html = '';

      if (corrected) {
        html += `<a class="as-sg as-sg-correct" href="search.html?s=${encodeURIComponent(corrected)}" data-href="search.html?s=${encodeURIComponent(corrected)}">
          <span class="as-sg-ico">✎</span>
          <span class="as-sg-txt">Rechercher plutôt <strong>« ${esc(corrected)} »</strong></span></a>`;
      }

      if (hasProducts) {
        html += `<div class="as-sg-head">Produits</div>`;
        data.products.slice(0, 6).forEach(r => {
          const p = r.product;
          html += `<a class="as-sg" href="product.html?p=${encodeURIComponent(p.slug)}" data-href="product.html?p=${encodeURIComponent(p.slug)}">
            <img src="${esc(p.img)}" alt="" loading="lazy">
            <span class="as-sg-txt"><span class="as-sg-name">${esc(p.name)}</span><span class="as-sg-cat">${esc(catLabel(p))}</span></span>
            <span class="as-sg-go">↵</span>
          </a>`;
        });
      }

      if (data.categories && data.categories.length) {
        html += `<div class="as-sg-head">Catégories</div>`;
        data.categories.forEach(c => {
          html += `<a class="as-sg as-sg-cat-item" href="${esc(c.url)}" data-href="${esc(c.url)}">
            <span class="as-sg-ico">▤</span>
            <span class="as-sg-txt"><span class="as-sg-name">${esc(c.name)}</span>${c.parent ? `<span class="as-sg-cat">${esc(c.parent)}</span>` : ''}</span>
          </a>`;
        });
      }

      if (!hasProducts && !data.categories.length) {
        html += `<div class="as-sg-empty"><strong>Aucun résultat pour « ${esc(q)} »</strong>
          <span>Vérifiez l'orthographe ou essayez un autre terme.</span></div>`;
        if (data.alternatives && data.alternatives.length) {
          html += `<div class="as-sg-head">Vouliez-vous dire…</div>`;
          data.alternatives.forEach(p => {
            html += `<a class="as-sg" href="product.html?p=${encodeURIComponent(p.slug)}" data-href="product.html?p=${encodeURIComponent(p.slug)}">
              <img src="${esc(p.img)}" alt="" loading="lazy">
              <span class="as-sg-txt"><span class="as-sg-name">${esc(p.name)}</span></span></a>`;
          });
        }
      }

      const allUrl = 'search.html?s=' + encodeURIComponent(q);
      html += `<a class="as-sg-foot" href="${esc(allUrl)}" data-href="${esc(allUrl)}">Voir tous les résultats pour « ${esc(q)} » →</a>`;

      panel.innerHTML = html;
      open();
      items = [...panel.querySelectorAll('[data-href]')].map(el => ({ el: el, href: el.dataset.href }));
      items.forEach(it => {
        it.el.addEventListener('mouseenter', () => setActive(items.indexOf(it)));
        it.el.addEventListener('click', e => { e.preventDefault(); go(it.href); });
      });
    }

    function update() {
      const q = input.value.trim();
      if (q.length < 2) { close(); return; }
      if (q === lastQ && !panel.hidden) return;
      lastQ = q;
      const token = ++openToken;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (typeof window.ASWEKSearch === 'undefined') return;
        window.ASWEKSearch.suggest(q, 7).then(data => {
          if (token !== openToken) return;
          if (input.value.trim() !== q) return;
          render(data, q);
        });
      }, 110);
    }

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');

    input.addEventListener('input', update);
    input.addEventListener('focus', () => { if (input.value.trim().length >= 2) { lastQ = ''; update(); } });
    input.addEventListener('keydown', e => {
      if (panel.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(items.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)); }
      else if (e.key === 'Escape') { close(); input.blur(); }
      else if (e.key === 'Enter' && active >= 0 && items[active]) { e.preventDefault(); go(items[active].href); }
    });

    document.addEventListener('click', e => { if (!host.contains(e.target)) close(); });

    form.addEventListener('submit', e => {
      const q = input.value.trim();
      if (!q) return;
      if (active >= 0 && items[active]) { e.preventDefault(); go(items[active].href); return; }
      e.preventDefault();
      const target = 'search.html?s=' + encodeURIComponent(q);
      if (typeof window.ASWEKSearch === 'undefined') { location.href = target; return; }
      window.ASWEKSearch.suggest(q, 1).then(d => {
        if (!d.products.length) window.ASWEKSearch.logNoResult(q, { results: 0 });
        location.href = target;
      }).catch(() => { location.href = target; });
    });
  }

  function init() {
    document.querySelectorAll('form[action="search.html"]').forEach(form => {
      // le formulaire de la page /search.html est géré par js/search.js
      if (form.querySelector('#searchInput')) return;
      initForm(form);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
