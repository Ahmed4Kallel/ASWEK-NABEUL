/* ASWEK — administration locale (hors ligne) */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = { products: [], current: null, audit: null, log: [] };

  async function api(route, opts) {
    const res = await fetch('/admin/api/' + route, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.error) || ('Erreur ' + res.status));
    return data;
  }

  function out(sel, text) { const el = $(sel); if (el) el.textContent = text || ''; }

  /* ------------------------------------------------------------ login */
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    out('#loginErr', '');
    try {
      await api('login', { method: 'POST', body: JSON.stringify({ password: $('#pwd').value }) });
      $('#login').classList.add('hidden');
      $('#app').classList.remove('hidden');
      await boot();
    } catch (err) {
      out('#loginErr', err.message);
    }
  });

  $('#logout').addEventListener('click', async () => {
    try { await api('logout', { method: 'POST' }); } catch (e) {}
    location.reload();
  });

  /* ------------------------------------------------------------ tabs */
  $$('.tab').forEach(b => b.addEventListener('click', () => {
    $$('.tab').forEach(x => x.classList.remove('active'));
    $$('.tabpane').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    $('#tab-' + b.dataset.tab).classList.add('active');
  }));

  /* ------------------------------------------------------------ boot */
  async function boot() {
    try {
      const d = await api('dashboard');
      state.audit = d.audit;
      state.log = d.log || [];
      renderKpis(d);
      renderAudit(d.audit);
      renderData(d);
      renderLog();
    } catch (e) { out('#actionOut', e.message); }
    await loadProducts();
  }

  function renderKpis(d) {
    const c = d.counts || {};
    const items = [
      ['Produits', c.products],
      ['Catégories (URL)', c.categories],
      ['SEO incomplet', c.seoMissing],
      ['Description IA manquante', c.contentMissing],
      ['Surcharges SEO', c.overrideSeo],
      ['Surcharges synonymes', c.overrideSyn],
      ['Descriptions validées', c.overrideDesc]
    ];
    $('#kpis').innerHTML = items.map(([l, n]) => '<div class="kpi"><div class="n">' + (n == null ? '—' : n) + '</div><div class="l">' + esc(l) + '</div></div>').join('');
  }

  function renderAudit(a) {
    if (!a) { out('#auditBox', 'Audit indisponible.'); return; }
    const t = a.totals || {};
    let s = 'Produits          : ' + t.products + '\n';
    s += 'Catégories        : ' + t.categories + '\n';
    s += 'URLs sitemap     : ' + t.sitemap_urls + '\n';
    s += 'Doublons         : ' + t.duplicates + '\n';
    s += 'Produits à revoir: ' + t.products_with_issues + '\n';
    s += 'Catégories à revoir: ' + t.categories_with_issues + '\n';
    const prod = (a.issues && a.issues.products) || [];
    if (prod.length) {
      s += '\nDétail produits :\n';
      prod.slice(0, 25).forEach(p => { s += ' • ' + p.name + ' : ' + p.issues.join(' ; ') + '\n'; });
      if (prod.length > 25) s += ' … +' + (prod.length - 25) + ' autre(s)\n';
    }
    const site = (a.issues && a.issues.site) || [];
    if (site.length) { s += '\nProblèmes site :\n'; site.forEach(i => { s += ' • ' + i + '\n'; }); }
    out('#auditBox', s);
  }

  function renderData(d) {
    let s = 'Clé IA serveur    : ' + (d.aiAvailable ? 'disponible (suggestions actives)' : 'absente (suggestions désactivées)') + '\n';
    s += 'Recherches sans résultat : ' + ((d.log || []).length) + '\n';
    s += '\nLes fichiers lus par le site public sont :\n';
    s += '  data/ai/seo-alt.json\n  data/ai/category-seo.json\n  data/product-content.json\n  data/ai/search-i18n.json\n  data/ai/overrides-applied.json  ← surcharges validées\n';
    s += '\ndata/admin/overrides.json n’est jamais lu par le site public.';
    out('#dataBox', s);
  }

  function renderLog() {
    let s = '';
    if (!state.log.length) {
      s = 'Aucune recherche sans résultat enregistrée pour l’instant.\n\nLe journal est alimenté par le site public (localStorage) et,\nsi le serveur local est utilisé, par data/search-log.jsonl.';
    } else {
      s = 'requête'.padEnd(28) + 'occurrences   date\n';
      s += '-'.repeat(60) + '\n';
      state.log.slice(0, 100).forEach(l => {
        s += String(l.q).slice(0, 27).padEnd(28) + String(l.count).padEnd(13) + new Date(l.last).toLocaleString('fr-FR') + '\n';
      });
    }
    out('#logBox', s);
  }

  /* ------------------------------------------------------------ produits */
  async function loadProducts() {
    try {
      const list = await api('products');
      state.products = list.products || [];
      renderProducts();
    } catch (e) { out('#actionOut', e.message); }
  }

  function flags(p) {
    const seo = p.seo || {};
    const syn = p.synonyms || {};
    const f = [];
    if (!seo.seo_title || !seo.seo_desc || !seo.h1 || !seo.alt_main) f.push('SEO');
    if (!p.content || !p.content.definition) f.push('DESC');
    if ((syn.fr || []).length < 3) f.push('SYN-FR');
    if ((syn.ar || []).length < 3) f.push('SYN-AR');
    if ((syn.en || []).length < 3) f.push('SYN-EN');
    if (p.override && (p.override.seo || p.override.synonyms || p.override.description)) f.push('OVR');
    return f;
  }

  function renderProducts() {
    const q = ($('#q').value || '').toLowerCase();
    const filter = $('#filter').value;
    const list = state.products.filter(p => {
      if (q && (p.product.name + ' ' + p.product.slug).toLowerCase().indexOf(q) === -1) return false;
      const f = flags(p);
      if (filter === 'all') return true;
      if (filter === 'missing-seo') return f.includes('SEO');
      if (filter === 'missing-syn') return f.includes('SYN-FR') || f.includes('SYN-AR') || f.includes('SYN-EN');
      if (filter === 'missing-content') return f.includes('DESC');
      if (filter === 'overridden') return f.includes('OVR');
      if (filter === 'approved') return !!(p.override && p.override.description && p.override.description.status === 'approved');
      return true;
    });
    $('#count').textContent = list.length + ' produit(s)';
    $('#prodList').innerHTML = list.map(p => {
      const f = flags(p);
      const badges = f.length
        ? f.map(x => '<span class="badge ' + (x === 'SEO' || x === 'DESC' ? 'bad' : x === 'OVR' ? 'ok' : 'warn') + '">' + esc(x) + '</span>').join('')
        : '<span class="badge ok">OK</span>';
      return '<div class="prod" data-slug="' + esc(p.product.slug) + '">' +
        '<img src="/images/' + esc(String(p.product.img).replace(/^images\//, '')) + '" alt="">' +
        '<div class="nm"><b>' + esc(p.product.name) + '</b><span>' + esc(p.product.slug) + '</span></div>' +
        '<div>' + badges + '</div></div>';
    }).join('');
    $$('#prodList .prod').forEach(el => el.addEventListener('click', () => openEditor(el.dataset.slug)));
  }

  $('#q').addEventListener('input', renderProducts);
  $('#filter').addEventListener('change', renderProducts);

  async function openEditor(slug) {
    try {
      const d = await api('product?slug=' + encodeURIComponent(slug));
      state.current = d;
      const ov = d.override || {};
      const seoOv = ov.seo || {};
      const base = d.seo || {};
      $('#edTitle').textContent = d.product.name;
      $('#fTitle').value = seoOv.seo_title != null ? seoOv.seo_title : (base.seo_title || '');
      $('#fDesc').value = seoOv.seo_desc != null ? seoOv.seo_desc : (base.seo_desc || '');
      $('#fH1').value = seoOv.h1 != null ? seoOv.h1 : (base.h1 || '');
      $('#fAlt').value = seoOv.alt_main != null ? seoOv.alt_main : (base.alt_main || '');
      $('#fKeywords').value = (seoOv.keywords || base.keywords || []).join(', ');
      const synOv = ov.synonyms || {};
      $('#fFr').value = (synOv.fr || d.synonyms.fr || []).join('\n');
      $('#fAr').value = (synOv.ar || d.synonyms.ar || []).join('\n');
      $('#fEn').value = (synOv.en || d.synonyms.en || []).join('\n');
      const descOv = ov.description || {};
      $('#fDefinition').value = descOv.definition != null ? descOv.definition : (d.content ? d.content.definition : '');
      $('#fStatus').value = descOv.status || 'draft';
      $('#fNote').value = descOv.note || '';
      out('#edOut', '');
      $('#previewBox').innerHTML = '';
      $('#editor').classList.remove('hidden');
      $('#editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { out('#edOut', e.message); }
  }

  $('#closeEditor').addEventListener('click', () => $('#editor').classList.add('hidden'));

  function linesToArray(id) {
    return $('#' + id).value.split('\n').map(s => s.trim()).filter(Boolean);
  }

  function countChars(id, label) {
    const n = $('#' + id).value.length;
    const el = $('#' + label);
    if (el) el.textContent = n + ' car.';
  }
  ['fTitle', 'fDesc', 'fH1', 'fAlt'].forEach((id, i) => {
    const labels = ['cTitle', 'cDesc', null, null];
    $('#' + id).addEventListener('input', () => countChars(id, labels[i]));
  });

  async function saveOverride(section, slug, value) {
    return api('save-overrides', { method: 'POST', body: JSON.stringify({ section: section, slug: slug, value: value }) });
  }

  $('#btnSave').addEventListener('click', async () => {
    if (!state.current) return;
    const slug = state.current.product.slug;
    const outSel = '#edOut';
    try {
      const seoVal = {
        seo_title: $('#fTitle').value.trim(),
        seo_desc: $('#fDesc').value.trim(),
        h1: $('#fH1').value.trim(),
        alt_main: $('#fAlt').value.trim(),
        keywords: $('#fKeywords').value.split(',').map(s => s.trim()).filter(Boolean)
      };
      if (!seoVal.seo_title && !seoVal.seo_desc && !seoVal.h1 && !seoVal.alt_main && !seoVal.keywords.length) {
        await saveOverride('seo', slug, null);
      } else {
        await saveOverride('seo', slug, seoVal);
      }
      const synVal = { fr: linesToArray('fFr'), ar: linesToArray('fAr'), en: linesToArray('fEn') };
      if (!synVal.fr.length && !synVal.ar.length && !synVal.en.length) {
        await saveOverride('synonyms', slug, null);
      } else {
        await saveOverride('synonyms', slug, synVal);
      }
      const defVal = $('#fDefinition').value.trim();
      if (!defVal) {
        await saveOverride('descriptions', slug, null);
      } else {
        await saveOverride('descriptions', slug, {
          status: $('#fStatus').value,
          definition: defVal,
          advantages: (state.current.content && state.current.content.advantages) || [],
          note: $('#fNote').value.trim()
        });
      }
      out(outSel, 'Surcharge enregistrée pour ' + slug + '.\nCompilez les surcharges pour la publier.');
      await loadProducts();
      await refreshAudit();
    } catch (e) { out(outSel, e.message); }
  });

  $('#btnReset').addEventListener('click', async () => {
    if (!state.current) return;
    const slug = state.current.product.slug;
    try {
      await saveOverride('seo', slug, null);
      await saveOverride('synonyms', slug, null);
      await saveOverride('descriptions', slug, null);
      out('#edOut', 'Surcharges supprimées pour ' + slug + '.');
      await openEditor(slug);
      await loadProducts();
    } catch (e) { out('#edOut', e.message); }
  });

  $('#btnSuggest').addEventListener('click', async () => {
    if (!state.current) return;
    out('#edOut', 'Génération des suggestions…');
    try {
      const r = await api('suggest', { method: 'POST', body: JSON.stringify({ slug: state.current.product.slug }) });
      if (!r.ok) { out('#edOut', r.error || 'Suggestion indisponible.'); return; }
      const s = r.suggestions || {};
      if (s.seo_title) $('#fTitle').value = s.seo_title;
      if (s.seo_desc) $('#fDesc').value = s.seo_desc;
      if (s.h1) $('#fH1').value = s.h1;
      if (s.alt_main) $('#fAlt').value = s.alt_main;
      if (s.keywords && s.keywords.length) $('#fKeywords').value = s.keywords.join(', ');
      if (s.definition) $('#fDefinition').value = s.definition;
      out('#edOut', 'Suggestions générées. Relisez et corrigez avant d’enregistrer (rien n’est publié automatiquement).');
      preview();
    } catch (e) { out('#edOut', e.message); }
  });

  $('#btnPreview').addEventListener('click', preview);

  function preview() {
    const title = $('#fTitle').value.trim() || '(titre non défini)';
    const desc = $('#fDesc').value.trim() || '(description non définie)';
    const url = 'https://aswek.net/product.html?p=' + (state.current ? encodeURIComponent(state.current.product.slug) : '');
    $('#previewBox').innerHTML = '<div class="serp"><div class="u">' + esc(url) + '</div>' +
      '<div class="t">' + esc(title) + '</div><div class="d">' + esc(desc) + '</div></div>';
  }

  /* ------------------------------------------------------------ actions */
  async function refreshAudit() {
    try {
      const d = await api('dashboard');
      renderKpis(d); renderAudit(d.audit); state.log = d.log || []; renderLog();
    } catch (e) {}
  }

  async function doApply(sel) {
    try {
      const r = await api('apply', { method: 'POST' });
      let s = 'Surcharges compilées : ' + JSON.stringify(r.counts) + '\n';
      if (r.warnings && r.warnings.length) { s += '\nAvertissements :\n'; r.warnings.forEach(w => { s += ' • ' + w + '\n'; }); }
      s += '\nFichier écrit : data/ai/overrides-applied.json\n(à copier sur l’hébergement pour publication)';
      out(sel, s);
    } catch (e) { out(sel, e.message); }
  }

  async function doSitemap(sel) {
    out(sel, 'Régénération du sitemap…');
    try {
      const r = await api('sitemap', { method: 'POST' });
      out(sel, r.output || (r.ok ? 'Sitemap régénéré.' : 'Échec de la génération.'));
      await refreshAudit();
    } catch (e) { out(sel, e.message); }
  }

  $('#btnApply').addEventListener('click', () => doApply('#actionOut'));
  $('#btnApply2').addEventListener('click', () => doApply('#pubOut'));
  $('#btnSitemap').addEventListener('click', () => doSitemap('#actionOut'));
  $('#btnSitemap2').addEventListener('click', () => doSitemap('#pubOut'));
  $('#btnAudit').addEventListener('click', async () => { await refreshAudit(); out('#actionOut', 'Audit actualisé.'); });
  $('#btnExport').addEventListener('click', () => { location.href = '/admin/api/export-overrides'; });
  $('#btnExport2').addEventListener('click', () => { location.href = '/admin/api/export-overrides'; });

  /* ------------------------------------------------------------ session */
  (async function init() {
    try {
      const s = await api('session');
      if (s.authed) {
        $('#login').classList.add('hidden');
        $('#app').classList.remove('hidden');
        await boot();
      }
    } catch (e) {}
  })();
})();
