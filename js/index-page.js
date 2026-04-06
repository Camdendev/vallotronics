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
    
    <p>
      <button class="btn" data-id="${p.id}">Add to Cart</button>
    </p>
  `;

  f.appendChild(d);
  });
});

document.getElementById('featured').addEventListener('click', (e) => {
  if (e.target.dataset.id) return app.addToCart(e.target.dataset.id);

  const card = e.target.closest('.card');
  if (card && card.dataset.productId) {
    window.location.href = `product.html?id=${card.dataset.productId}`;
  }
});