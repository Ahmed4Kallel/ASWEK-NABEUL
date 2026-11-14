/* ResinPro clone - wishlist page */

function renderWishlist() {
  const wrap = document.getElementById('wishlistContent');
  const ids = Store.getWish();
  const products = ids.map(id => PRODUCTS.find(p => String(p.id) === String(id))).filter(Boolean);

  if (!products.length) {
    wrap.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 21 18" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M10.5 17.35C7.13 15.41.59 10.7.5 6.01.41.89 6.17-1.43 10.5 2.97 14.83-1.43 20.59.89 20.5 6.01c-.09 4.7-6.63 9.4-10 11.34Z"/></svg>
      <h3>Votre liste de favoris est vide</h3>
      <p>Ajoutez des produits à vos favoris en cliquant sur le cœur.</p>
      <a href="shop.html" class="btn-primary">Découvrir les produits</a>
    </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="small text-muted mb-3">${products.length} produit${products.length !== 1 ? 's' : ''} dans vos favoris</div>
    <div class="wishlist-grid" id="wishGrid"></div>`;
  renderProductGrid(document.getElementById('wishGrid'), products);
  observeFadeUps();
}

document.addEventListener('DOMContentLoaded', () => {
  renderWishlist();
  document.addEventListener('rp:wish', renderWishlist);
});
