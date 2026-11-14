/* ASWEK - panier, tiroir panier, page panier et commande (WhatsApp / paiement à la livraison)
   État dans localStorage ; aucun prix inventé : les prix viennent de js/data.js. */

const WA_NUMBER = '21629170566';
const SHIPPING_FEE = 8.9;
const FREE_SHIPPING_FROM = 500;

const Cart = {
  key: 'aswek_cart',
  read() {
    let raw; try { raw = JSON.parse(localStorage.getItem(this.key)); } catch (e) { raw = []; }
    if (!Array.isArray(raw)) return [];
    const seen = new Map();
    raw.forEach(i => {
      const pid = parseInt(i && i.pid, 10), vi = parseInt(i && i.vi, 10) || 0, qty = parseInt(i && i.qty, 10);
      if (!pid || !(qty > 0)) return;
      const k = pid + ':' + vi; const q = Math.min(99, qty);
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
      return { pid: it.pid, vi: it.vi, qty: it.qty, p, v, price, img: (v && v.img) || p.img, total: price * it.qty };
    }).filter(Boolean);
  },
  count() { return this.lines().reduce((n, l) => n + l.qty, 0); },
  subtotal() { return this.lines().reduce((s, l) => s + l.total, 0); },
  shipping(sub) { return sub === 0 || sub >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE; },
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

function money(n) { return n.toFixed(2).replace('.', ',') + ' DT'; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function productHref(p) { return `product.html?p=${encodeURIComponent(p.slug || p.id)}`; }

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
    const line = Cart.read().find(i => i.pid === pid && i.vi === vi);
    if (b.dataset.act === 'inc') Cart.setQty(pid, vi, line.qty + 1);
    if (b.dataset.act === 'dec') Cart.setQty(pid, vi, line.qty - 1);
    if (b.dataset.act === 'del') Cart.setQty(pid, vi, 0);
  },
  lineHTML(l) {
    return `<div class="cart-line">
      <a href="${productHref(l.p)}"><img src="${l.img}" alt="${esc(l.p.name)}"></a>
      <div class="cart-line-info">
        <a class="cart-line-name" href="${productHref(l.p)}">${esc(l.p.name)}</a>
        ${l.v && l.p.variations.length > 1 ? `<div class="cart-line-var">${esc(l.v.value)}</div>` : ''}
        <div class="cart-line-price">${money(l.price)}</div>
        <div class="qty-stepper" role="group" aria-label="Quantité">
          <button data-act="dec" data-pid="${l.pid}" data-vi="${l.vi}" aria-label="Moins">−</button>
          <span>${l.qty}</span>
          <button data-act="inc" data-pid="${l.pid}" data-vi="${l.vi}" aria-label="Plus">+</button>
        </div>
      </div>
      <div class="cart-line-side">
        <strong>${money(l.total)}</strong>
        <button class="cart-del" data-act="del" data-pid="${l.pid}" data-vi="${l.vi}" aria-label="Supprimer">Supprimer</button>
      </div>
    </div>`;
  },
  refresh() {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      const n = Cart.count(); el.textContent = n; el.style.display = n ? 'flex' : 'none';
    });
    const body = document.getElementById('cartDrawerBody'), foot = document.getElementById('cartDrawerFoot');
    if (!body) return;
    const lines = Cart.lines();
    if (!lines.length) {
      body.innerHTML = `<div class="cart-empty"><p>Votre panier est vide.</p><a class="btn-primary" href="shop.html">Découvrir la boutique</a></div>`;
      foot.innerHTML = ''; return;
    }
    const sub = Cart.subtotal(), ship = Cart.shipping(sub);
    const left = FREE_SHIPPING_FROM - sub;
    body.innerHTML = `<div class="free-ship">${left > 0
      ? `Plus que <strong>${money(left)}</strong> pour la livraison gratuite`
      : '✓ Livraison gratuite pour cette commande'}
      <div class="free-ship-bar"><span style="width:${Math.min(100, sub / FREE_SHIPPING_FROM * 100)}%"></span></div></div>`
      + lines.map(l => this.lineHTML(l)).join('');
    foot.innerHTML = `
      <div class="sum-row"><span>Sous-total</span><strong>${money(sub)}</strong></div>
      <div class="sum-row"><span>Livraison</span><strong>${ship ? money(ship) : 'Gratuite'}</strong></div>
      <div class="sum-row total"><span>Total</span><strong>${money(sub + ship)}</strong></div>
      <a class="btn-primary btn-long" href="checkout.html">Passer la commande</a>
      <a class="btn-primary-outline btn-long" href="cart.html">Voir le panier</a>`;
  }
};

/* Ajout au panier depuis une carte produit (bouton "quick-add") */
function bindQuickAdd() {
  document.querySelectorAll('[data-quick-add]').forEach(btn => {
    if (btn.dataset.bound) return; btn.dataset.bound = '1';
    btn.addEventListener('click', e => {
      e.preventDefault();
      const p = PRODUCTS.find(x => x.id === +btn.dataset.quickAdd);
      if (!p) return;
      if ((p.variations || []).length > 1) { location.href = productHref(p); return; }
      Cart.add(p.id, 0, 1);
      showToast('Ajouté au panier');
      CartUI.open();
    });
  });
}

/* ------------------------ page panier ------------------------ */
function renderCartPage() {
  const root = document.getElementById('cartPage'); if (!root) return;
  const paint = () => {
    const lines = Cart.lines();
    if (!lines.length) {
      root.innerHTML = `<div class="cart-empty big"><p>Votre panier est vide.</p><a class="btn-primary" href="shop.html">Continuer vos achats</a></div>`;
      return;
    }
    const sub = Cart.subtotal(), ship = Cart.shipping(sub);
    root.innerHTML = `<div class="row g-4">
      <div class="col-12 col-lg-8"><div class="cart-lines-box">${lines.map(l => CartUI.lineHTML(l)).join('')}</div>
        <a class="back-link" href="shop.html">← Continuer vos achats</a></div>
      <div class="col-12 col-lg-4"><div class="cart-summary">
        <h4>Récapitulatif</h4>
        <div class="sum-row"><span>Sous-total</span><strong>${money(sub)}</strong></div>
        <div class="sum-row"><span>Livraison</span><strong>${ship ? money(ship) : 'Gratuite'}</strong></div>
        <div class="sum-row total"><span>Total</span><strong>${money(sub + ship)}</strong></div>
        <a class="btn-primary btn-long" href="checkout.html">Passer la commande</a>
        <p class="small mt-3 mb-0">Livraison gratuite dès ${FREE_SHIPPING_FROM} DT d'achat. Paiement à la livraison.</p>
      </div></div></div>`;
  };
  root.addEventListener('click', e => CartUI.handle(e));
  document.addEventListener('aswek:cart', paint);
  paint();
}

/* ------------------------ commande ------------------------ */
const GOUVERNORATS = ['Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan'];

function renderCheckoutPage() {
  const root = document.getElementById('checkoutPage'); if (!root) return;
  const lines = Cart.lines();
  if (!lines.length) {
    root.innerHTML = `<div class="cart-empty big"><p>Votre panier est vide.</p><a class="btn-primary" href="shop.html">Aller à la boutique</a></div>`;
    return;
  }
  const sub = Cart.subtotal(), ship = Cart.shipping(sub), total = sub + ship;
  root.innerHTML = `<form id="checkoutForm" class="row g-4" novalidate>
    <div class="col-12 col-lg-7">
      <div class="co-box">
        <h4>Vos coordonnées</h4>
        <div class="row g-3">
          <div class="col-12 col-sm-6"><label>Nom complet *<input name="nom" required autocomplete="name"></label></div>
          <div class="col-12 col-sm-6"><label>Téléphone *<input name="tel" required inputmode="tel" autocomplete="tel" placeholder="Ex : 29 170 566"></label></div>
          <div class="col-12"><label>E-mail (optionnel)<input name="email" type="email" autocomplete="email"></label></div>
          <div class="col-12 col-sm-6"><label>Gouvernorat *<select name="gov" required><option value="">Choisir…</option>${GOUVERNORATS.map(g => `<option>${g}</option>`).join('')}</select></label></div>
          <div class="col-12 col-sm-6"><label>Ville *<input name="ville" required autocomplete="address-level2"></label></div>
          <div class="col-12"><label>Adresse de livraison *<input name="adresse" required autocomplete="street-address"></label></div>
          <div class="col-12"><label>Note pour la commande (optionnel)<textarea name="note" rows="3"></textarea></label></div>
        </div>
      </div>
      <div class="co-box">
        <h4>Mode de paiement</h4>
        <label class="co-radio"><input type="radio" name="pay" value="Paiement à la livraison" checked> <span><strong>Paiement à la livraison</strong><br><small>Vous payez en espèces à la réception de votre colis.</small></span></label>
        <label class="co-radio"><input type="radio" name="pay" value="Virement / à convenir par WhatsApp"> <span><strong>Autre moyen (convenu par WhatsApp)</strong><br><small>Notre équipe vous contacte pour finaliser le paiement.</small></span></label>
      </div>
    </div>
    <div class="col-12 col-lg-5"><div class="cart-summary">
      <h4>Votre commande</h4>
      ${lines.map(l => `<div class="co-line"><span>${esc(l.p.name)}${l.p.variations.length > 1 ? ' — ' + esc(l.v.value) : ''} × ${l.qty}</span><strong>${money(l.total)}</strong></div>`).join('')}
      <div class="sum-row mt-3"><span>Sous-total</span><strong>${money(sub)}</strong></div>
      <div class="sum-row"><span>Livraison</span><strong>${ship ? money(ship) : 'Gratuite'}</strong></div>
      <div class="sum-row total"><span>Total</span><strong>${money(total)}</strong></div>
      <div class="co-error" id="coError" role="alert"></div>
      <button type="submit" class="btn-primary btn-long">Confirmer la commande</button>
      <p class="small mt-3 mb-0">Votre commande est enregistrée puis envoyée à notre équipe via WhatsApp pour confirmation.</p>
    </div></div></form>`;

  document.getElementById('checkoutForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f));
    const err = document.getElementById('coError');
    const missing = ['nom', 'tel', 'gov', 'ville', 'adresse'].filter(k => !(d[k] || '').trim());
    f.querySelectorAll('input,select').forEach(i => i.classList.toggle('invalid', missing.includes(i.name)));
    if (missing.length) { err.textContent = 'Veuillez remplir les champs obligatoires.'; return; }
    if (!/^[+\d][\d\s.-]{6,}$/.test(d.tel.trim())) { err.textContent = 'Numéro de téléphone invalide.'; f.tel.classList.add('invalid'); return; }
    err.textContent = '';
    const ref = 'ASW-' + Date.now().toString(36).toUpperCase().slice(-6);
    const order = { ref, date: new Date().toISOString(), customer: d, total, shipping: ship,
      items: lines.map(l => ({ name: l.p.name, variation: l.v ? l.v.value : '', qty: l.qty, price: l.price })) };
    try {
      const all = JSON.parse(localStorage.getItem('aswek_orders') || '[]'); all.push(order);
      localStorage.setItem('aswek_orders', JSON.stringify(all));
    } catch (x) {}
    const msg = [`Nouvelle commande ${ref}`, '',
      ...order.items.map(i => `• ${i.name}${i.variation && lines.find(l => l.p.name === i.name).p.variations.length > 1 ? ' (' + i.variation + ')' : ''} × ${i.qty} — ${money(i.price * i.qty)}`),
      '', `Livraison : ${ship ? money(ship) : 'Gratuite'}`, `Total : ${money(total)}`, `Paiement : ${d.pay}`, '',
      `Nom : ${d.nom}`, `Tél : ${d.tel}`, d.email ? `E-mail : ${d.email}` : '',
      `Adresse : ${d.adresse}, ${d.ville}, ${d.gov}`, d.note ? `Note : ${d.note}` : ''].filter(x => x !== '').join('\n');
    const wa = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    Cart.clear();
    root.innerHTML = `<div class="co-success">
      <div class="co-check">✓</div><h2>Merci ${esc(d.nom.split(' ')[0])} !</h2>
      <p>Votre commande <strong>${ref}</strong> est enregistrée (total : <strong>${money(total)}</strong>).</p>
      <p>Pour la confirmer, envoyez-la à notre équipe sur WhatsApp :</p>
      <a class="btn-primary" href="${wa}" target="_blank" rel="noopener">Envoyer sur WhatsApp</a>
      <a class="btn-primary-outline" href="index.html">Retour à l'accueil</a></div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.open(wa, '_blank', 'noopener');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  CartUI.init(); bindQuickAdd(); renderCartPage(); renderCheckoutPage();
  new MutationObserver(bindQuickAdd).observe(document.body, { childList: true, subtree: true });
});
