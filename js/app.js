function $(s, root = document) {
  return root.querySelector(s);
}

function $all(s, root = document) {
  return Array.from(root.querySelectorAll(s));
}

// Client no longer uses localStorage for cart; use server APIs instead.
function getCart() {
  console.warn('getCart(): client should call /api/cart directly');
  return [];
}

function saveCart(c) {
  console.warn('saveCart(): localStorage disabled; use server APIs');
}

function addToCart(id, qty = 1) {
  // try server API; if not authenticated, fallback to localStorage
  fetch('/api/add_to_cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: Number(id), quantity: Number(qty) })
  }).then((res) => {
    if (res.ok) {
      // refresh cart count from server
      fetch('/api/cart').then(r => r.json()).then(items => {
        const count = items.reduce((s,i) => s + i.qty, 0);
        const el = document.getElementById('cartCount');
        if (el) el.textContent = count;
      }).catch(()=>renderCartCount());
    } else {
      // fallback to local
      const cart = getCart();
      const item = cart.find((i) => i.id === Number(id));
      if (item) item.qty += qty;
      else cart.push({ id: Number(id), qty: Number(qty) });
      saveCart(cart);
      // update UI directly from local cart to avoid server-empty override
      const count = cart.reduce((s, i) => s + i.qty, 0);
      const el = document.getElementById('cartCount');
      if (el) el.textContent = count;
      try { if (window.renderCart) window.renderCart(); } catch(e){}
    }
  }).catch(()=>{
    const cart = getCart();
    const item = cart.find((i) => i.id === Number(id));
    if (item) item.qty += qty;
    else cart.push({ id: Number(id), qty: Number(qty) });
    saveCart(cart);
    // update UI directly from local cart to avoid server-empty override
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = count;
    try { if (window.renderCart) window.renderCart(); } catch(e){}
  });
}

function removeFromCart(id) {
  // Immediately update local cart and UI so removal is instant
  try {
    let c = getCart();
    c = c.filter((i) => i.id !== Number(id));
    saveCart(c);
    // update UI
    const el = document.getElementById('cartCount');
    if (el) el.textContent = c.reduce((s, i) => s + i.qty, 0);
    try { if (window.renderCart) window.renderCart(); } catch (e) {}
  } catch (e) {
    console.error('removeFromCart local update failed', e);
  }

  // Attempt background sync if user is authenticated (best-effort)
  if (document && fetch) {
    fetch('/api/cart').then(() => {
      // server-side removal not implemented; nothing to do
    }).catch(()=>{});
  }
  return Promise.resolve();
}

function updateQty(id, qty) {
  let c = getCart();
  const it = c.find((x) => x.id === Number(id));

  if (it) {
    it.qty = Number(qty);
    saveCart(c);
  }

  renderCartCount();
}

function renderCartCount() {
  // Attempt to use server-side cart if available
  fetch('/api/cart').then(r => r.json()).then(items => {
    const local = getCart();
    let count = 0;
    if (Array.isArray(items) && items.length) {
      count = items.reduce((s, i) => s + i.qty, 0);
    } else if (Array.isArray(local) && local.length) {
      count = local.reduce((s, i) => s + i.qty, 0);
    }
    const el = document.getElementById('cartCount');
    if (el) el.textContent = count;
  }).catch(() => {
    const c = getCart();
    const count = c.reduce((s, i) => s + i.qty, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = count;
  });
}

function getRatings(id) {
  console.warn('Ratings are not available client-side; implement server endpoints.');
  return [];
}

function saveRating(id, value) {
  console.warn('saveRating(): ratings storage disabled; implement server endpoint.');
}

function averageRating(id) {
  const r = getRatings(id);
  if (!r.length) return 0;
  return (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1);
}

function getReviews(id) {
  console.warn('getReviews(): reviews storage disabled; implement server endpoint.');
  return [];
}

function saveReview(id, review) {
  console.warn('saveReview(): reviews storage disabled; implement server endpoint.');
}

// placeOrder is handled server-side via `/checkout` POST; client no longer stores orders locally.

function qs(name) {
  const u = new URLSearchParams(location.search);
  return u.get(name);
}

document.addEventListener('DOMContentLoaded', () => {
  renderCartCount();
});

window.app = {
  addToCart,
  removeFromCart,
  updateQty,
  findProduct: window.findProduct,
  searchProducts: window.searchProducts,
  averageRating,
  saveRating
};

function renderHeader() {
  const links = document.querySelector('.nav .links');
  if (!links) return;

  // fetch auth state from server
  fetch('/api/me', { credentials: 'same-origin' }).then(r => r.json()).then((user) => {
    let html = '';
    html += `<a href="products.html">Products</a>`;
    if (user) {
      html += `<a href="wishlist.html">Wishlist</a>`;
    }
    if (user) {
      const local = user.email ? user.email.split('@')[0] : (user.first_name || '');
      html += `<a href="dashboard.html">Hi, ${local}</a>`;
    } else {
      html += `<a href="dashboard.html">Dashboard</a>`;
    }

    if (user) {
      html += `<a href="#" id="logout">Logout</a>`;
      html += `<a href="cart.html">Cart (<span id="cartCount">0</span>)</a>`;
    } else {
      html += `<a href="login.html">Login</a>`;
      html += `<a href="cart.html">Cart (<span id="cartCount">0</span>)</a>`;
    }

    links.innerHTML = html;

    const logout = document.getElementById('logout');
    if (logout)
      logout.addEventListener('click', (e) => {
        e.preventDefault();
        fetch('/logout', { credentials: 'same-origin' }).then(() => { renderHeader(); location.href = 'index.html'; }).catch(() => { location.href = 'index.html'; });
      });

    renderCartCount();
  }).catch(() => {
    // fallback to non-auth UI
    links.innerHTML = `<a href="products.html">Products</a><a href="login.html">Login</a><a href="cart.html">Cart (<span id="cartCount">0</span>)</a>`;
    renderCartCount();
  });
}

document.addEventListener('DOMContentLoaded', renderHeader);
