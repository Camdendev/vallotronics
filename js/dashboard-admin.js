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
  // fetch users from server (admin only)
  fetch('/api/users', { credentials: 'same-origin' }).then(async (res) => {
    const rows = await res.json();
    if (!rows || !rows.length) {
      el.innerHTML = '<p class="muted">No users</p>';
      return;
    }

    el.innerHTML = rows
      .map((u) => `
      <div class="card" style="padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div><strong>${u.first_name || u.username || u.email}</strong></div>
          <div class="muted">${u.email || ''}</div>
        </div>
        <div>
          <button class="btn secondary" data-id="${u.user_id}">Remove</button>
        </div>
      </div>
    `)
      .join('');
  }).catch(() => {
    el.innerHTML = '<p class="muted">Failed to load users</p>';
  });
}

function removeRegisteredUser(idx) {
  // deprecated: server-managed users now
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
  // call server delete endpoint; admin or owner allowed
  fetch(`/api/orders/${id}`, { method: 'DELETE', credentials: 'same-origin' }).then(async (res) => {
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || 'Failed to delete order');
      return;
    }
    location.reload();
  }).catch(() => { alert('Failed to contact server'); });
}

// handle remove user button
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#adminUsers button[data-id]');
  if (btn) {
    const id = btn.getAttribute('data-id');
    if (!id) return;
    if (!confirm('Delete user #' + id + '?')) return;
    fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'same-origin' }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete user');
        return;
      }
      renderAdminUsers();
    }).catch(() => { alert('Failed to contact server'); });
  }
});
