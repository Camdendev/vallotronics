const f = document.getElementById('featured');

PRODUCTS.slice(0, 4).forEach((p) => {
  const d = document.createElement('div');
  d.className = 'card';
  d.innerHTML = `
    <img src="${p.image}">
    <h3>${p.name}</h3>
      <div class="meta">
      <div class="price">$${p.price}</div>
      <div class="tag">${p.category || ''}</div>
    </div>
    <p class="muted">${p.desc}</p>
    
    <p>
      <a href="product.html?id=${p.id}" class="btn">View</a>
      <button class="btn secondary" data-id="${p.id}">Add to Cart</button>
    </p>
  `;

  f.appendChild(d);
});

document.getElementById('featured').addEventListener('click', (e) => {
  if (e.target.dataset.id) app.addToCart(e.target.dataset.id);
});

// Search removed from homepage
