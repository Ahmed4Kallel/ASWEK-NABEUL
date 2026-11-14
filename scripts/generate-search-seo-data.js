#!/usr/bin/env node
'use strict';
/*
 * Génère :
 *  - data/ai/search-variants.json : variantes orthographiques / phonétiques par produit
 *  - data/ai/category-seo.json    : Title, Meta Description, H1, mots-clés par catégorie
 * Utilise GEMINI_API_KEY (jamais exposée au navigateur).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'ai');
const KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-flash-lite-latest', 'gemini-3.7-flash', 'gemini-flash-latest'];

function load() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8') + '\n;__O__={PRODUCTS,CATEGORIES};';
  const sb = { console };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  return sb.__O__;
}

function post(url, payload) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { let j = null; try { j = JSON.parse(d); } catch (e) {} resolve({ status: res.statusCode, json: j, raw: d }); });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('timeout')));
    req.write(body); req.end();
  });
}

async function ai(prompt) {
  let last = '';
  for (const m of MODELS) {
    for (let i = 0; i < 2; i++) {
      try {
        const { status, json } = await post(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`,
          { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: 'application/json' } }
        );
        if (status === 200) return json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
        last = 'http' + status;
      } catch (e) { last = e.message; }
    }
  }
  throw new Error(last);
}

function parse(text) {
  let s = String(text).trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  try { return JSON.parse(s); } catch (e) {}
  const start = Math.min(...[s.indexOf('{'), s.indexOf('[')].filter(i => i >= 0));
  if (isFinite(start)) {
    const sub = s.slice(start);
    const ends = [sub.lastIndexOf('}'), sub.lastIndexOf(']')].filter(i => i >= 0).sort((a, b) => b - a);
    for (const e of ends) { try { return JSON.parse(sub.slice(0, e + 1)); } catch (err) {} }
  }
  throw new Error('parse');
}

const save = (n, d) => { fs.writeFileSync(path.join(OUT, n + '.json'), JSON.stringify(d, null, 2), 'utf8'); console.log('saved', n); };

(async () => {
  if (!KEY) { console.error('GEMINI_API_KEY manquant'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const { PRODUCTS, CATEGORIES } = load();

  // 1) variantes de recherche par produit
  const prodList = PRODUCTS.map(p => ({ slug: p.slug, name: p.name, cat: p.cat }));
  try {
    console.log('[variants]', prodList.length, 'produits');
    const txt = await ai(`Tu es un expert en recherche e-commerce (Tunisie, français/arabe/français local).
Pour CHAQUE produit ASWEK ci-dessous, génère les variantes de recherche réalistes qu'un client pourrait taper:
fautes d'orthographe fréquentes, erreurs de frappe, transcriptions phonétiques, mots sans accents, versions anglaises, abréviations.
Inclus explicitement des formes comme "risine epoxy", "ipoxi", "resine epoxi", "resin epoxy" quand le produit est une résine époxy.
Ne mets PAS le nom exact du produit dans "variants". 5 à 8 variantes maximum par produit, courtes.
Produits: ${JSON.stringify(prodList)}
Réponds STRICTEMENT par un objet JSON: {"<slug>":["variante1","variante2", ...]}`);
    const j = parse(txt);
    const clean = {};
    Object.keys(j).forEach(k => {
      if (Array.isArray(j[k])) clean[k] = j[k].map(x => String(x).trim()).filter(Boolean).slice(0, 10);
    });
    save('search-variants', { generated_at: new Date().toISOString(), items: clean });
  } catch (e) { console.error('variants FAILED', e.message); }

  // 2) SEO catégories
  const cats = [];
  const seen = new Set();
  CATEGORIES.forEach(c => {
    if (c.url && c.url !== '#' && !seen.has(c.url)) {
      seen.add(c.url);
      const id = c.url.split('c=')[1];
      cats.push({ id, name: c.name, kind: 'root', count: c.groups.reduce((n, g) => n + g.items.length, 0) });
    }
    c.groups.forEach(g => {
      if (g.url && g.url !== '#' && !seen.has(g.url)) {
        seen.add(g.url);
        const id = g.url.split('c=')[1];
        cats.push({ id, name: g.name, kind: 'group', parent: c.name, count: g.items.length });
      }
    });
  });
  try {
    console.log('[category-seo]', cats.length, 'catégories');
    const txt = await ai(`Génère les métadonnées SEO de pages catégorie pour la boutique ASWEK (résine époxy, silicones, pigments, piscine, étanchéité, Tunisie).
Catégories: ${JSON.stringify(cats)}
Pour chaque catégorie (clé = id), renvoie:
{"<id>":{"title":"max 60 car., marque ASWEK + Tunisie","description":"max 155 car., naturelle, sans promesse inventée","h1":"titre H1","keywords":["...5 mots-clés..."]}}
Pas de prix, pas de fausses promotions. Français.`);
    const j = parse(txt);
    save('category-seo', { generated_at: new Date().toISOString(), items: j });
  } catch (e) { console.error('category-seo FAILED', e.message); }

  console.log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
