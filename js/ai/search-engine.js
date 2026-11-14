/* ASWEK — moteur de recherche intelligent (tolérance aux fautes + phonétique) */
(function () {
  'use strict';

  const DATA = { ready: false, loading: null, docs: [], vocab: new Map(), phon: new Map(), categories: [], productFallback: [] };
  const LOG_KEY = 'aswek_search_log_v1';
  const CACHE_KEY = 'aswek_search_index_v1';

  /* ----------------------------- normalisation ----------------------------- */
  function stripDiacritics(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function norm(s) {
    return stripDiacritics(s)
      .toLowerCase()
      .replace(/[\u064b-\u0652\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function tokenize(s) { const n = norm(s); return n ? n.split(' ') : []; }

  function phonetic(w) {
    let s = stripDiacritics(w).toLowerCase().replace(/[^a-z\u0600-\u06ff]/g, '');
    if (!s) return '';
    if (/[\u0600-\u06ff]/.test(s)) return s;
    s = s
      .replace(/ph/g, 'f').replace(/qu/g, 'k').replace(/q/g, 'k')
      .replace(/ck/g, 'k').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k')
      .replace(/ch/g, 'S').replace(/sh/g, 'S')
      .replace(/[y]/g, 'i')
      .replace(/ou/g, 'u').replace(/eau|au/g, 'o')
      .replace(/ai|ei/g, 'e')
      .replace(/x/g, 'ks').replace(/z/g, 's')
      .replace(/gn/g, 'n').replace(/w/g, 'v')
      .replace(/(.)\1+/g, '$1')
      .replace(/e$/, '').replace(/s$/, '');
    return s;
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    if (Math.abs(m - n) > 4) return 99;
    let prev = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      let cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  function maxDist(len) { return len <= 5 ? 1 : len <= 8 ? 2 : 3; }
  function commonPrefix(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  /* similarité 0..1 */
  function similarity(q, d) {
    if (!q || !d) return 0;
    if (q === d) return 1;
    let best = 0;
    if (q.length >= 3 && d.startsWith(q) && q.length / d.length >= 0.8) best = Math.max(best, 0.88);
    if (d.length >= 4 && q.startsWith(d) && d.length / q.length >= 0.8) best = Math.max(best, 0.82);
    const dist = levenshtein(q, d);
    if (dist <= maxDist(Math.max(q.length, d.length))) {
      const base = Math.max(0.45, 1 - dist * 0.2);
      best = Math.max(best, commonPrefix(q, d) >= 3 ? Math.max(0.6, base) : base);
    }
    const pq = phonetic(q), pd = phonetic(d);
    if (pq && pd && pq.length >= 4 && pd.length >= 4) {
      if (pq === pd) best = Math.max(best, 0.86);
      else if (Math.abs(pq.length - pd.length) <= 2 && levenshtein(pq, pd) <= 1) best = Math.max(best, 0.72);
    }
    if (!best && q.length >= 4 && d.includes(q)) best = 0.45;
    return best;
  }

  /* ------------------------------ chargement ------------------------------ */
  const fetchJson = (u) => fetch(u, { cache: 'force-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);

  function categoryNameMap() {
    const map = {};
    (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []).forEach(c => {
      if (c.url && c.url.includes('c=')) map[c.url.split('c=')[1]] = c.name;
      c.groups.forEach(g => { if (g.url && g.url.includes('c=')) map[g.url.split('c=')[1]] = g.name; });
    });
    return map;
  }

  function addField(doc, text, weight) {
    if (!text) return;
    const toks = tokenize(text);
    if (!toks.length) return;
    doc.fields.push({ weight: weight, tokens: toks });
  }

  function build(products, smart, variants, seo, shorts, i18n, overrides) {
    const catNames = categoryNameMap();
    const docs = [];
    const vocab = new Map();      // token normalisé -> { df, raw }
    const canon = new Map();      // vocabulaire de correction (noms, catégories, mots-clés)
    const phonMap = new Map();    // phonétique -> [tokens]
    const categories = [];

    const reg = (tok, raw, isCanon) => {
      const v = vocab.get(tok);
      if (v) { v.df++; }
      else vocab.set(tok, { df: 1, raw: raw || tok });
      if (raw && !v) vocab.get(tok).raw = raw;
      if (isCanon && !canon.has(tok)) canon.set(tok, raw || tok);
      const p = phonetic(tok);
      if (p) {
        if (!phonMap.has(p)) phonMap.set(p, []);
        const arr = phonMap.get(p);
        if (arr.indexOf(tok) === -1) arr.push(tok);
      }
    };

    products.forEach(p => {
      const doc = { type: 'product', slug: p.slug, name: p.name, img: p.img, id: p.id, cat: p.cat || [], fields: [], ref: p };
      const smartItem = Array.isArray(smart && smart.items)
        ? (smart.items.find(x => x.slug === p.slug) || {})
        : ((smart && smart.items && smart.items[p.slug]) || {});
      const variantList = (variants && variants.items && variants.items[p.slug]) || [];
      const seoItem = (seo && seo.items && seo.items[p.slug]) || {};
      const shortTxt = (shorts && shorts.items && (Array.isArray(shorts.items)
        ? (shorts.items.find(x => x.slug === p.slug) || {}).accroche
        : shorts.items[p.slug])) || '';

      addField(doc, p.name, 12);
      addField(doc, p.name, 12); // double poids sur le nom
      addField(doc, (p.cat || []).map(c => catNames[c] || c.replace(/-/g, ' ')).join(' '), 4);
      addField(doc, 'ASWEK', 2);
      addField(doc, (smartItem.synonyms || []).join(' '), 7);
      addField(doc, (smartItem.intents || []).join(' '), 4);
      addField(doc, variantList.join(' '), 6);
      addField(doc, (seoItem.keywords || []).join(' '), 5);
      addField(doc, seoItem.alt_main || '', 2);
      addField(doc, shortTxt, 3);
      addField(doc, p.short || '', 2);

      const i18nItem = (i18n && i18n.items && i18n.items[p.slug]) || {};
      addField(doc, (i18nItem.ar || []).join(' '), 6);
      addField(doc, (i18nItem.en || []).join(' '), 6);

      // surcharges validées par l'administrateur (prioritaires)
      const ovSyn = (overrides && overrides.synonyms && overrides.synonyms[p.slug]) || {};
      addField(doc, (ovSyn.fr || []).join(' '), 8);
      addField(doc, (ovSyn.ar || []).join(' '), 7);
      addField(doc, (ovSyn.en || []).join(' '), 7);
      const ovSeo = (overrides && overrides.seo && overrides.seo[p.slug]) || {};
      addField(doc, (ovSeo.keywords || []).join(' '), 6);
      addField(doc, ovSeo.h1 || '', 5);

      doc.fields.forEach(f => f.tokens.forEach((t, i) => reg(t, f.weight >= 12 ? (p.name.split(/\s+/)[i] || t) : t, f.weight >= 12 || f.weight === 5)));
      // vocabulaire de correction enrichi par les surcharges validées
      [].concat(ovSyn.fr || [], ovSyn.ar || [], ovSyn.en || []).forEach(w => {
        tokenize(w).forEach(t => reg(t, t, true));
      });
      doc.nameNorm = norm(p.name);
      docs.push(doc);
    });

    // catégories (recherche + suggestions)
    const catSeen = new Set();
    (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []).forEach(c => {
      const push = (id, name, url, parent) => {
        if (!id || !name || catSeen.has(id)) return;
        catSeen.add(id);
        categories.push({ type: 'category', slug: id, name: name, url: url, parent: parent || '', norm: norm(name + ' ' + (parent || '')) });
        tokenize(name + ' ' + (parent || '')).forEach(t => reg(t, t, true));
      };
      if (c.url && c.url.includes('c=')) push(c.url.split('c=')[1], c.name, c.url, '');
      c.groups.forEach(g => { if (g.url && g.url.includes('c=')) push(g.url.split('c=')[1], g.name, g.url, c.name); });
    });

    DATA.docs = docs;
    DATA.vocab = vocab;
    DATA.canon = canon;
    DATA.phon = phonMap;
    DATA.categories = categories;
    DATA.productFallback = products.map(p => ({ slug: p.slug, name: p.name, img: p.img }));
    DATA.ready = true;
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), n: docs.length }));
    } catch (e) {}
    return DATA;
  }

  function load() {
    if (DATA.ready) return Promise.resolve(DATA);
    if (DATA.loading) return DATA.loading;
    const P = (typeof PRODUCTS !== 'undefined') ? PRODUCTS : [];
    DATA.loading = Promise.all([
      fetchJson('data/ai/smart-search.json'),
      fetchJson('data/ai/search-variants.json'),
      fetchJson('data/ai/seo-alt.json'),
      fetchJson('data/ai/short-descriptions.json'),
      fetchJson('data/ai/search-i18n.json'),
      (typeof window.ASWEKOverrides !== 'undefined' && window.ASWEKOverrides.ready)
        ? window.ASWEKOverrides.ready.then(() => window.ASWEKOverrides.data())
        : fetchJson('data/ai/overrides-applied.json')
    ]).then(([smart, variants, seo, shorts, i18n, overrides]) => build(P, smart, variants, seo, shorts, i18n, overrides))
      .catch(() => build(P, null, null, null, null, null, null));
    return DATA.loading;
  }

  /* ------------------------------- recherche ------------------------------ */
  function searchProducts(query, limit) {
    const qn = norm(query);
    const qtokens = qn ? qn.split(' ') : [];
    if (!qtokens.length) return [];
    const out = [];
    DATA.docs.forEach(doc => {
      let score = 0, matched = 0, maxRaw = 0;
      const tokenBest = [];
      for (const qt of qtokens) {
        let best = 0, bestTok = '', rawBest = 0;
        for (const f of doc.fields) {
          for (const dt of f.tokens) {
            const s = similarity(qt, dt);
            if (!s) continue;
            const val = s * f.weight;
            if (val > best) { best = val; bestTok = dt; rawBest = s; }
          }
        }
        tokenBest.push({ qt: qt, s: best, raw: rawBest, tok: bestTok });
        if (best > 0) matched++;
        score += best;
        if (rawBest > maxRaw) maxRaw = rawBest;
      }
      if (!matched || maxRaw < 0.58) return;
      const coverage = matched / qtokens.length;
      score *= (0.4 + 0.6 * Math.pow(coverage, 1.5));
      if (qn.length >= 3 && doc.nameNorm.includes(qn)) score += 25;
      if (doc.nameNorm === qn) score += 40;
      // noms courts : léger bonus aux produits dont le nom contient tous les mots
      if (coverage === 1) score += 4;
      out.push({ doc: doc, score: score, tokenBest: tokenBest, coverage: coverage });
    });
    out.sort((a, b) => b.score - a.score);
    const top = out.length ? out[0].score : 0;
    const floor = Math.max(5, top * 0.4);
    const results = out.filter(x => x.score >= floor && x.coverage >= 0.34).slice(0, limit || 12)
      .map(x => ({ product: x.doc.ref, score: Math.round(x.score), doc: x.doc }));
    return results;
  }

  function searchCategories(query, limit) {
    const qn = norm(query);
    if (!qn) return [];
    return DATA.categories
      .map(c => {
        let s = 0;
        const toks = c.norm.split(' ');
        qn.split(' ').forEach(qt => {
          let best = 0;
          toks.forEach(t => { const v = similarity(qt, t); if (v > best) best = v; });
          s += best;
        });
        return { c: c, s: s };
      })
      .filter(x => x.s >= 0.7)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit || 4)
      .map(x => x.c);
  }

  /* correction orthographique : mappe chaque mot vers le vocabulaire canonique */
  function correct(query) {
    const qn = norm(query);
    if (!qn) return { corrected: '', changed: false };
    const words = qn.split(' ');
    const source = DATA.canon && DATA.canon.size ? DATA.canon : DATA.vocab;
    let changed = false;
    const fixed = words.map(w => {
      if (w.length < 3) return w;
      if (source.has(w)) return source.get(w) || w;
      let best = '', bestS = 0, bestGap = 99;
      source.forEach((raw, tok) => {
        const gap = Math.abs(tok.length - w.length);
        if (gap > 3) return;
        const s = similarity(w, tok);
        if (s > bestS + 0.001 || (Math.abs(s - bestS) <= 0.001 && gap < bestGap)) {
          bestS = s; bestGap = gap; best = raw || tok;
        }
      });
      if (best && bestS >= 0.72) { changed = true; return best; }
      return w;
    });
    return { corrected: fixed.join(' '), changed: changed };
  }

  /* ------------------------------- journal -------------------------------- */
  function readLog() {
    try { const raw = localStorage.getItem(LOG_KEY); return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
  }
  function writeLog(obj) {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(obj)); } catch (e) {}
  }
  function logNoResult(query, meta) {
    const q = String(query || '').trim();
    if (!q) return;
    const key = norm(q);
    if (!key) return;
    const log = readLog();
    const cur = log[key] || { q: q, count: 0, first: Date.now(), last: 0, results: 0 };
    cur.count++;
    cur.q = q;
    cur.last = Date.now();
    cur.results = meta && typeof meta.results === 'number' ? meta.results : 0;
    cur.url = (meta && meta.url) || (location.pathname + location.search);
    log[key] = cur;
    const keys = Object.keys(log);
    if (keys.length > 300) {
      keys.sort((a, b) => log[a].last - log[b].last).slice(0, keys.length - 300).forEach(k => delete log[k]);
    }
    writeLog(log);
    // journal côté serveur si disponible (facultatif, échoue silencieusement)
    try {
      const payload = JSON.stringify({ q: q, results: cur.results, url: cur.url, ts: Date.now() });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/search-log', new Blob([payload], { type: 'application/json' }));
    } catch (e) {}
  }
  function getLog() { return readLog(); }
  function clearLog() { try { localStorage.removeItem(LOG_KEY); } catch (e) {} }
  function exportLog() {
    const log = readLog();
    return Object.keys(log).map(k => log[k]).sort((a, b) => b.count - a.count);
  }

  function suggest(query, limit) {
    return load().then(() => {
      const products = searchProducts(query, limit || 6);
      const cats = searchCategories(query, 3);
      const corr = correct(query);
      const alternatives = products.length ? [] : DATA.docs
        .map(d => ({ doc: d, s: similarity(norm(query), d.nameNorm) }))
        .filter(x => x.s > 0.25).sort((a, b) => b.s - a.s).slice(0, 4).map(x => x.doc.ref);
      return { products: products, categories: cats, corrected: corr, alternatives: alternatives };
    });
  }

  window.ASWEKSearch = {
    load: load,
    search: (q, l) => load().then(() => searchProducts(q, l)),
    searchCategories: (q, l) => load().then(() => searchCategories(q, l)),
    suggest: suggest,
    correct: (q) => load().then(() => correct(q)),
    normalize: norm,
    logNoResult: logNoResult,
    getLog: getLog,
    exportLog: exportLog,
    clearLog: clearLog,
    stats: () => ({ docs: DATA.docs.length, categories: DATA.categories.length, vocab: DATA.vocab.size, ready: DATA.ready }),
    debugScore: (q) => {
      const qtokens = norm(q).split(' ');
      return DATA.docs.map(doc => {
        let score = 0, matched = 0;
        qtokens.forEach(qt => {
          let best = 0;
          doc.fields.forEach(f => f.tokens.forEach(dt => {
            const s = similarity(qt, dt) * f.weight;
            if (s > best) best = s;
          }));
          if (best > 0) matched++;
          score += best;
        });
        return { name: doc.name, score: Math.round(score * 100) / 100, coverage: matched / qtokens.length };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
    }
  };
  // pré-charge l'index dès l'arrivée sur la page de recherche
  if (/search\.html$/.test(location.pathname)) load();
})();
