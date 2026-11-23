/* ASWEK - panier persistant, tiroir panier, page panier et commande via WhatsApp.
   Aucun paiement : le client prépare sa commande puis l'envoie lui-même dans
   WhatsApp. Les prix proviennent exclusivement de js/data.js. */

const WA_NUMBER = '21629170566';
const CUSTOMER_KEY = 'aswek_customer';

const Cart = {
  key: 'aswek_cart',
  read() {
    let raw; try { raw = JSON.parse(localStorage.getItem(this.key)); } catch (e) { raw = []; }
    if (!Array.isArray(raw)) return [];
    const seen = new Map();
    raw.forEach(i => {
      const pid = parseInt(i && i.pid, 10), vi = parseInt(i && i.vi, 10) || 0, qty = parseInt(i && i.qty, 10);
      if (!pid || !(qty > 0)) return;
      const k = pid + ':' + vi, q = Math.min(99, qty);
      seen.set(k, { pid, vi: vi < 0 ? 0 : vi, qty: Math.min(99, (seen.get(k) ? seen.get(k).qty : 0) + q) });
    });
    return [...seen.values()];
  },
  write(items) {
    try { localStorage.setItem(this.key, JSON.stringify(items)); } catch (e) {}
    CartUI.refresh();
    document.dispatchEvent(new Event('aswek:cart'));
  },
  /* Lignes enrichies (produit + variation + prix) ; les produits disparus sont ignorés */
  lines() {
    return this.read().map(it => {
      const p = PRODUCTS.find(x => x.id === it.pid);
      if (!p) return null;
      const v = (p.variations || [])[it.vi] || (p.variations || [])[0] || null;
      const price = v && v.price > 0 ? v.price : (p.priceFrom || 0);
      return { pid: it.pid, vi: it.vi, qty: it.qty, p, v, price,
        img: (v && v.img) || p.img, total: price * it.qty };
    }).filter(Boolean);
  },
  count() { return this.lines().reduce((n, l) => n + l.qty, 0); },
  subtotal() { return this.lines().reduce((s, l) => s + l.total, 0); },
  add(pid, vi, qty) {
    pid = +pid; vi = +vi || 0; qty = Math.max(1, +qty || 1);
    const items = this.read();
    const ex = items.find(i => i.pid === pid && i.vi === vi);
    if (ex) ex.qty = Math.min(99, ex.qty + qty); else items.push({ pid, vi, qty: Math.min(99, qty) });
    this.write(items);
  },
  setQty(pid, vi, qty) {
    let items = this.read();
    items = qty <= 0 ? items.filter(i => !(i.pid === pid && i.vi === vi))
      : items.map(i => (i.pid === pid && i.vi === vi) ? { ...i, qty: Math.min(99, qty) } : i);
    this.write(items);
  },
  clear() { this.write([]); }
};

/* Format "DT" lisible : 50 DT, 100 DT, 4,50 DT */
function money(n) {
  const v = Math.round((+n || 0) * 100) / 100;
  return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')) + ' DT';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function productHref(p) { return `product.html?p=${encodeURIComponent(p.slug || p.id)}`; }

/* Coordonnées du client (conservées elles aussi après actualisation) */
function readCustomer() {
  let d = {}; try { d = JSON.parse(localStorage.getItem(CUSTOMER_KEY)); } catch (e) {}
  return d && typeof d === 'object' ? d : {};
}
function writeCustomer(d) {
  try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(d)); } catch (e) {}
}

function lineLabel(l) {
  return l.p.name + (l.p.variations.length > 1 && l.v ? ' — ' + l.v.value : '');
}

/* ------------------------ message WhatsApp ------------------------ */
function buildWhatsAppMessage(lines, customer) {
  const c = customer || {};
  const parts = [
    'Bonjour, je souhaite passer une commande depuis votre site web.',
    '',
    'Ma commande :',
    ''
  ];
  lines.forEach((l, i) => {
    parts.push(`${i + 1}. ${lineLabel(l)}`);
    parts.push(`   Quantité : ${l.qty}`);
    parts.push(`   Prix unitaire : ${money(l.price)}`);
    parts.push(`   Sous-total : ${money(l.total)}`);
    parts.push('');
  });
  const total = lines.reduce((s, l) => s + l.total, 0);
  parts.push('-------------------------');
  parts.push('');
  parts.push(`Total de la commande : ${money(total)}`);
  parts.push('');

  const fields = [
    ['Nom et prénom', c.nom],
    ['Numéro de téléphone', c.tel],
    ['Ville', c.ville],
    ['Adresse de livraison', c.adresse],
    ['Remarque', c.remarque]
  ].filter(([, v]) => v && String(v).trim());
  if (fields.length) {
    parts.push('Informations de livraison :');
    fields.forEach(([label, value]) => parts.push(`${label} : ${String(value).trim()}`));
    parts.push('');
  }
  parts.push('Merci de me confirmer la disponibilité des produits et les détails de livraison.');
  return parts.join('\n');
}

function buildWhatsAppURL(lines, customer) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage(lines, customer))}`;
}

/* ------------------------ tiroir panier ------------------------ */
const CartUI = {
  init() {
    const icon = `<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.1"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>`;
    document.querySelectorAll('header .fast-links .d-flex').forEach(row => {
      const a = document.createElement('a');
      a.href = 'cart.html';
      a.className = 'text-white text-center button-cart-link';
      a.setAttribute('aria-label', 'Panier');
      a.innerHTML = `<div class="cart-ico">${icon}<span class="bubble-num" data-cart-count>0</span></div><span class="d-block very-small mt-1">Panier</span>`;
      a.addEventListener('click', e => { e.preventDefault(); this.open(); });
      row.appendChild(a);
    });

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="cart-overlay" id="cartOverlay"></div>
      <aside class="cart-drawer" id="cartDrawer" aria-label="Panier" aria-hidden="true">
        <div class="cart-drawer-head"><h3>Mon panier</h3><button class="cart-close" aria-label="Fermer">&times;</button></div>
        <div class="cart-drawer-body" id="cartDrawerBody"></div>
        <div class="cart-drawer-foot" id="cartDrawerFoot"></div>
      </aside>`;
    document.body.appendChild(wrap);
    document.getElementById('cartOverlay').addEventListener('click', () => this.close());
    wrap.querySelector('.cart-close').addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    document.getElementById('cartDrawer').addEventListener('click', e => this.handle(e));
    this.refresh();
  },
  open() {
    this.refresh();
    document.getElementById('cartDrawer').classList.add('open');
    document.getElementById('cartDrawer').setAttribute('aria-hidden', 'false');
    document.getElementById('cartOverlay').classList.add('open');
    document.body.classList.add('body-no-scroll');
  },
  close() {
    const d = document.getElementById('cartDrawer'); if (!d) return;
    d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
    document.getElementById('cartOverlay').classList.remove('open');
    document.body.classList.remove('body-no-scroll');
  },
  handle(e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const pid = +b.dataset.pid, vi = +b.dataset.vi;
    if (b.dataset.act === 'inc' || b.dataset.act === 'dec') {
      const line = Cart.read().find(i => i.pid === pid && i.vi === vi);
      if (!line) return;
      Cart.setQty(pid, vi, line.qty + (b.dataset.act === 'inc' ? 1 : -1));
    }
    if (b.dataset.act === 'del') Cart.setQty(pid, vi, 0);
    if (b.dataset.act === 'clear') { Cart.clear(); showToast('Panier vidé'); }
  },
  lineHTML(l) {
    return `<div class="cart-line">
      <a href="${productHref(l.p)}"><img src="${l.img}" alt="${esc(l.p.name)}"></a>
      <div class="cart-line-info">
        <a class="cart-line-name" href="${productHref(l.p)}">${esc(l.p.name)}</a>
        ${l.v && l.p.variations.length > 1 ? `<div class="cart-line-var">${esc(l.v.value)}</div>` : ''}
        <div class="cart-line-price">Prix unitaire : ${money(l.price)}</div>
        <div class="qty-stepper" role="group" aria-label="Quantité">
          <button type="button" data-act="dec" data-pid="${l.pid}" data-vi="${l.vi}" aria-label="Moins">−</button>
          <span>${l.qty}</span>
          <button type="button" data-act="inc" data-pid="${l.pid}" data-vi="${l.vi}" aria-label="Plus">+</button>
        </div>
      </div>
      <div class="cart-line-side">
        <span class="cart-line-sub">Sous-total</span>
        <strong>${money(l.total)}</strong>
        <button type="button" class="cart-del" data-act="del" data-pid="${l.pid}" data-vi="${l.vi}" aria-label="Supprimer">Supprimer</button>
      </div>
    </div>`;
  },
  refresh() {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      const n = Cart.count(), changed = el.textContent !== String(n);
      el.textContent = n; el.style.display = n ? 'flex' : 'none';
      if (changed && n) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    });
    const body = document.getElementById('cartDrawerBody'), foot = document.getElementById('cartDrawerFoot');
    if (!body) return;
    const lines = Cart.lines();
    if (!lines.length) {
      body.innerHTML = `<div class="cart-empty"><p>Votre panier est vide.</p><a class="btn-primary" href="shop.html">Découvrir la boutique</a></div>`;
      foot.innerHTML = ''; return;
    }
    const sub = Cart.subtotal();
    body.innerHTML = `<p class="cart-tip">Ajoutez plusieurs produits, puis envoyez votre commande en une seule fois sur WhatsApp.</p>`
      + lines.map(l => this.lineHTML(l)).join('');
    foot.innerHTML = `
      <div class="sum-row"><span>Sous-total</span><strong>${money(sub)}</strong></div>
      <div class="sum-row total"><span>Total de la commande</span><strong>${money(sub)}</strong></div>
      <a class="btn-whatsapp btn-long" href="cart.html#commande">Commander via WhatsApp</a>
      <a class="btn-primary-outline btn-long" href="cart.html">Voir le panier</a>`;
  }
};

/* Ajout au panier depuis une carte produit (quantité + option choisies sur la carte) */
function bindQuickAdd() {
  if (bindQuickAdd.bound) return;
  bindQuickAdd.bound = true;
  document.addEventListener('click', e => {
    const step = e.target.closest('[data-card-qty-step]');
    if (step) {
      const box = step.closest('[data-card-qty]');
      const val = box && box.querySelector('[data-qty-val]');
      if (!val) return;
      e.preventDefault();
      let q = parseInt(val.textContent, 10) || 1;
      q = Math.max(1, Math.min(99, q + (+step.dataset.cardQtyStep || 0)));
      val.textContent = q;
      return;
    }
    const btn = e.target.closest('[data-quick-add]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    const p = PRODUCTS.find(x => x.id === +btn.dataset.quickAdd);
    if (!p) return;
    const card = btn.closest('.product-card');
    const val = card && card.querySelector('[data-qty-val]');
    const qty = Math.max(1, Math.min(99, parseInt(val && val.textContent, 10) || 1));
    const sel = card && card.querySelector('[data-card-variation]');
    const vi = sel ? (+sel.value || 0) : 0;
    Cart.add(p.id, vi, qty);
    showToast(`${qty} × ${p.name} ajouté au panier`);
  });
}

/* ------------------------ page panier ------------------------ */
function renderCartPage() {
  const root = document.getElementById('cartPage'); if (!root) return;
  const paint = () => {
    const lines = Cart.lines();
    if (!lines.length) {
      root.innerHTML = `<div class="cart-empty big"><p>Votre panier est vide.</p><a class="btn-primary" href="shop.html">Découvrir les produits</a></div>`;
      return;
    }
    const c = readCustomer(), sub = Cart.subtotal();
    root.innerHTML = `<div class="row g-4" id="commande">
      <div class="col-12 col-lg-7">
        <div class="cart-lines-box">
          <div class="cart-lines-head">
            <h4>${lines.length} produit${lines.length !== 1 ? 's' : ''} dans votre panier</h4>
            <button type="button" class="cart-clear" data-act="clear">Vider le panier</button>
          </div>
          ${lines.map(l => CartUI.lineHTML(l)).join('')}
        </div>
        <a class="back-link" href="shop.html">← Continuer à parcourir les produits</a>

        <form id="orderForm" class="co-box cart-customer-form" novalidate>
          <h4>Informations pour la livraison</h4>
          <p class="small">Ces informations seront ajoutées automatiquement à votre message WhatsApp.</p>
          <div class="row g-3">
            <div class="col-12 col-sm-6"><label for="coNom">Nom et prénom *<input id="coNom" name="nom" required autocomplete="name" value="${esc(c.nom)}"></label></div>
            <div class="col-12 col-sm-6"><label for="coTel">Numéro de téléphone *<input id="coTel" name="tel" required inputmode="tel" autocomplete="tel" placeholder="Ex : 29 170 566" value="${esc(c.tel)}"></label></div>
            <div class="col-12 col-sm-6"><label for="coVille">Ville *<input id="coVille" name="ville" required autocomplete="address-level2" value="${esc(c.ville)}"></label></div>
            <div class="col-12 col-sm-6"><label for="coAdresse">Adresse de livraison (facultative)<input id="coAdresse" name="adresse" autocomplete="street-address" value="${esc(c.adresse)}"></label></div>
            <div class="col-12"><label for="coRemarque">Remarque (facultative)<textarea id="coRemarque" name="remarque" rows="3">${esc(c.remarque)}</textarea></label></div>
          </div>
        </form>
      </div>
      <div class="col-12 col-lg-5">
        <div class="cart-summary">
          <h4>Récapitulatif</h4>
          <div class="sum-row"><span>Sous-total</span><strong>${money(sub)}</strong></div>
          <div class="sum-row"><span>Livraison</span><span class="small">À confirmer avec ASWEK</span></div>
          <div class="sum-row total"><span>Total de la commande</span><strong>${money(sub)}</strong></div>
          <div class="co-error" id="orderError" role="alert"></div>
          <button type="submit" form="orderForm" class="btn-whatsapp btn-long" id="waOrderBtn" ${lines.length ? '' : 'disabled'}>
            <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true"><path fill="#fff" d="M16 3C8.8 3 3 8.8 3 16c0 2.3.6 4.5 1.7 6.4L3 29l6.8-1.8c1.9 1 4 1.6 6.2 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3Zm7.6 18.3c-.3.9-1.8 1.7-2.5 1.8-.6.1-1.4.1-2.3-.2-.5-.2-1.2-.4-2-.8-3.6-1.5-5.9-5.1-6.1-5.4-.2-.2-1.4-1.9-1.4-3.6s.9-2.6 1.2-2.9c.3-.3.7-.4.9-.4h.6c.2 0 .5-.1.8.6l1.1 2.6c.1.2.1.4 0 .6l-.4.6-.6.7c-.2.2-.4.4-.2.8.2.4.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.4.2.6.1.8-.1l1.2-1.4c.2-.3.4-.2.7-.1l2.4 1.1c.4.2.6.3.7.5.1.2.1.9-.2 1.7Z"/></svg>
            Commander via WhatsApp
          </button>
          <p class="wa-note">Votre commande sera confirmée par WhatsApp après réception de votre message.</p>
          <p class="wa-small">Le message s'ouvre déjà rempli : vérifiez-le puis appuyez sur « Envoyer » dans WhatsApp. Votre panier reste disponible. Si WhatsApp ne s'ouvre pas, autorisez les fenêtres surgissantes.</p>
        </div>
      </div>
    </div>`;
    if (location.hash === '#commande') {
      const form = document.getElementById('orderForm');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  root.addEventListener('click', e => CartUI.handle(e));
  root.addEventListener('input', e => {
    if (!e.target.name || !e.target.closest('#orderForm')) return;
    const c = readCustomer(); c[e.target.name] = e.target.value; writeCustomer(c);
  });
  root.addEventListener('submit', e => {
    if (e.target.id !== 'orderForm') return;
    e.preventDefault();
    const form = e.target, err = document.getElementById('orderError');
    const d = Object.fromEntries(new FormData(form));
    Object.keys(d).forEach(k => { d[k] = String(d[k]).trim(); });

    const missing = ['nom', 'tel', 'ville'].filter(k => !d[k]);
    form.querySelectorAll('input,textarea').forEach(i => i.classList.toggle('invalid', missing.includes(i.name)));
    if (missing.length) {
      err.textContent = 'Veuillez remplir : ' + missing.map(k => ({ nom: 'le nom', tel: 'le téléphone', ville: 'la ville' }[k])).join(', ') + '.';
      const first = form.querySelector('.invalid'); if (first) first.focus();
      return;
    }
    if (!/^[+\d][\d\s.-]{6,}$/.test(d.tel)) {
      err.textContent = 'Numéro de téléphone invalide.';
      form.elements.tel.classList.add('invalid'); form.elements.tel.focus(); return;
    }
    const lines = Cart.lines();
    if (!lines.length) { err.textContent = 'Votre panier est vide.'; return; }

    err.textContent = '';
    writeCustomer(d);
    const url = buildWhatsAppURL(lines, d);
    window.open(url, '_blank', 'noopener,noreferrer');
    /* Le panier n'est pas vidé et aucune confirmation n'est affichée :
       seul l'envoi réel du message dans WhatsApp confirmera la commande. */
  });
  document.addEventListener('aswek:cart', paint);
  paint();
}

document.addEventListener('DOMContentLoaded', () => {
  /* Anciennes données de l'ancien parcours paiement : plus utilisées. */
  try { localStorage.removeItem('aswek_orders'); } catch (e) {}
  CartUI.init(); bindQuickAdd(); renderCartPage();
});
