function getWishlist() {
  return JSON.parse(localStorage.getItem('wishlist') || '[]');
}

function saveWishlist(w) {
  localStorage.setItem('wishlist', JSON.stringify(w));
}

function addToWishlist(id) {
  const w = getWishlist();
  const n = Number(id);
  if (!w.includes(n)) {
    w.push(n);
    saveWishlist(w);
  }
}

function removeFromWishlist(id) {
  let w = getWishlist();
  w = w.filter((i) => i !== Number(id));
  saveWishlist(w);
}

function renderWishlist() {
  const el = document.getElementById('wishlist');
  if (!el) return;

  const ids = getWishlist();
  if (!ids.length) {
    el.innerHTML = '<p class="muted">Your wishlist is empty.</p>';
    return;
  }

  let html = '';
  ids.forEach((id) => {
    const p = findProduct(id);
    if (!p) return;
    html += `
      <div class="card">
        <img src="${p.image}" alt="${p.name}">
        <h3>${p.name}</h3>
        <div class="muted">${p.desc}</div>
        <div>$${p.price.toFixed(2)}</div>
        <div class="actions">
          <button data-id="${p.id}" class="add-cart btn">Add to Cart</button>
          <button data-id="${p.id}" class="remove-wishlist btn btn-link">Remove</button>
        </div>
      </div>
    `;
  });

  el.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  renderWishlist();

  const container = document.getElementById('wishlist');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const target = e.target;
    if (target.matches('.add-cart')) {
      const id = target.getAttribute('data-id');
      if (window.app && typeof window.app.addToCart === 'function') {
        window.app.addToCart(id);
      } else if (typeof addToCart === 'function') {
        addToCart(id);
      }
      removeFromWishlist(id);
      renderWishlist();
    }

    if (target.matches('.remove-wishlist')) {
      const id = target.getAttribute('data-id');
      removeFromWishlist(id);
      renderWishlist();
    }
  });
});

window.wishlist = {
  get: getWishlist,
  add: addToWishlist,
  remove: removeFromWishlist,
  render: renderWishlist
};
