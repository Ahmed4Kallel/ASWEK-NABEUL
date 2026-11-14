#!/usr/bin/env node
'use strict';
/*
 * Génère data/ai/search-i18n.json : termes de recherche AR + EN par produit.
 * Aucune caractéristique technique inventée : uniquement des reformulations
 * du nom, de la catégorie et des usages déjà connus.
 *
 *   $env:GEMINI_API_KEY = [Environment]::GetEnvironmentVariable('GEMINI_API_KEY')
 *   node scripts/generate-search-i18n.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'ai', 'search-i18n.json');
const KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-flash-lite-latest', 'gemini-3.7-flash'];
const BATCH = 8;

/*
 * Plancher manuel : termes maintenance a la main, appliques apres chaque
 * generation pour qu'une regeneration ne puisse jamais reduire la couverture
 * (synonymes reellement utilises par les clients, non inventes).
 */
const MANUAL = {
  'aswek-diluant-4l': {
    ar: ['ديلوان 4 لتر', 'مخفف دهان', 'مذيب دهان', 'تنر 4 لتر', 'سيلنت دهان', 'مخلل دهان'],
    en: ['thinner 4 l', 'paint thinner 4 l', 'solvent 4 l', 'resin thinner 4 l', '4l thinner', 'lacquer thinner']
  }
};

function mergeTerms(base, extra) {
  const out = { ar: [], en: [] };
  ['ar', 'en'].forEach(l => {
    out[l] = [...new Set([].concat(base[l] || [], extra[l] || []).map(x => String(x || '').trim()).filter(Boolean))].slice(0, 14);
  });
  return out;
}

function load() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8') + '\n;__O__={PRODUCTS,CATEGORIES};';
  const sb = { console };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  return sb.__O__;
}

function httpJson(url, payload) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': body.length } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { let j = null; try { j = JSON.parse(d); } catch (e) {} resolve({ status: res.statusCode, json: j, raw: d }); });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('timeout')));
    req.write(body); req.end();
  });
}

async function call(prompt) {
  let last = '';
  for (const m of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`;
        const { status, json, raw } = await httpJson(url, {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192, responseMimeType: 'application/json' }
        });
        if (status !== 200) { last = 'http' + status + ' ' + String(raw).slice(0, 120); await new Promise(r => setTimeout(r, 1200)); continue; }
        const t = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
        if (t) return t;
      } catch (e) { last = e.message; }
      await new Promise(r => setTimeout(r, 900));
    }
  }
  throw new Error(last || 'failed');
}

function parseLoose(t) {
  let s = String(t || '').trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (e) {}
  for (let cut = s.length; cut > 20; cut -= 20) {
    let x = s.slice(0, cut).replace(/,\s*$/, '');
    const opens = (x.match(/\[/g) || []).length - (x.match(/\]/g) || []).length;
    const braces = (x.match(/\{/g) || []).length - (x.match(/\}/g) || []).length;
    if (opens) x += ']'.repeat(opens);
    if (braces) x += '}'.repeat(braces);
    try { return JSON.parse(x); } catch (e) {}
  }
  throw new Error('JSON illisible');
}

function normalizeItems(obj, products) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  const items = obj.items && typeof obj.items === 'object' ? obj.items : obj;
  products.forEach(p => {
    const v = items[p.slug] || {};
    const clean = (arr) => [...new Set((Array.isArray(arr) ? arr : []).map(x => String(x || '').trim()).filter(Boolean))].slice(0, 14);
    const ar = clean(v.ar);
    const en = clean(v.en || v.fr);
    if (ar.length || en.length) out[p.slug] = { ar, en };
  });
  return out;
}

async function main() {
  if (!KEY) { console.error('GEMINI_API_KEY absent'); process.exit(1); }
  const { PRODUCTS, CATEGORIES } = load();
  const catName = {};
  CATEGORIES.forEach(c => { if (c.url.includes('c=')) catName[c.url.split('c=')[1]] = c.name; c.groups.forEach(g => { if (g.url.includes('c=')) catName[g.url.split('c=')[1]] = g.name; }); });

  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')).items || {} : {};
  const all = { ...old };

  for (let i = 0; i < PRODUCTS.length; i += BATCH) {
    const batch = PRODUCTS.slice(i, i + BATCH);
    const payload = batch.map(p => ({
      slug: p.slug,
      nom: p.name,
      categories: (p.cat || []).filter(c => c !== 'aswek' && !c.startsWith('aswek-') && catName[c]).map(c => catName[c])
    }));
    const prompt = `Tu prepares la recherche multilingue d'un site tunisien de resines, silicones, pigments, piscine et etancheite (ASWEK).
Pour CHAQUE produit ci-dessous, propose 6 a 10 termes de recherche EN ANGLAIS et 6 a 10 termes de recherche EN ARABE, que des clients utiliseraient reellement.
Regles strictes :
- Uniquement des facons de nommer/rechercher le produit (nom, synonyme, usage general, traduction, transliteration arabe). 
- N'invente AUCUNE caracteristique, marque, dosage, temps de sechage, certification, prix ou compatibilite.
- Pas de phrases publicitaires, pas de ponctuation inutile.
- Arabe standard + termes courants tunisiens si naturel. Ecris en caracteres arabes.
- Anglais simple (ex: epoxy resin, silicone mold, pool chlorine).
Reponds uniquement en JSON de la forme {"items":{"slug":{"ar":["..."],"en":["..."]}}}
Produits : ${JSON.stringify(payload)}`;

    try {
      const t = await call(prompt);
      const parsed = parseLoose(t);
      const got = normalizeItems(parsed, batch);
      let n = 0;
      batch.forEach(p => { if (got[p.slug]) { all[p.slug] = got[p.slug]; n++; } });
      console.log(`[${i + 1}-${i + batch.length}/${PRODUCTS.length}] ok ${n}/${batch.length}`);
    } catch (e) {
      console.log(`[${i + 1}-${i + batch.length}/${PRODUCTS.length}] ECHEC ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 700));
  }

  const items = {};
  PRODUCTS.forEach(p => {
    let v = all[p.slug];
    if (MANUAL[p.slug]) v = mergeTerms(v || {}, MANUAL[p.slug]);
    if (v && ((v.ar || []).length || (v.en || []).length)) items[p.slug] = v;
  });
  fs.writeFileSync(OUT, JSON.stringify({ generated_at: new Date().toISOString(), items }, null, 2), 'utf8');
  const ar = Object.values(items).filter(v => (v.ar || []).length).length;
  const en = Object.values(items).filter(v => (v.en || []).length).length;
  console.log(`search-i18n.json : ${Object.keys(items).length} produits | ar:${ar} | en:${en}`);
}

main().catch(e => { console.error(e); process.exit(1); });
