// Wishlist client no longer uses localStorage. Attempt server APIs; if unsupported, show message.
async function fetchWishlist() {
  try {
    const res = await fetch('/api/wishlist', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('no-wishlist');
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function addToWishlist(id) {
  try {
    const res = await fetch('/api/wishlist', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: Number(id) }) });
    if (!res.ok) throw new Error('failed');
    return true;
  } catch (e) {
    alert('Wishlist requires server support.');
    return false;
  }
}

async function removeFromWishlist(id) {
  try {
    const res = await fetch('/api/wishlist', { method: 'DELETE', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: Number(id) }) });
    if (!res.ok) throw new Error('failed');
    return true;
  } catch (e) {
    alert('Wishlist requires server support.');
    return false;
  }
}

async function renderWishlist() {
  const el = document.getElementById('wishlist');
  if (!el) return;

  const ids = await fetchWishlist();
  if (ids === null) {
    el.innerHTML = '<p class="muted">Wishlist requires server support.</p>';
    return;
  }

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

  container.addEventListener('click', async (e) => {
    const target = e.target;
    if (target.matches('.add-cart')) {
      const id = target.getAttribute('data-id');
      if (window.app && typeof window.app.addToCart === 'function') {
        window.app.addToCart(id);
      }
      await removeFromWishlist(id);
      renderWishlist();
    }

    if (target.matches('.remove-wishlist')) {
      const id = target.getAttribute('data-id');
      await removeFromWishlist(id);
      renderWishlist();
    }
  });
});

window.wishlist = {
  get: fetchWishlist,
  add: addToWishlist,
  remove: removeFromWishlist,
  render: renderWishlist
};
