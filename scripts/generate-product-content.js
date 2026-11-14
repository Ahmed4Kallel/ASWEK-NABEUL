#!/usr/bin/env node
/*
 * ASWEK - Générateur de définitions produits par IA (Google Gemini).
 *
 * Usage :
 *   node scripts/generate-product-content.js            # génère les manquants
 *   node scripts/generate-product-content.js --force    # regénère tout
 *   node scripts/generate-product-content.js --only=slug1,slug2
 *
 * La clé API est lue UNIQUEMENT côté serveur depuis la variable
 * d'environnement GEMINI_API_KEY (jamais exposée au navigateur).
 *
 * La sortie est écrite dans data/product-content.json, chargé ensuite par
 * le site statique (aucun appel IA au chargement de la page).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DATA_JS = path.join(ROOT, 'js', 'data.js');
const OUT_FILE = path.join(ROOT, 'data', 'product-content.json');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-flash-latest'];

const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Lecture des produits depuis js/data.js (source unique de vérité)    */
/* ------------------------------------------------------------------ */
function loadProducts() {
  let code = fs.readFileSync(DATA_JS, 'utf8');
  code += '\n;__OUT__ = { PRODUCTS };\n';
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.__OUT__.PRODUCTS;
}

/* Catégorie lisible (français) déduite des slugs de catégorie. */
const CAT_LABELS = {
  'les-resines': 'Résines',
  'resines-epoxy': 'Résines époxy',
  'pour-bijoux-et-creations': 'Résines pour bijoux et créations',
  'peintures-acryliques': 'Peintures acryliques',
  'colorant-resine': 'Colorants pour résine',
  'moules-silicones': 'Moules en silicone',
  'silicones-pour-moules': 'Silicones pour moules',
  'colorants-et-pigments': 'Colorants et pigments',
  'poudre': 'Poudres',
  'pigments-decorations': 'Pigments et décorations',
  'diluants-et-vernis': 'Diluants et vernis',
  'vernis-techniques': 'Vernis techniques',
  'diluants': 'Diluants',
  'entretien-nettoyage': 'Entretien et nettoyage',
  'bougies-et-cires': 'Bougies et cires',
  'cires': 'Cires',
  'etancheite': 'Étanchéité',
  'etancheite-toitures': 'Étanchéité toitures',
  'piscine': 'Piscine',
  'traitement-piscine': 'Traitement piscine'
};

function productContext(p) {
  const cats = (p.cat || []).filter(c => c !== 'aswek' && !c.startsWith('aswek-'));
  const catLabels = cats.map(c => CAT_LABELS[c] || c).join(' > ');
  const vars = (p.variations || []).map(v => v.value).join(', ') || '—';
  return { cats, catLabels, vars };
}

/* ------------------------------------------------------------------ */
/* Prompt strict : interdit toute invention                            */
/* ------------------------------------------------------------------ */
function buildPrompt(p) {
  const ctx = productContext(p);
  return `Tu es rédacteur e-commerce technique pour la boutique ASWEK (Tunisie), spécialisée en résine époxy, silicones, colorants, pigments, cires, diluants, vernis, piscine et étanchéité.

Rédige une fiche produit en FRANÇAIS professionnel pour le produit suivant :
- Nom exact : "${p.name}"
- Catégorie : ${ctx.catLabels || 'Non spécifiée'}
- Variable(s)/format(s) connu(s) : ${ctx.vars}

RÈGLES ABSOLUES (à respecter impérativement) :
1. N'invente JAMAIS de caractéristiques techniques, proportions de mélange, temps de séchage, résistances, propriétés chimiques, prix ou performances qui ne sont pas certaines et vérifiables.
2. Si une information est incertaine, ne l'affirme pas ; tu peux utiliser la formule « à confirmer » ou « se référer à la fiche technique ».
3. Le contenu doit être spécifique à CE produit, jamais une description générique réutilisable pour un autre. Adapte le vocabulaire au type de produit (résine époxy, durcisseur, pigment, moule en silicone, diluant, peinture, vernis, produit d'étanchéité, cire, traitement piscine, etc.).
4. Si le produit est manifestement un produit d'entretien (chlore, pH, soude, etc.), reste factuel et générique sans inventer de dosage précis.
5. Texte en français soigné, paragraphes bien organisés, ton professionnel et accessible.

Renvoie UNIQUEMENT un objet JSON valide (aucun texte autour, pas de balises Markdown), avec cette structure exacte :
{
  "definition": "Définition claire et complète du produit : ce que c'est, à quoi il sert (2 à 4 phrases).",
  "description": "Description détaillée et naturelle du produit, organisée en 2 ou 3 paragraphes (séparés par \\n\\n).",
  "usage": ["Utilisation principale 1", "Utilisation 2", "Utilisation 3"],
  "features": [ { "label": "Caractéristique", "value": "Valeur ou description vérifiable" } ],
  "advantages": ["Avantage confirmé 1", "Avantage confirmé 2"],
  "howto": "Mode d'emploi général et prudent. Si des détails précis ne sont pas connus, indique de consulter la fiche technique.",
  "safety": "Précautions de sécurité standard et fiables pour ce type de produit. Si des données spécifiques manquent, indique de consulter la FDS (fiche de données de sécurité).",
  "seo_title": "Titre SEO (max 60 caractères) incluant le nom du produit et ASWEK.",
  "seo_description": "Meta description SEO (max 155 caractères).",
  "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3"]
}
Le tableau "usage", "features", "advantages" et "keywords" doivent contenir au moins 2 éléments chacun (sauf si le produit ne s'y prête pas : alors un seul). Ne mets que des informations plausibles et prudentes.`;
}

/* ------------------------------------------------------------------ */
/* Appel HTTP générique                                                */
/* ------------------------------------------------------------------ */
function httpJson(url, payload) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(d); } catch (_) {}
        resolve({ status: res.statusCode, json, raw: d });
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, () => { req.destroy(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

async function tryModel(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048, responseMimeType: 'application/json' }
  };
  const { status, json, raw } = await httpJson(url, payload);
  if (status !== 200) {
    const msg = json && json.error ? json.error.message : raw.slice(0, 200);
    const err = new Error(`HTTP ${status}: ${msg}`);
    err.status = status;
    throw err;
  }
  const text = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  return text;
}

function extractJson(text) {
  let t = text.trim();
  t = t.replace(/^```(json)?/i, '').replace(/```$/,'').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

async function generate(p) {
  const prompt = buildPrompt(p);
  const models = [MODEL, ...FALLBACK_MODELS];
  let lastErr;
  for (const m of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await tryModel(m, prompt);
        const obj = extractJson(text);
        return { model: m, data: obj };
      } catch (e) {
        lastErr = e;
        if (e.status === 429 || e.status === 503) {
          await new Promise(r => setTimeout(r, 1500 * attempt));
          continue;
        }
        break; // modèle indisponible -> essayer le suivant
      }
    }
  }
  throw lastErr;
}

/* ------------------------------------------------------------------ */
/* Normalisation de la sortie                                          */
/* ------------------------------------------------------------------ */
function asArray(x, fallback) {
  if (Array.isArray(x)) return x.filter(Boolean);
  if (x == null) return fallback;
  return [String(x)];
}
function cleanStr(x) {
  return typeof x === 'string' ? x.trim() : '';
}

function normalize(obj, p) {
  const f = Array.isArray(obj.features)
    ? obj.features
        .map(x => ({ label: cleanStr(x.label), value: cleanStr(x.value) }))
        .filter(x => x.label && x.value)
    : [];
  return {
    definition: cleanStr(obj.definition),
    description: cleanStr(obj.description),
    usage: asArray(obj.usage, []),
    features: f,
    advantages: asArray(obj.advantages, []),
    howto: cleanStr(obj.howto),
    safety: cleanStr(obj.safety),
    seo_title: cleanStr(obj.seo_title) || (p.name + ' | ASWEK'),
    seo_description: cleanStr(obj.seo_description),
    keywords: asArray(obj.keywords, []),
    source: 'ai:google-gemini',
    generated_at: new Date().toISOString(),
    verified: false
  };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */
async function main() {
  if (!API_KEY) {
    console.error('ERREUR: la variable d\'environnement GEMINI_API_KEY est absente.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',').map(s => s.trim()).filter(Boolean) : null;

  const products = loadProducts();
  let store = { version: SCHEMA_VERSION, updated_at: null, products: {} };
  if (fs.existsSync(OUT_FILE)) {
    try { store = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); } catch (_) {}
    if (!store.products) store.products = {};
  }

  const targets = products.filter(p => {
    if (only) return only.includes(p.slug);
    if (force) return true;
    return !store.products[p.slug] || !store.products[p.slug].definition;
  });

  console.log(`Produits: ${products.length} | à générer: ${targets.length} | modèle: ${MODEL}`);

  let ok = 0, fail = 0;
  for (const p of targets) {
    process.stdout.write(`  [${p.id}] ${p.name} ... `);
    try {
      const { model, data } = await generate(p);
      store.products[p.slug] = { id: p.id, name: p.name, ...normalize(data, p) };
      ok++;
      console.log(`OK (${model})`);
    } catch (e) {
      fail++;
      console.log(`ÉCHEC: ${e.message}`);
    }
    // petite pause pour respecter les quotas
    await new Promise(r => setTimeout(r, 400));
  }

  store.updated_at = new Date().toISOString();
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(store, null, 2), 'utf8');
  console.log(`\nTerminé. Générés: ${ok}, échecs: ${fail}. Fichier: ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch(e => { console.error('Erreur fatale:', e); process.exit(1); });
