const f = document.getElementById('featured');

fetchProducts().then(() => {
  (window.PRODUCTS.slice(0, 4) || []).forEach((p) => {
  const d = document.createElement('div');
  d.className = 'card clickable';
  d.dataset.productId = p.id;
  d.innerHTML = `
    <img src="${p.image}">
    <h3>${p.name}</h3>
      <div class="meta">
      <div class="price">$${p.price}</div>
      <div class="tag">${p.category || ''}</div>
    </div>
    <p class="muted">${p.desc}</p>
    
    <p style="display:flex;gap:8px;align-items:center">
      <button class="btn" data-id="${p.id}">Add to Cart</button>
      <button class="btn secondary" data-wishlist="${p.id}">Add to Wishlist</button>
    </p>
  `;

  f.appendChild(d);
  });
});

document.getElementById('featured').addEventListener('click', (e) => {
  const wishlistId = e.target.dataset.wishlist;
  if (wishlistId) {
    if (window.wishlist && typeof window.wishlist.add === 'function') {
      window.wishlist.add(Number(wishlistId)).then(() => {
        e.target.textContent = 'Added';
        e.target.disabled = true;
      }).catch(() => {});
      return;
    }
    alert('Please login to add to wishlist');
    return;
  }

  if (e.target.dataset.id) return app.addToCart(e.target.dataset.id);

  const card = e.target.closest('.card');
  if (card && card.dataset.productId) {
    window.location.href = `/product/${card.dataset.productId}`;
  }
});