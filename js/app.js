function $(s, root = document) {
  return root.querySelector(s);
}

function $all(s, root = document) {
  return Array.from(root.querySelectorAll(s));
}

function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(c) {
  localStorage.setItem('cart', JSON.stringify(c));
}

function addToCart(id, qty = 1) {
  const cart = getCart();
  const item = cart.find((i) => i.id === Number(id));

  if (item) item.qty += qty;
  else cart.push({ id: Number(id), qty: Number(qty) });

  saveCart(cart);
  renderCartCount();
}

function removeFromCart(id) {
  let c = getCart();
  c = c.filter((i) => i.id !== Number(id));
  saveCart(c);
  renderCartCount();
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
  const c = getCart();
  const count = c.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

function getRatings(id) {
  return JSON.parse(localStorage.getItem('ratings_' + id) || '[]');
}

function saveRating(id, value) {
  const r = getRatings(id);
  r.push(Number(value));
  localStorage.setItem('ratings_' + id, JSON.stringify(r));
}

function averageRating(id) {
  const r = getRatings(id);
  if (!r.length) return 0;
  return (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1);
}

function getReviews(id) {
  return JSON.parse(localStorage.getItem('reviews_' + id) || '[]');
}

function saveReview(id, review) {
  const r = getReviews(id);
  r.unshift(review);
  localStorage.setItem('reviews_' + id, JSON.stringify(r));
}

function placeOrder(order) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const key = 'orders_' + (user && user.email ? user.email : 'guest');
  let orders = JSON.parse(localStorage.getItem(key) || '[]');
  orders.push(order);
  localStorage.setItem(key, JSON.stringify(orders));
  if (localStorage.getItem('orders')) localStorage.removeItem('orders');
  localStorage.removeItem('cart');
}

function qs(name) {
  const u = new URLSearchParams(location.search);
  return u.get(name);
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('orders')) {
    localStorage.removeItem('orders');
  }
  renderCartCount();
});

window.app = {
  addToCart,
  removeFromCart,
  updateQty,
  findProduct: window.findProduct,
  searchProducts: window.searchProducts,
  averageRating,
  saveRating,
  placeOrder
};

function renderHeader() {
  const links = document.querySelector('.nav .links');
  if (!links) return;

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  let html = '';
  html += `<a href="products.html">Products</a>`;
  if (user) {
    html += `<a href="wishlist.html">Wishlist</a>`;
  }
  if (user) {
    const local = user.email ? user.email.split('@')[0] : (user.name || '');
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
      localStorage.removeItem('user');
      renderHeader();
      location.href = 'index.html';
    });

  renderCartCount();
}

document.addEventListener('DOMContentLoaded', renderHeader);
