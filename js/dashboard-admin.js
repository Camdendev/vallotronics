function renderAdminProducts() {
  const el = document.getElementById('adminProducts');
  if (!el) return;
  if (!window.PRODUCTS || !window.PRODUCTS.length) {
    fetchProducts().then(() => renderAdminProducts());
    return;
  }
  el.innerHTML = window.PRODUCTS
    .map(
      (p) => `<div class="card" style="padding:10px;margin-bottom:8px"><div style="display:flex;justify-content:space-between"><div><strong>${p.name}</strong><div class="muted">$${p.price}</div></div><div><small class="muted">ID: ${p.id}</small></div></div><p class="muted">${p.desc}</p></div>`
    )
    .join('');
}

function renderAdminUsers() {
  const el = document.getElementById('adminUsers');
  if (!el) return;

  const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
  const current = JSON.parse(localStorage.getItem('user') || 'null');

  const rows = [];
  if (current) rows.push(current);
  registered.forEach((r) => rows.push(r));

  if (!rows.length) {
    el.innerHTML = '<p class="muted">No users (demo)</p>';
    return;
  }

  el.innerHTML = rows
    .map((u, i) => `
      <div class="card" style="padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div><strong>${u.name || u.email}</strong></div>
          <div class="muted">${u.email || ''}</div>
        </div>
        <div>
          <button class="btn secondary" data-idx="${i}" onclick="removeRegisteredUser(${i})">Remove</button>
        </div>
      </div>
    `)
    .join('');
}

function removeRegisteredUser(idx) {
  const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
  if (idx < 0 || idx >= registered.length) return;
  registered.splice(idx, 1);
  localStorage.setItem('registered_users', JSON.stringify(registered));
  renderAdminUsers();
}

function showAdminSection(name) {
  const prod = document.getElementById('adminProducts');
  const users = document.getElementById('adminUsers');
  if (!prod || !users) return;

  prod.style.display = name === 'products' ? 'block' : 'none';
  users.style.display = name === 'users' ? 'block' : 'none';

  if (name === 'products') renderAdminProducts();
  if (name === 'users') renderAdminUsers();
}

function deleteOrder(id) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const key = 'orders_' + (user && user.email ? user.email : 'guest');
  let orders = JSON.parse(localStorage.getItem(key) || '[]');
  orders = orders.filter((o) => o.id != id);
  localStorage.setItem(key, JSON.stringify(orders));
  location.reload();
}
