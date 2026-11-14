#!/usr/bin/env node
'use strict';
/*
 * Génère sitemap.xml + robots.txt à partir de js/data.js (source de vérité).
 * Usage :
 *   node scripts/generate-seo.js
 *   $env:SITE_URL="https://votre-domaine.tn"; node scripts/generate-seo.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SITE = (process.env.SITE_URL || 'https://aswek.net').replace(/\/+$/, '');
const TODAY = new Date().toISOString().slice(0, 10);

function load() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8') + '\n;__O__={PRODUCTS,CATEGORIES};';
  const sb = { console };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  return sb.__O__;
}

const xmlEsc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function url(loc, lastmod, changefreq, priority) {
  return `  <url>\n    <loc>${xmlEsc(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function main() {
  const { PRODUCTS, CATEGORIES } = load();
  const urls = [];
  const seen = new Set();
  const add = (loc, prio, freq) => {
    if (!loc || seen.has(loc)) return;
    seen.add(loc);
    urls.push({ loc, prio, freq });
  };

  add(SITE + '/', '1.0', 'weekly');
  add(SITE + '/shop.html', '0.9', 'weekly');
  add(SITE + '/guides.html', '0.7', 'monthly');

  const catSeen = new Set();
  CATEGORIES.forEach(c => {
    const addCat = (u, kind) => {
      if (!u || u === '#' || !u.includes('c=')) return;
      const id = u.split('c=')[1];
      if (catSeen.has(id)) return;
      catSeen.add(id);
      add(SITE + '/' + u, kind === 'root' ? '0.8' : '0.65', 'weekly');
    };
    addCat(c.url, 'root');
    c.groups.forEach(g => addCat(g.url, 'group'));
  });

  PRODUCTS.forEach(p => {
    if (!p || !p.slug) return;
    add(SITE + '/product.html?p=' + encodeURIComponent(p.slug), '0.7', 'monthly');
  });

  const body = urls.map(u => url(u.loc, TODAY, u.freq, u.prio)).join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /search.html',
    'Disallow: /wishlist.html',
    // /data/ DOIT rester explorable : les meta title/description, H1 et alt des
    // fiches produits et categories sont injectes par JS depuis data/ai/*.json.
    // Un blocage empecherait Googlebot de rendre correctement ces pages.
    // Seul le dossier d administration (brouillons, notes internes) est exclu.
    'Disallow: /data/admin/',
    'Disallow: /scripts/',
    'Disallow: /tools/',
    'Disallow: /admin/',
    '',
    'Sitemap: ' + SITE + '/sitemap.xml',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf8');

  console.log(`sitemap.xml : ${urls.length} URLs`);
  console.log(`robots.txt  : ${SITE}/sitemap.xml`);
  console.log(`produits    : ${PRODUCTS.length} | catégories : ${catSeen.size}`);
}

main();
