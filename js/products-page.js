function render(list) {
  const el = document.getElementById('list');
  el.innerHTML = '';

  list.forEach((p) => {
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
        <button class="btn" data-id="${p.id}">Add to Cart</button>
        <a href="product.html?id=${p.id}">Details</a>
      </p>
    `;

    el.appendChild(d);
  });
}

render(PRODUCTS);

document.getElementById('list').addEventListener('click', (e) => {
  if (e.target.dataset.id) app.addToCart(e.target.dataset.id);
});

document.getElementById('go').addEventListener('click', () => {
  const q = document.getElementById('q').value;
  render(searchProducts(q));
});
