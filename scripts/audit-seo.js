#!/usr/bin/env node
'use strict';
/*
 * Audit SEO / indexabilite / donnees structurees (sans navigateur).
 * Produit un rapport JSON + un resume console.
 *
 *   node scripts/audit-seo.js            # rapport complet
 *   node scripts/audit-seo.js --json     # JSON seul
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const JSON_ONLY = process.argv.includes('--json');

function loadProducts() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8') + '\n;__O__={PRODUCTS,CATEGORIES};';
  const sb = { console };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  return sb.__O__;
}
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch (e) { return null; } };

function main() {
  const { PRODUCTS, CATEGORIES } = loadProducts();
  const seoAlt = readJson('data/ai/seo-alt.json') || {};
  const seoItems = seoAlt.items || {};
  const content = readJson('data/product-content.json') || {};
  const contentItems = content.products || {};
  const smart = readJson('data/ai/smart-search.json') || {};
  const smartItems = Array.isArray(smart.items) ? smart.items : Object.values(smart.items || {});
  const i18n = readJson('data/ai/search-i18n.json') || {};
  const catSeo = readJson('data/ai/category-seo.json') || {};
  const catSeoItems = catSeo.items || {};
  const overrides = readJson('data/ai/overrides-applied.json') || {};
  const ovSeo = overrides.seo || {};
  const ovSyn = overrides.synonyms || {};
  const ovDesc = overrides.descriptions || {};

  const sitemap = fs.existsSync(path.join(ROOT, 'sitemap.xml')) ? fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8') : '';
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

  const seoOf = (slug) => Object.assign({}, seoItems[slug] || {}, ovSeo[slug] || {});
  const synOf = (slug) => {
    const base = smartItems.find(x => x.slug === slug) || {};
    const it = (i18n.items || {})[slug] || {};
    return {
      fr: (base.synonyms || []).length,
      ar: (it.ar || []).length,
      en: (it.en || []).length,
      extra: Object.assign({}, ovSyn[slug] || {})
    };
  };

  const issues = { products: [], categories: [], site: [] };

  PRODUCTS.forEach(p => {
    const list = [];
    const s = seoOf(p.slug);
    const c = contentItems[p.slug] || {};
    const syn = synOf(p.slug);

    if (!s.seo_title) list.push('meta title manquant');
    else if (s.seo_title.length > 70) list.push('meta title trop long (' + s.seo_title.length + ')');
    if (!s.seo_desc) list.push('meta description manquante');
    else if (s.seo_desc.length < 70) list.push('meta description courte (' + s.seo_desc.length + ')');
    else if (s.seo_desc.length > 300) list.push('meta description trop longue');
    if (!s.h1) list.push('H1 manquant');
    if (!s.alt_main) list.push('alt image principale manquant');
    if (!s.keywords || s.keywords.length < 3) list.push('mots-clés secondaires insuffisants');
    if (!c.definition) list.push('description IA manquante');
    if (syn.fr < 3) list.push('synonymes FR insuffisants (' + syn.fr + ')');
    if (syn.ar < 3) list.push('synonymes AR insuffisants (' + syn.ar + ')');
    if (syn.en < 3) list.push('synonymes EN insuffisants (' + syn.en + ')');
    if (!p.priceFrom && !p.priceTo) list.push('prix absent (Offer sans prix)');
    if (!p.stock) list.push('disponibilité absente');
    if (!p.img || !fs.existsSync(path.join(ROOT, p.img))) list.push('image principale introuvable');
    (p.gallery || []).forEach(g => { if (!fs.existsSync(path.join(ROOT, g))) list.push('galerie : ' + g + ' introuvable'); });
    if (!p.sku) list.push('SKU absent (utilisé aswek-<id>)');
    if (!sitemapUrls.includes('https://aswek.net/product.html?p=' + p.slug)) list.push('absent du sitemap');

    if (list.length) issues.products.push({ slug: p.slug, name: p.name, category: (p.cat || []).filter(c2 => c2 !== 'aswek').join(','), issues: list });
  });

  const catIds = [];
  CATEGORIES.forEach(c => {
    if (c.url && c.url.includes('c=')) catIds.push({ id: c.url.split('c=')[1], name: c.name });
    c.groups.forEach(g => { if (g.url && g.url.includes('c=')) catIds.push({ id: g.url.split('c=')[1], name: g.name, parent: c.name }); });
  });
  catIds.forEach(c => {
    const list = [];
    const s = catSeoItems[c.id] || {};
    if (!s.title) list.push('meta title manquant');
    if (!s.description) list.push('meta description manquante');
    if (!s.h1) list.push('H1 manquant');
    if (!s.keywords || !s.keywords.length) list.push('mots-clés manquants');
    if (!sitemapUrls.includes('https://aswek.net/category.html?c=' + c.id)) list.push('absent du sitemap');
    if (list.length) issues.categories.push({ id: c.id, name: c.name, parent: c.parent || '', issues: list });
  });

  // pages du site
  const pageFiles = ['index.html', 'shop.html', 'category.html', 'product.html', 'guides.html', 'search.html', 'wishlist.html'];
  pageFiles.forEach(f => {
    if (!fs.existsSync(path.join(ROOT, f))) issues.site.push('page manquante : ' + f);
  });
  if (!sitemapUrls.includes('https://aswek.net/')) issues.site.push('accueil absent du sitemap');
  if (!sitemapUrls.includes('https://aswek.net/shop.html')) issues.site.push('boutique absente du sitemap');
  if (!sitemapUrls.includes('https://aswek.net/guides.html')) issues.site.push('guides absents du sitemap');
  if (sitemapUrls.some(u => u.includes('search.html'))) issues.site.push('page de recherche presente dans le sitemap');
  if (sitemapUrls.some(u => u.includes('wishlist.html'))) issues.site.push('page favoris presente dans le sitemap');

  // doublons
  const seenName = {};
  const duplicates = [];
  PRODUCTS.forEach(p => {
    const k = (p.name || '').toLowerCase().trim();
    if (seenName[k]) duplicates.push(p.name + ' / ' + seenName[k]); else seenName[k] = p.name;
  });
  const seenSlug = {};
  PRODUCTS.forEach(p => { if (seenSlug[p.slug]) duplicates.push('slug dupliqué : ' + p.slug); seenSlug[p.slug] = 1; });

  const report = {
    generated_at: new Date().toISOString(),
    totals: {
      products: PRODUCTS.length,
      categories: catIds.length,
      products_with_issues: issues.products.length,
      categories_with_issues: issues.categories.length,
      sitemap_urls: sitemapUrls.length,
      duplicates: duplicates.length
    },
    issues: issues,
    duplicates: duplicates,
    missing_images: issues.products.filter(p => p.issues.some(i => i.includes('introuvable'))).map(p => p.slug)
  };

  if (JSON_ONLY) { console.log(JSON.stringify(report, null, 2)); return; }
  console.log('=== AUDIT SEO ASWEK ===');
  console.log('Produits :', report.totals.products, '| Categories :', report.totals.categories);
  console.log('Produits avec problemes :', report.totals.products_with_issues);
  console.log('Categories avec problemes :', report.totals.categories_with_issues);
  console.log('URLs sitemap :', report.totals.sitemap_urls, '| doublons :', report.totals.duplicates);
  if (issues.site.length) { console.log('\nProblemes site :'); issues.site.forEach(i => console.log(' - ' + i)); }
  if (issues.products.length) {
    console.log('\nDetail produits :');
    issues.products.slice(0, 40).forEach(p => console.log(' - ' + p.name + ' : ' + p.issues.join(' ; ')));
  }
  if (issues.categories.length) {
    console.log('\nDetail categories :');
    issues.categories.forEach(c => console.log(' - ' + c.name + ' : ' + c.issues.join(' ; ')));
  }
  fs.writeFileSync(path.join(ROOT, 'data', 'admin', 'audit-report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log('\nRapport : data/admin/audit-report.json');
}

main();
