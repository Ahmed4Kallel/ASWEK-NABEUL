#!/usr/bin/env node
'use strict';
/*
 * ASWEK — ADMIN LOCAL (hors ligne, 127.0.0.1 uniquement)
 *
 * Ce serveur n'est PAS destiné à la production : il n'écoute que sur la
 * boucle locale, exige un mot de passe et ne sert que les outils d'administration.
 *
 *   node tools/admin-server.js
 *   $env:ASWEK_ADMIN_PASSWORD = "mon-mot-de-passe"; node tools/admin-server.js
 *
 * URL : http://127.0.0.1:8299/admin/
 *
 * Le mot de passe :
 *   - variable d'environnement ASWEK_ADMIN_PASSWORD (prioritaire) ;
 *   - sinon fichier data/admin/admin-password.txt (généré à la 1re exécution,
 *     16 caractères aléatoires) ;
 *   - la clé GEMINI_API_KEY n'est jamais envoyée au navigateur : les suggestions
 *     IA sont générées côté serveur.
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'tools', 'admin-web');
const PORT = Number(process.env.ASWEK_ADMIN_PORT || 8299);
const HOST = '127.0.0.1';
const SESSIONS = new Map();          // token -> { exp }
const FAILS = new Map();             // ip -> { n, until }
const SESSION_TTL = 8 * 3600 * 1000;
const MAX_FAIL = 5;
const LOCK_MS = 15 * 60 * 1000;

/* ------------------------------ utilitaires ------------------------------ */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
};

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}
function writeJsonAtomic(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, p);
}
function adminPassword() {
  if (process.env.ASWEK_ADMIN_PASSWORD) return process.env.ASWEK_ADMIN_PASSWORD;
  const file = path.join(ROOT, 'data', 'admin', 'admin-password.txt');
  try {
    const t = fs.readFileSync(file, 'utf8').trim();
    if (t) return t;
  } catch (e) {}
  const pwd = crypto.randomBytes(12).toString('base64url');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, pwd, 'utf8');
  console.log('Mot de passe admin généré : ' + pwd);
  console.log('(fichier : data/admin/admin-password.txt)');
  return pwd;
}
const PASSWORD = adminPassword();

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}
function isAuthed(req) {
  const tok = parseCookies(req).aswek_admin;
  if (!tok) return false;
  const s = SESSIONS.get(tok);
  if (!s || s.exp < Date.now()) { SESSIONS.delete(tok); return false; }
  s.exp = Date.now() + SESSION_TTL;
  return true;
}
function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > (limit || 2 * 1024 * 1024)) { reject(new Error('corps trop volumineux')); req.destroy(); }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
function safeJoin(root, p) {
  const clean = path.normalize(decodeURIComponent(p.split('?')[0])).replace(/^([/\\])+/, '');
  const full = path.join(root, clean);
  if (!full.toLowerCase().startsWith(root.toLowerCase())) return null;
  return full;
}

/* ------------------------------- données -------------------------------- */
function loadAll() {
  const lib = require(path.join(ROOT, 'scripts', 'overrides-lib.js'));
  const { PRODUCTS, CATEGORIES } = lib.loadProducts(ROOT);
  const ai = (n, f) => readJson(path.join(ROOT, 'data', 'ai', n + '.json'), f);
  return {
    products: PRODUCTS,
    categories: CATEGORIES,
    seo: (ai('seo-alt').items) || {},
    content: (readJson(path.join(ROOT, 'data', 'product-content.json'), {}).products) || {},
    smart: ai('smart-search', {}),
    i18n: ai('search-i18n', {}),
    variants: ai('search-variants', {}),
    catSeo: (ai('category-seo').items) || {},
    overrides: readJson(path.join(ROOT, 'data', 'admin', 'overrides.json'), { seo: {}, synonyms: {}, descriptions: {} }),
    applied: ai('overrides-applied', { seo: {}, synonyms: {}, descriptions: {} })
  };
}

function audit() {
  const spawn = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'audit-seo.js'), '--json'], { cwd: ROOT, encoding: 'utf8' });
  try { return JSON.parse(spawn.stdout); } catch (e) { return { error: 'audit indisponible', totals: {}, issues: { products: [], categories: [], site: [] } }; }
}

function searchLog() {
  const file = path.join(ROOT, 'data', 'search-log.jsonl');
  const agg = {};
  try {
    fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).forEach(line => {
      let j; try { j = JSON.parse(line); } catch (e) { return; }
      const k = String(j.q || '').toLowerCase().trim();
      if (!k) return;
      if (!agg[k]) agg[k] = { q: j.q, count: 0, first: j.ts, last: j.ts, results: j.results || 0 };
      agg[k].count++;
      agg[k].last = j.ts;
    });
  } catch (e) {}
  return Object.values(agg).sort((a, b) => b.count - a.count);
}

/* ------------------------- suggestions IA (serveur) ---------------------- */
async function aiSuggest(payload) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return { ok: false, error: 'Aucune clé IA côté serveur (GEMINI_API_KEY non définie). Les suggestions IA sont désactivées.' };
  const products = loadAll().products;
  const p = products.find(x => x.slug === payload.slug);
  if (!p) return { ok: false, error: 'Produit introuvable' };
  const prompt = `Produit ASWEK : ${p.name}. Catégories : ${(p.cat || []).join(', ')}. Stock : ${p.stock}. Prix de départ : ${p.priceFrom} ${p.cur || 'TND'}.
Donne des suggestions SEO en français, factuelles, sans inventer de caractéristique, certification, dosage ni compatibilité.
Réponds uniquement en JSON : {"seo_title":"...","seo_desc":"...","h1":"...","alt_main":"...","keywords":["..."],"definition":"..."}
Contraintes : seo_title <= 65 caractères, seo_desc entre 110 et 155 caractères, alt_main <= 125 caractères décrivant la photo, definition en 2 phrases factuelles, keywords 4 à 6 mots-clés.`;
  const urlApi = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${encodeURIComponent(key)}`;
  const res = await new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024, responseMimeType: 'application/json' }
    }), 'utf8');
    const u = new URL(urlApi);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': body.length } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('timeout')));
    req.write(body); req.end();
  });
  try {
    const j = JSON.parse(res);
    const t = j.candidates?.[0]?.content?.parts?.map(x => x.text).join('') || '';
    const s = t.indexOf('{'), e = t.lastIndexOf('}');
    const parsed = JSON.parse(t.slice(s, e + 1));
    return { ok: true, suggestions: parsed };
  } catch (e) {
    return { ok: false, error: 'Réponse IA illisible' };
  }
}

/* ------------------------------- serveur -------------------------------- */
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  const ip = req.socket.remoteAddress || 'local';

  // ---------- API ----------
  if (pathname.startsWith('/admin/api/')) {
    const route = pathname.replace('/admin/api/', '');

    if (route === 'session') return json(res, 200, { authed: isAuthed(req) });

    if (route === 'login') {
      const f = FAILS.get(ip) || { n: 0, until: 0 };
      if (f.until > Date.now()) return json(res, 429, { error: 'Trop de tentatives. Réessayez plus tard.' });
      let body = {};
      try { body = JSON.parse(await readBody(req, 4096) || '{}'); } catch (e) {}
      const given = String(body.password || '');
      const ok = given.length > 0 && crypto.createHash('sha256').update(given).digest('hex') === crypto.createHash('sha256').update(PASSWORD).digest('hex');
      if (!ok) {
        f.n++; f.until = f.n >= MAX_FAIL ? Date.now() + LOCK_MS : 0; FAILS.set(ip, f);
        return json(res, 401, { error: 'Mot de passe incorrect' });
      }
      FAILS.delete(ip);
      const token = crypto.randomBytes(24).toString('hex');
      SESSIONS.set(token, { exp: Date.now() + SESSION_TTL });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': `aswek_admin=${token}; HttpOnly; SameSite=Strict; Path=/` });
      return res.end(JSON.stringify({ ok: true }));
    }

    if (route === 'logout') {
      const tok = parseCookies(req).aswek_admin;
      if (tok) SESSIONS.delete(tok);
      res.writeHead(200, { 'Set-Cookie': 'aswek_admin=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/' });
      return res.end(JSON.stringify({ ok: true }));
    }

    if (!isAuthed(req)) return json(res, 401, { error: 'Authentification requise' });

    try {
      if (route === 'dashboard') {
        const d = loadAll();
        const catUrls = [];
        d.categories.forEach(c => {
          if (c.url && c.url.includes('c=')) catUrls.push(c.url.split('c=')[1]);
          (c.groups || []).forEach(g => { if (g.url && g.url.includes('c=')) catUrls.push(g.url.split('c=')[1]); });
        });
        const rep = audit();
        return json(res, 200, {
          counts: {
            products: d.products.length,
            categories: new Set(catUrls).size,
            categoryRoots: d.categories.length,
            seoMissing: Object.values(d.seo).filter(s => !s.seo_title || !s.seo_desc || !s.h1 || !s.alt_main).length,
            contentMissing: d.products.filter(p => !(d.content[p.slug] || {}).definition).length,
            overrideSeo: Object.keys(d.overrides.seo || {}).length,
            overrideSyn: Object.keys(d.overrides.synonyms || {}).length,
            overrideDesc: Object.keys(d.overrides.descriptions || {}).length
          },
          audit: rep,
          log: searchLog(),
          aiAvailable: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
        });
      }
      if (route === 'products') {
        const d = loadAll();
        const rows = d.products.map(p => {
          const syn = Array.isArray(d.smart.items) ? d.smart.items.find(x => x.slug === p.slug) : null;
          return {
            product: { slug: p.slug, name: p.name, img: p.img, cat: p.cat, priceFrom: p.priceFrom, stock: p.stock },
            seo: d.seo[p.slug] || null,
            content: d.content[p.slug] || null,
            synonyms: {
              fr: (syn && syn.synonyms) || [],
              ar: (d.i18n.items || {})[p.slug]?.ar || [],
              en: (d.i18n.items || {})[p.slug]?.en || []
            },
            override: {
              seo: (d.overrides.seo || {})[p.slug] || null,
              synonyms: (d.overrides.synonyms || {})[p.slug] || null,
              description: (d.overrides.descriptions || {})[p.slug] || null
            }
          };
        });
        return json(res, 200, { products: rows });
      }
      if (route === 'product') {
        const slug = String(parsed.query.slug || '');
        const d = loadAll();
        const p = d.products.find(x => x.slug === slug);
        if (!p) return json(res, 404, { error: 'Produit introuvable' });
        const syn = Array.isArray(d.smart.items) ? d.smart.items.find(x => x.slug === slug) : null;
        return json(res, 200, {
          product: p,
          seo: d.seo[slug] || null,
          content: d.content[slug] || null,
          synonyms: {
            fr: (syn && syn.synonyms) || [],
            ar: (d.i18n.items || {})[slug]?.ar || [],
            en: (d.i18n.items || {})[slug]?.en || [],
            variants: (d.variants.items || {})[slug] || []
          },
          override: {
            seo: (d.overrides.seo || {})[slug] || null,
            synonyms: (d.overrides.synonyms || {})[slug] || null,
            description: (d.overrides.descriptions || {})[slug] || null
          },
          published: {
            seo: (d.applied.seo || {})[slug] || null,
            synonyms: (d.applied.synonyms || {})[slug] || null,
            description: (d.applied.descriptions || {})[slug] || null
          }
        });
      }
      if (route === 'save-overrides') {
        let body = {};
        try { body = JSON.parse(await readBody(req) || '{}'); } catch (e) { return json(res, 400, { error: 'JSON invalide' }); }
        const cur = readJson(path.join(ROOT, 'data', 'admin', 'overrides.json'), { seo: {}, synonyms: {}, descriptions: {} });
        const section = String(body.section || '');
        const slug = String(body.slug || '');
        const value = body.value;
        if (!['seo', 'synonyms', 'descriptions'].includes(section)) return json(res, 400, { error: 'section invalide' });
        if (!slug) return json(res, 400, { error: 'slug manquant' });
        if (!cur[section]) cur[section] = {};
        if (value === null || value === '' || (typeof value === 'object' && !Object.keys(value).length)) delete cur[section][slug];
        else cur[section][slug] = value;
        cur.updated_at = new Date().toISOString();
        writeJsonAtomic(path.join(ROOT, 'data', 'admin', 'overrides.json'), cur);
        return json(res, 200, { ok: true, overrides: cur });
      }
      if (route === 'suggest') {
        let body = {};
        try { body = JSON.parse(await readBody(req, 8192) || '{}'); } catch (e) { return json(res, 400, { error: 'JSON invalide' }); }
        const out = await aiSuggest(body);
        return json(res, out.ok ? 200 : 200, out);
      }
      if (route === 'apply') {
        const lib = require(path.join(ROOT, 'scripts', 'overrides-lib.js'));
        const res2 = lib.compile(ROOT, { dryRun: false });
        return json(res, 200, { ok: !res2.warnings.length || true, counts: res2.counts, warnings: res2.warnings });
      }
      if (route === 'sitemap') {
        const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-seo.js')], { cwd: ROOT, encoding: 'utf8' });
        return json(res, 200, { ok: r.status === 0, output: (r.stdout || '') + (r.stderr || '') });
      }
      if (route === 'export-overrides') {
        const cur = readJson(path.join(ROOT, 'data', 'admin', 'overrides.json'), {});
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="aswek-overrides.json"'
        });
        return res.end(JSON.stringify(cur, null, 2));
      }
      return json(res, 404, { error: 'route inconnue' });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  // ---------- interface ----------
  if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }

  // images du catalogue (lecture seule) pour l'aperçu dans l'admin
  if (pathname.startsWith('/images/')) {
    const target = safeJoin(ROOT, pathname);
    if (!target) { res.writeHead(400); return res.end('Bad request'); }
    fs.readFile(target, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' });
      res.end(buf);
    });
    return;
  }

  let rel = pathname === '/admin' || pathname === '/admin/' ? '/index.html' : pathname.replace(/^\/admin/, '');
  const target = safeJoin(WEB, rel);
  if (!target) { res.writeHead(400); return res.end('Bad request'); }
  fs.readFile(target, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404');
    }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(buf);
  });
});

server.listen(PORT, HOST, () => {
  console.log('ASWEK ADMIN local : http://' + HOST + ':' + PORT + '/admin/');
  console.log('(serveur local uniquement, non destiné à la production)');
});
