#!/usr/bin/env node
'use strict';
/*
 * Librairie de compilation des surcharges admin (partagee par le script CLI et
 * le serveur local). Aucune dependance externe.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function loadProducts(root) {
  const code = fs.readFileSync(path.join(root, 'js', 'data.js'), 'utf8') + '\n;__O__={PRODUCTS,CATEGORIES};';
  const sb = { console };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  return sb.__O__;
}

const cleanList = (v) => {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map(x => String(x || '').trim()).filter(Boolean))];
};

/**
 * Compile data/admin/overrides.json -> data/ai/overrides-applied.json
 * @returns {{out:object, warnings:string[], counts:object}}
 */
function compile(root, opts) {
  const options = opts || {};
  const SRC = path.join(root, 'data', 'admin', 'overrides.json');
  const OUT = path.join(root, 'data', 'ai', 'overrides-applied.json');
  const { PRODUCTS } = loadProducts(root);
  const slugs = new Set(PRODUCTS.map(p => p.slug));

  let src = { seo: {}, synonyms: {}, descriptions: {} };
  try { src = JSON.parse(fs.readFileSync(SRC, 'utf8')) || src; } catch (e) {
    return { out: null, warnings: ['overrides.json illisible : ' + e.message], counts: {} };
  }

  const warnings = [];
  const out = { updated_at: new Date().toISOString(), source: 'data/admin/overrides.json', seo: {}, synonyms: {}, descriptions: {} };

  Object.keys(src.seo || {}).forEach(slug => {
    if (!slugs.has(slug)) { warnings.push('SEO : slug inconnu -> ' + slug); return; }
    const s = src.seo[slug] || {};
    const entry = {};
    if (s.seo_title && String(s.seo_title).trim()) entry.seo_title = String(s.seo_title).trim().slice(0, 70);
    if (s.seo_desc && String(s.seo_desc).trim()) entry.seo_desc = String(s.seo_desc).trim().slice(0, 320);
    if (s.h1 && String(s.h1).trim()) entry.h1 = String(s.h1).trim().slice(0, 90);
    if (s.alt_main && String(s.alt_main).trim()) entry.alt_main = String(s.alt_main).trim().slice(0, 160);
    const kw = cleanList(s.keywords);
    if (kw.length) entry.keywords = kw.slice(0, 12);
    if (Object.keys(entry).length) out.seo[slug] = entry;
    else warnings.push('SEO : surcharge vide -> ' + slug);
  });

  Object.keys(src.synonyms || {}).forEach(slug => {
    if (!slugs.has(slug)) { warnings.push('Synonymes : slug inconnu -> ' + slug); return; }
    const s = src.synonyms[slug] || {};
    const entry = {};
    ['fr', 'ar', 'en'].forEach(lang => {
      const list = cleanList(s[lang]);
      if (list.length) entry[lang] = list.slice(0, 20);
    });
    if (Object.keys(entry).length) out.synonyms[slug] = entry;
    else warnings.push('Synonymes : surcharge vide -> ' + slug);
  });

  Object.keys(src.descriptions || {}).forEach(slug => {
    if (!slugs.has(slug)) { warnings.push('Description : slug inconnu -> ' + slug); return; }
    const d = src.descriptions[slug] || {};
    const status = ['approved', 'draft', 'rejected'].includes(d.status) ? d.status : 'draft';
    const text = String(d.definition || '').trim();
    if (!text) { warnings.push('Description : texte vide -> ' + slug); return; }
    // la note de validation reste dans data/admin/overrides.json (usage interne)
    const entry = { status: status, definition: text.slice(0, 4000) };
    const adv = cleanList(d.advantages);
    if (adv.length) entry.advantages = adv.slice(0, 10);
    out.descriptions[slug] = entry;
  });

  const counts = {
    seo: Object.keys(out.seo).length,
    synonyms: Object.keys(out.synonyms).length,
    descriptions: Object.keys(out.descriptions).length,
    approved: Object.values(out.descriptions).filter(d => d.status === 'approved').length
  };

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const tmp = OUT + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(out, null, 2), 'utf8');
    fs.renameSync(tmp, OUT);
  }
  return { out, warnings, counts };
}

module.exports = { compile, loadProducts, cleanList, ROOT };
