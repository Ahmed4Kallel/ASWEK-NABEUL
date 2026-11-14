/* ASWEK — SEO technique : canonical, robots, données structurées, métadonnées catégories */
(function () {
  'use strict';

  const ORIGIN = location.origin && location.origin !== 'null' ? location.origin : 'https://aswek.net';
  const SEO_DIR = 'data/ai/';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const sanitize = (t) => {
    const s = String(t || '')
      .replace(/^\s*(Achat|Achetez|Commandez|Découvrez)\s+(de\s+|des\s+|du\s+|la\s+|le\s+|les\s+)?/i, '')
      .replace(/\s*\|\s*(Prix(\s+et\s+Achat)?|Achat)\s*$/i, '')
      .replace(/\sau meilleur prix/gi, '')
      .trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  };

  function setMeta(name, content, attr) {
    if (!content) return;
    const a = attr || 'name';
    let el = document.querySelector(`meta[${a}="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute(a, name); document.head.appendChild(el); }
    el.setAttribute('content', content);
  }
  function setLink(rel, href) {
    if (!href) return;
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
    el.setAttribute('href', href);
  }
  function addJsonLd(id, obj) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
    el.textContent = JSON.stringify(obj);
  }
  const abs = (p) => p ? new URL(p, ORIGIN + '/').href : '';

  function pageType() {
    const f = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (f === '' || f === 'index.html') return 'home';
    if (f === 'shop.html') return 'shop';
    if (f === 'category.html') return 'category';
    if (f === 'product.html') return 'product';
    if (f === 'guides.html') return 'guides';
    if (f === 'search.html') return 'search';
    if (f === 'wishlist.html') return 'wishlist';
    return 'other';
  }

  function canonicalFor(type) {
    const params = new URLSearchParams(location.search);
    if (type === 'product') {
      let slug = params.get('p');
      try { if (!slug && typeof product !== 'undefined' && product) slug = product.slug; } catch (e) {}
      // on canonise vers le slug reellement resolu : un ?p=invalide ne doit pas
      // creer une page dupliquee indexable du premier produit du catalogue
      try {
        if (typeof findProduct === 'function') {
          const resolved = findProduct(slug);
          if (resolved && resolved.slug) slug = resolved.slug;
        }
      } catch (e) {}
      return ORIGIN + '/product.html' + (slug ? '?p=' + encodeURIComponent(slug) : '');
    }
    if (type === 'category') {
      const c = params.get('c');
      return ORIGIN + '/category.html' + (c ? '?c=' + encodeURIComponent(c) : '');
    }
    if (type === 'home') return ORIGIN + '/';
    const f = location.pathname.split('/').pop() || 'index.html';
    return ORIGIN + '/' + f;
  }

  function cleanUrl(type, canonical) {
    try {
      if (type === 'product' || type === 'category') {
        const clean = canonical.replace(ORIGIN, '');
        if (location.pathname + location.search !== clean) history.replaceState(null, '', clean);
      }
    } catch (e) {}
  }

  function applyBasics(type, canonical) {
    setLink('canonical', canonical);
    setMeta('og:url', canonical, 'property');
    if (type === 'search' || type === 'wishlist') {
      setMeta('robots', 'noindex,follow');
    } else {
      setMeta('robots', 'index,follow,max-image-preview:large');
    }
  }

  function siteSchemas(type, canonical) {
    const org = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': ORIGIN + '/#organization',
      name: 'ASWEK',
      url: ORIGIN + '/',
      logo: abs('images/ASWEQQ.png'),
      image: abs('images/ASWEQQ.png'),
      description: 'ASWEK — résines époxy, silicones, pigments, produits piscine et étanchéité en Tunisie.',
      address: { '@type': 'PostalAddress', addressLocality: 'Reva', addressCountry: 'TN' },
      sameAs: [
        'https://www.facebook.com/profile.php?id=100063645544794',
        'https://wa.me/21629170566'
      ]
    };
    addJsonLd('ldOrganization', org);

    if (type === 'home') {
      addJsonLd('ldWebsite', {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': ORIGIN + '/#website',
        url: ORIGIN + '/',
        name: 'ASWEK',
        inLanguage: 'fr-TN',
        publisher: { '@id': ORIGIN + '/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: ORIGIN + '/search.html?s={search_term_string}' },
          'query-input': 'required name=search_term_string'
        }
      });
    }
  }

  function productSchema(canonical) {
    let p = null;
    try { p = (typeof product !== 'undefined' && product) ? product : (typeof findProduct === 'function' ? findProduct(new URLSearchParams(location.search).get('p')) : null); } catch (e) {}
    if (!p) return;

    const imgList = [p.img, ...(p.gallery || [])].filter(Boolean).map(abs);
    const offers = p.priceFrom
      ? {
          '@type': 'Offer',
          url: canonical,
          priceCurrency: p.cur || 'TND',
          price: String(p.priceFrom),
          priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10),
          availability: p.stock && /rupture|indisponible/i.test(p.stock) ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: 'ASWEK' }
        }
      : { '@type': 'Offer', url: canonical, availability: 'https://schema.org/InStock', seller: { '@type': 'Organization', name: 'ASWEK' } };

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': canonical + '#product',
      name: p.name,
      url: canonical,
      image: imgList,
      description: (document.querySelector('meta[name="description"]') || {}).content || p.short || p.name,
      sku: p.sku || ('aswek-' + p.id),
      brand: { '@type': 'Brand', name: 'ASWEK' },
      category: (p.cat || []).map(c => c.replace(/-/g, ' ')).join(' > '),
      offers: offers
    };
    if (p.rating > 0) {
      schema.aggregateRating = { '@type': 'AggregateRating', ratingValue: String(p.rating), bestRating: '5', ratingCount: String(Math.max(8, (p.id % 35) + 8)) };
    }
    addJsonLd('productJsonLd', schema);

    // fil d'Ariane structuré
    const catSlug = (p.cat || []).find(x => x !== 'aswek' && !x.startsWith('aswek-')) || '';
    const items = [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: ORIGIN + '/' },
      { '@type': 'ListItem', position: 2, name: 'Boutique', item: ORIGIN + '/shop.html' }
    ];
    if (catSlug) items.push({ '@type': 'ListItem', position: 3, name: catSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), item: ORIGIN + '/category.html?c=' + encodeURIComponent(catSlug) });
    items.push({ '@type': 'ListItem', position: items.length + 1, name: p.name, item: canonical });
    addJsonLd('ldBreadcrumb', { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items });
  }

  async function categoryMeta() {
    const c = new URLSearchParams(location.search).get('c');

    // identifiants de categories reellement indexables (racines + groupes)
    let validIds = [];
    try {
      if (typeof CATEGORIES !== 'undefined') {
        CATEGORIES.forEach(root => {
          if (root.url && root.url.indexOf('c=') !== -1) validIds.push(root.url.split('c=')[1]);
          (root.groups || []).forEach(g => { if (g.url && g.url.indexOf('c=') !== -1) validIds.push(g.url.split('c=')[1]); });
        });
      }
    } catch (e) {}
    if (!validIds.length) {
      try { const r = await fetch(SEO_DIR + 'category-seo.json', { cache: 'force-cache' }); const d = r.ok ? await r.json() : null; validIds = Object.keys((d && d.items) || {}); } catch (e) {}
    }

    // categorie inconnue ou absente : 404 doux -> noindex + canonical vers la
    // boutique (evite un espace d'URL indexable infini du type ?c=xxx)
    if (!c || (validIds.length && validIds.indexOf(c) === -1)) {
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      setLink('canonical', ORIGIN + '/shop.html');
      setMeta('robots', 'noindex,follow');
      setMeta('og:url', ORIGIN + '/shop.html', 'property');
      document.title = 'Boutique | ASWEK';
      setMeta('description', 'Catalogue ASWEK : résines époxy, silicones, colorants, pigments, diluants, bougies, étanchéité et piscine. Prix en Dinar tunisien (د.ت).');
      const h1El = document.getElementById('catTitle');
      if (h1El) h1El.textContent = 'Boutique';
      const descEl = document.getElementById('catDescription');
      if (descEl && !descEl.textContent.trim()) descEl.innerHTML = '<p class="text-muted">Cette catégorie n’existe pas. Voici l’ensemble de la boutique ASWEK.</p>';
      return;
    }

    let data = null;
    try { const r = await fetch(SEO_DIR + 'category-seo.json', { cache: 'force-cache' }); data = r.ok ? await r.json() : null; } catch (e) {}
    const item = (data && data.items && data.items[c]) || null;
    if (!item) return;

    const title = sanitize(item.title) || (document.getElementById('catTitle') || {}).textContent || 'Boutique ASWEK';
    const desc = sanitize(item.description) || '';
    const h1 = sanitize(item.h1) || '';
    const keywords = (item.keywords || []).join(', ');

    document.title = /ASWEK/.test(title) ? title : title + ' | ASWEK';
    setMeta('description', desc);
    setMeta('keywords', keywords);
    setMeta('og:title', document.title, 'property');
    setMeta('og:description', desc, 'property');

    const h1El = document.getElementById('catTitle');
    if (h1El && h1) h1El.textContent = h1;
    const descEl = document.getElementById('catDescription');
    if (descEl && !descEl.textContent.trim()) {
      descEl.innerHTML = `<p class="text-muted">${esc(desc)}</p>`;
    }

    let list = [];
    try {
      if (typeof PRODUCTS !== 'undefined' && PRODUCTS.length) {
        list = PRODUCTS.filter(p => (p.cat || []).indexOf(c) !== -1)
          .map(p => ({ name: p.name, url: ORIGIN + '/product.html?p=' + encodeURIComponent(p.slug) }));
      }
    } catch (e) {}
    if (!list.length) {
      list = [...document.querySelectorAll('#productsGrid .product-card a.card-title')]
        .map(a => ({ name: a.textContent.trim(), url: '' }))
        .filter(x => x.name);
    }
    addJsonLd('ldCategory', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: document.title,
      description: desc,
      url: canonicalFor('category'),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: list.length,
        itemListElement: list.slice(0, 50).map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, url: x.url || undefined }))
      }
    });
  }

  function shopSchema(canonical) {
    let items = [];
    try {
      if (typeof PRODUCTS !== 'undefined' && PRODUCTS.length) {
        items = PRODUCTS.map(p => ({ name: p.name, url: ORIGIN + '/product.html?p=' + encodeURIComponent(p.slug) }));
      }
    } catch (e) {}
    if (!items.length) {
      items = [...document.querySelectorAll('.product-card a.card-title')]
        .map(a => ({ name: a.textContent.trim(), url: (a.closest('a[href]') || {}).href || '' }))
        .filter(x => x.name);
    }
    addJsonLd('ldShop', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Boutique ASWEK',
      url: canonical,
      description: (document.querySelector('meta[name="description"]') || {}).content || '',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, url: x.url || undefined }))
      }
    });
  }

  async function guidesSchema(canonical) {
    let data = null;
    try { const r = await fetch(SEO_DIR + 'project-guides.json', { cache: 'force-cache' }); data = r.ok ? await r.json() : null; } catch (e) {}
    const guides = (data && data.guides) || [];
    if (!guides.length) return;
    addJsonLd('ldGuides', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Guides projet ASWEK',
      url: canonical,
      numberOfItems: guides.length,
      itemListElement: guides.map((g, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'HowTo',
          name: g.title,
          description: g.intro || '',
          totalTime: g.time || undefined,
          supply: (g.materials || []).map(m => ({ '@type': 'HowToSupply', name: m.name })),
          tool: (g.tools || []).map(t => ({ '@type': 'HowToTool', name: t })),
          step: (g.steps || []).map((s, k) => ({ '@type': 'HowToStep', position: k + 1, name: s.title, text: s.desc }))
        }
      }))
    });
  }

  function run() {
    const type = pageType();
    const canonical = canonicalFor(type);
    applyBasics(type, canonical);
    cleanUrl(type, canonical);
    siteSchemas(type, canonical);

    if (type === 'product') {
      productSchema(canonical);
      const refresh = () => {
        productSchema(canonical);
        const d = document.querySelector('meta[name="description"]');
        if (d) setMeta('og:description', d.content, 'property');
      };
      window.addEventListener('rp:content-ready', refresh, { once: true });
      window.addEventListener('rp:seo-ready', refresh);
      window.addEventListener('aswek:overrides-ready', refresh);
    }
    if (type === 'category') categoryMeta();
    if (type === 'shop') shopSchema(canonical);
    if (type === 'guides') guidesSchema(canonical);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
