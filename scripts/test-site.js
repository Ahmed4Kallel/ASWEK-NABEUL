#!/usr/bin/env node
'use strict';
/*
 * Suite de non-regression ASWEK (Puppeteer).
 *
 *   node server.js                        # http://127.0.0.1:8099
 *   node tools/admin-server.js            # http://127.0.0.1:8299/admin/
 *   node scripts/test-site.js             # tout
 *   node scripts/test-site.js seo search  # sous-ensemble
 *
 * Variables d'environnement (optionnelles) :
 *   SITE_URL       base du site public   (defaut http://127.0.0.1:8099)
 *   ADMIN_URL      base de l'admin local (defaut http://127.0.0.1:8299)
 *   ADMIN_PASSWORD mot de passe admin    (defaut test-aswek-2026)
 *   PUPPETEER_DIR  dossier node_modules contenant puppeteer-core
 *   CHROME_PATH    chemin de l'executable Chrome
 */
const fs = require('fs');
const path = require('path');

const SITE = process.env.SITE_URL || 'http://127.0.0.1:8099';
const ADMIN = process.env.ADMIN_URL || 'http://127.0.0.1:8299';
const PWD = process.env.ADMIN_PASSWORD || 'test-aswek-2026';
const PUPPETEER_DIR = process.env.PUPPETEER_DIR || 'C:/Users/GIGABYTE/AppData/Local/Temp/node_modules';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let puppeteer;
try { puppeteer = require(path.join(PUPPETEER_DIR, 'puppeteer-core')); }
catch (e) {
  console.error('puppeteer-core introuvable dans ' + PUPPETEER_DIR);
  console.error('Definissez PUPPETEER_DIR (dossier node_modules) ou installez puppeteer-core.');
  process.exit(2);
}
if (!fs.existsSync(CHROME)) { console.error('Chrome introuvable : ' + CHROME); process.exit(2); }

const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);

const results = [];
function check(group, label, ok, detail) {
  results.push({ group, label, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
  console.log((ok ? '  OK   ' : '  ECHEC') + ' ' + label + (detail !== undefined ? '  -> ' + detail : ''));
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function withPage(fn) {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try { return await fn(browser); }
  finally { await browser.close(); }
}

/* ---------------------------------------------------------------- SEO */
async function suiteSeo() {
  console.log('\n=== SEO / donnees structurees ===');
  await withPage(async (browser) => {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    // pages statiques
    for (const f of ['index.html', 'shop.html', 'guides.html']) {
      await page.goto(SITE + '/' + f, { waitUntil: 'networkidle2' });
      await sleep(700);
      const r = await page.evaluate(() => ({
        t: document.title,
        d: (document.querySelector('meta[name="description"]') || {}).content || '',
        can: (document.querySelector('link[rel="canonical"]') || {}).href || '',
        robots: (document.querySelector('meta[name="robots"]') || {}).content || '',
        ld: !!document.getElementById('ldOrganization')
      }));
      check('seo', f + ' : title', /ASWEK/.test(r.t), r.t);
      check('seo', f + ' : meta description', r.d.length > 40, r.d.length + ' car.');
      check('seo', f + ' : canonical', /^https?:\/\/.+\//.test(r.can), r.can);
      check('seo', f + ' : indexable', /index/.test(r.robots), r.robots);
      check('seo', f + ' : JSON-LD Organization', r.ld);
    }

    // pages non indexables
    for (const f of ['search.html', 'wishlist.html']) {
      await page.goto(SITE + '/' + f, { waitUntil: 'networkidle2' });
      await sleep(400);
      const robots = await page.evaluate(() => (document.querySelector('meta[name="robots"]') || {}).content || '');
      check('seo', f + ' : noindex', /noindex/.test(robots), robots);
    }

    // fiche produit
    await page.goto(SITE + '/product.html?p=aswek-resine-epoxy-3d', { waitUntil: 'networkidle2' });
    await sleep(1800);
    const p = await page.evaluate(() => {
      const m = n => (document.querySelector(`meta[name="${n}"]`) || {}).content;
      const ld = JSON.parse(document.getElementById('productJsonLd').textContent);
      return {
        title: document.title, desc: m('description'), ldDesc: ld.description,
        sku: ld.sku, price: ld.offers && ld.offers.price, cur: ld.offers && ld.offers.priceCurrency,
        can: (document.querySelector('link[rel="canonical"]') || {}).href,
        h1: (document.querySelector('.product-title-h1') || {}).textContent || '',
        alt: (document.querySelector('.product-main-img img') || {}).alt || '',
        crumbs: !!document.getElementById('ldBreadcrumb'),
        rating: ld.aggregateRating
      };
    });
    check('seo', 'produit : title <= 70', p.title.length > 0 && p.title.length <= 70, p.title.length + ' car.');
    check('seo', 'produit : description 70-300', p.desc.length >= 70 && p.desc.length <= 300, p.desc.length + ' car.');
    check('seo', 'produit : meta desc = JSON-LD desc', p.desc === p.ldDesc);
    check('seo', 'produit : canonical', /product\.html\?p=aswek-resine-epoxy-3d$/.test(p.can), p.can);
    check('seo', 'produit : SKU present', !!p.sku, p.sku);
    check('seo', 'produit : Offer prix + devise', !!p.price && p.cur === 'TND', p.price + ' ' + p.cur);
    check('seo', 'produit : H1 present', !!p.h1, p.h1);
    check('seo', 'produit : alt present', !!p.alt);
    check('seo', 'produit : BreadcrumbList', p.crumbs);
    check('seo', 'produit : pas d AggregateRating (rating 0)', !p.rating);

    // meta description identique au JSON-LD sur tous les produits
    let incoherents = 0;
    const slugs = await page.evaluate(() => PRODUCTS.map(x => x.slug));
    for (const s of slugs.slice(0, 12)) {
      await page.goto(SITE + '/product.html?p=' + s, { waitUntil: 'networkidle2' });
      await sleep(1100);
      const ok = await page.evaluate(() => {
        const m = (document.querySelector('meta[name="description"]') || {}).content || '';
        const ld = JSON.parse(document.getElementById('productJsonLd').textContent);
        return !!m && m === ld.description;
      });
      if (!ok) incoherents++;
    }
    check('seo', 'meta desc = JSON-LD desc sur 12 produits', incoherents === 0, incoherents + ' incoherence(s)');

    check('seo', 'aucune erreur JS', errors.length === 0, errors.join(' | '));
  });
}

/* ------------------------------------------------------------ categories */
async function suiteCategories() {
  console.log('\n=== Categories / URL invalides ===');
  await withPage(async (browser) => {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(SITE + '/category.html?c=les-resines', { waitUntil: 'networkidle2' });
    await sleep(900);
    const ok = await page.evaluate(() => ({
      robots: (document.querySelector('meta[name="robots"]') || {}).content || '',
      ld: !!document.getElementById('ldCategory'),
      can: (document.querySelector('link[rel="canonical"]') || {}).href || ''
    }));
    check('cat', 'categorie valide : indexable', /index/.test(ok.robots), ok.robots);
    check('cat', 'categorie valide : JSON-LD CollectionPage', ok.ld);
    check('cat', 'categorie valide : canonical', /c=les-resines$/.test(ok.can), ok.can);

    for (const c of ['xxx', 'null', '', '../../etc/passwd']) {
      await page.goto(SITE + '/category.html?c=' + encodeURIComponent(c), { waitUntil: 'networkidle2' });
      await sleep(800);
      const r = await page.evaluate(() => ({
        robots: (document.querySelector('meta[name="robots"]') || {}).content || '',
        can: (document.querySelector('link[rel="canonical"]') || {}).href || ''
      }));
      check('cat', 'categorie invalide "' + c + '" : noindex', /noindex/.test(r.robots), r.robots);
      check('cat', 'categorie invalide "' + c + '" : canonical boutique', /shop\.html$/.test(r.can), r.can);
    }

    await page.goto(SITE + '/category.html', { waitUntil: 'networkidle2' });
    await sleep(800);
    const bare = await page.evaluate(() => (document.querySelector('meta[name="robots"]') || {}).content || '');
    check('cat', 'category.html sans parametre : noindex', /noindex/.test(bare), bare);

    check('cat', 'aucune erreur JS', errors.length === 0, errors.join(' | '));
  });
}

/* --------------------------------------------------------------- recherche */
async function suiteSearch() {
  console.log('\n=== Recherche multilingue ===');
  await withPage(async (browser) => {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    const cases = [
      ['FR', 'resine epoxy', 'aswek-resine-epoxy-3d'],
      ['FR', 'risine epoxy', 'aswek-resine-epoxy-3d'],
      ['FR', 'ipoxi', 'aswek-resine-epoxy-3d'],
      ['FR', 'diluant 4l', 'aswek-diluant-4l'],
      ['EN', 'epoxy resin', 'aswek-resine-epoxy-3d'],
      ['EN', 'thinner 4 l', 'aswek-diluant-4l'],
      ['EN', 'pool chlorine', 'aswek-chlore-choc-5-kg'],
      ['AR', 'تنر 4 لتر', 'aswek-diluant-4l']
    ];
    for (const [lang, q, expected] of cases) {
      await page.goto(SITE + '/search.html?s=' + encodeURIComponent(q), { waitUntil: 'networkidle2' });
      await sleep(1500);
      const slugs = await page.evaluate(() =>
        [...document.querySelectorAll('#searchGrid a[href*="product.html?p="]')].map(a => a.getAttribute('href').split('p=').pop()));
      check('search', '[' + lang + '] "' + q + '" trouve ' + expected, slugs.includes(expected), slugs.slice(0, 3).join(', '));
    }

    await page.goto(SITE + '/search.html?s=zzzzqqxx', { waitUntil: 'networkidle2' });
    await sleep(1200);
    const empty = await page.evaluate(() => !!document.querySelector('.empty-state'));
    check('search', 'etat vide affiche', empty);
    check('search', 'aucune erreur JS', errors.length === 0, errors.join(' | '));
  });
}

/* --------------------------------------------------------------- admin */
async function suiteAdmin() {
  console.log('\n=== Administration locale ===');
  let cookie = '';
  try {
    const login = await fetch(ADMIN + '/admin/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PWD })
    });
    if (!login.ok) throw new Error('HTTP ' + login.status);
    const sc = login.headers.getSetCookie ? login.headers.getSetCookie() : [];
    cookie = sc.length ? sc[0].split(';')[0] : '';
    check('admin', 'connexion', login.status === 200);
  } catch (e) {
    check('admin', 'connexion', false, e.message + ' (admin demarre ? tools/admin-server.js)');
    return;
  }

  const dash = await (await fetch(ADMIN + '/admin/api/dashboard', { headers: { Cookie: cookie } })).json();
  const c = dash.counts || dash.totals || dash;
  check('admin', 'dashboard : 44 produits', c.products === 44, JSON.stringify(c).slice(0, 130));
  check('admin', 'dashboard : 20 categories', c.categories === 20, JSON.stringify(c).slice(0, 130));

  const list = await (await fetch(ADMIN + '/admin/api/products', { headers: { Cookie: cookie } })).json();
  const n = (list.products || list.items || []).length;
  check('admin', 'liste produits', n === 44, n + ' produits');

  const prod = await (await fetch(ADMIN + '/admin/api/product?slug=aswek-resine-epoxy-3d', { headers: { Cookie: cookie } })).json();
  check('admin', 'detail produit', !!(prod.product || prod.slug), Object.keys(prod).join(',').slice(0, 80));

  const bad = await fetch(ADMIN + '/admin/api/dashboard');
  check('admin', 'acces refuse sans session', bad.status === 401 || bad.status === 403, 'HTTP ' + bad.status);

  await withPage(async (browser) => {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(ADMIN + '/admin/', { waitUntil: 'networkidle2' });
    await sleep(800);
    const hasLogin = await page.evaluate(() => !!document.getElementById('loginForm'));
    check('admin', 'ecran de connexion', hasLogin);
    const inp = await page.$('input[type=password]');
    if (inp) {
      await inp.type(PWD);
      await page.keyboard.press('Enter');
      await sleep(2500);
    }
    const logged = await page.evaluate(() => {
      const l = document.getElementById('login');
      const a = document.getElementById('app');
      return !!l && !!a && l.classList.contains('hidden') && !a.classList.contains('hidden');
    });
    check('admin', 'session ouverte dans l interface', logged);
    check('admin', 'aucune erreur JS', errors.length === 0, errors.join(' | '));
  });
}

/* ------------------------------------------------- cycle de publication */
async function suiteOverrides() {
  console.log('\n=== Surcharges : cycle de publication ===');
  let cookie = '';
  try {
    const login = await fetch(ADMIN + '/admin/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PWD })
    });
    const sc = login.headers.getSetCookie ? login.headers.getSetCookie() : [];
    cookie = sc.length ? sc[0].split(';')[0] : '';
  } catch (e) { check('override', 'connexion admin', false, e.message); return; }

  const save = (section, slug, value) => fetch(ADMIN + '/admin/api/save-overrides', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ section, slug, value })
  });

  const slug = 'aswek-resine-epoxy-3d';
  const title = 'Titre de validation automatisee';
  const desc = 'Description de validation automatisee pour la fiche produit, suffisamment longue pour passer les controles de longueur SEO du site.';
  const definition = 'DEFINITION DE VALIDATION AUTOMATISEE pour la fiche produit.';
  const r1 = await save('seo', slug, { seo_title: title, seo_desc: desc, h1: 'H1 valide', alt_main: 'alt valide', keywords: ['alpha', 'beta'] });
  check('override', 'enregistrement surcharge SEO', r1.status === 200, 'HTTP ' + r1.status);
  const r2 = await save('descriptions', slug, { status: 'approved', definition, advantages: ['Avantage valide'], note: 'ne doit pas etre publie' });
  check('override', 'enregistrement description', r2.status === 200, 'HTTP ' + r2.status);

  const applied = await (await fetch(ADMIN + '/admin/api/apply', { method: 'POST', headers: { Cookie: cookie } })).json();
  check('override', 'compilation', applied.ok === true, JSON.stringify(applied.counts || {}));

  await withPage(async (browser) => {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(SITE + '/product.html?p=' + slug, { waitUntil: 'networkidle2' });
    await sleep(2200);
    const r = await page.evaluate(() => {
      const m = n => (document.querySelector(`meta[name="${n}"]`) || {}).content;
      const ld = JSON.parse(document.getElementById('productJsonLd').textContent);
      return {
        title: document.title, desc: m('description'), h1: (document.querySelector('.product-title-h1') || {}).textContent,
        alt: (document.querySelector('.product-main-img img') || {}).alt,
        kw: m('keywords'), ldDesc: ld.description,
        def: (document.getElementById('aiDefinition') || {}).textContent || ''
      };
    });
    check('override', 'title surcharge applique', r.title === title, r.title);
    check('override', 'description surcharge appliquee', r.desc === desc);
    check('override', 'JSON-LD aligne sur la surcharge', r.ldDesc === desc);
    check('override', 'H1 surcharge applique', r.h1 === 'H1 valide', r.h1);
    check('override', 'alt surcharge applique', r.alt === 'alt valide', r.alt);
    check('override', 'mots-cles surcharge applique', /alpha/.test(r.kw || ''), r.kw);
    check('override', 'description validee publiee', /DEFINITION DE VALIDATION/.test(r.def));
    check('override', 'note interne non publiee', !/ne doit pas etre publie/.test(r.def));
    check('override', 'aucune erreur JS', errors.length === 0, errors.join(' | '));
  });

  // reinitialisation
  await save('seo', slug, null);
  await save('descriptions', slug, null);
  await fetch(ADMIN + '/admin/api/apply', { method: 'POST', headers: { Cookie: cookie } });

  await withPage(async (browser) => {
    const page = await browser.newPage();
    await page.goto(SITE + '/product.html?p=' + slug, { waitUntil: 'networkidle2' });
    await sleep(2000);
    const r = await page.evaluate(() => ({
      def: (document.getElementById('aiDefinition') || {}).textContent || '',
      title: document.title
    }));
    check('override', 'reset : surcharge retiree', !/DEFINITION DE VALIDATION/.test(r.def), r.title);
  });
}

/* ---------------------------------------------------------------- deploy */
async function suiteDeploy() {
  console.log('\n=== Deploiement / SEO technique ===');
  const robots = await (await fetch(SITE + '/robots.txt')).text();
  check('deploy', 'robots.txt : /data/ explorable', !/^Disallow:\s*\/data\/\s*$/m.test(robots), 'meta injectes par JS depuis data/ai/*.json');
  check('deploy', 'robots.txt : /data/admin/ bloque', /^Disallow:\s*\/data\/admin\/$/m.test(robots));
  check('deploy', 'robots.txt : /search.html bloque', /search\.html/.test(robots));
  check('deploy', 'robots.txt : /wishlist.html bloque', /wishlist\.html/.test(robots));
  check('deploy', 'robots.txt : sitemap reference', /Sitemap:\s*\S+/.test(robots));

  const sm = await (await fetch(SITE + '/sitemap.xml')).text();
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  check('deploy', 'sitemap : 67 URLs', locs.length === 67, locs.length + ' URLs');
  check('deploy', 'sitemap : pas de categorie sans c=', locs.filter(l => l.includes('category.html') && !l.includes('c=')).length === 0);
  check('deploy', 'sitemap : pas de produit sans p=', locs.filter(l => l.includes('product.html') && !l.includes('p=')).length === 0);
  check('deploy', 'sitemap : pas de search/wishlist', !locs.some(l => /search\.html|wishlist\.html/.test(l)));

  const files = ['/data/ai/seo-alt.json', '/data/ai/category-seo.json', '/data/ai/overrides-applied.json', '/data/product-content.json'];
  for (const f of files) {
    const r = await fetch(SITE + f);
    check('deploy', 'accessible ' + f, r.ok, 'HTTP ' + r.status);
  }
}

/* ------------------------------------------------------------------ main */
(async () => {
  console.log('ASWEK - suite de non-regression');
  console.log('site  : ' + SITE);
  console.log('admin : ' + ADMIN);
  const suites = [
    ['seo', suiteSeo], ['cat', suiteCategories], ['search', suiteSearch],
    ['admin', suiteAdmin], ['override', suiteOverrides], ['deploy', suiteDeploy]
  ];
  for (const [name, fn] of suites) {
    if (!want(name)) continue;
    try { await fn(); }
    catch (e) { check(name, 'exception', false, e.message); }
  }
  const failed = results.filter(r => !r.ok);
  console.log('\n=============================================');
  console.log('total : ' + results.length + ' | reussis : ' + (results.length - failed.length) + ' | echecs : ' + failed.length);
  if (failed.length) {
    console.log('\nEchecs :');
    failed.forEach(f => console.log('  - [' + f.group + '] ' + f.label + (f.detail ? '  -> ' + f.detail : '')));
  }
  console.log('=============================================');
  process.exit(failed.length ? 1 : 0);
})();
