function renderAdminProducts() {
  const el = document.getElementById('adminProducts');
  if (!el) return;
  if (!window.PRODUCTS || !window.PRODUCTS.length) {
    fetchProducts().then(() => renderAdminProducts());
    return;
  }
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h4>Products</h4><button id="addProductBtn" class="btn">Add Product</button></div>
    ${window.PRODUCTS
      .map(
        (p) => `
      <div class="card" style="padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div><strong>${p.name}</strong></div>
          <div class="muted">$${p.price} — ID: ${p.id}</div>
          <div class="muted">${p.desc || ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn" data-action="edit-product" data-id="${p.id}">Edit</button>
          <button class="btn secondary" data-action="delete-product" data-id="${p.id}">Delete</button>
        </div>
      </div>`
      )
      .join('')}
  `;
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
          <div><strong>${u.first_name || u.email}</strong></div>
          <div class="muted">${u.email || ''}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn" data-action="edit-user" data-id="${u.user_id}">Edit</button>
          <button class="btn secondary" data-action="delete-user" data-id="${u.user_id}">Remove</button>
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

// handle only delete-user buttons inside adminUsers (avoid catching edit buttons)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#adminUsers button[data-action="delete-user"]');
  if (!btn) return;
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
});

// delegated handler for admin actions (product/user edit/delete/add)
document.addEventListener('click', (e) => {
  const act = e.target.closest('button[data-action]');
  if (!act) return;
  const action = act.getAttribute('data-action');
  const id = act.getAttribute('data-id');

  if (action === 'delete-product') {
    if (!confirm('Delete product #' + id + '?')) return;
    fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'same-origin' }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete product');
        return;
      }
      fetchProducts().then(() => renderAdminProducts());
    }).catch(() => alert('Failed to contact server'));
    return;
  }

  if (action === 'edit-product') {
    // fetch product and open modal
    fetch(`/api/products/${id}`).then(async (res) => {
      if (!res.ok) { alert('Failed to load product'); return; }
      const p = await res.json();
      openProductModal(p);
    }).catch(() => alert('Failed to contact server'));
    return;
  }

  if (action === 'delete-user') {
    if (!confirm('Delete user #' + id + '?')) return;
    fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'same-origin' }).then(async (res) => {
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'Failed'); return; }
      renderAdminUsers();
    }).catch(() => alert('Failed to contact server'));
    return;
  }

  if (action === 'edit-user') {
    // fetch user list and find the record to prefill modal
    fetch('/api/users', { credentials: 'same-origin' }).then(async (res) => {
      if (!res.ok) { alert('Failed to load user'); return; }
      const rows = await res.json().catch(() => []);
      const u = (rows || []).find(r => String(r.user_id) === String(id));
      openUserModal(u || { user_id: id });
    }).catch(() => openUserModal({ user_id: id }));
    return;
  }
});

// add product button
document.addEventListener('click', (e) => {
  const b = e.target.closest('#addProductBtn');
  if (!b) return;
  openProductModal();
});

function createModal() {
  let m = document.getElementById('adminModal');
  if (m) return m;
  m = document.createElement('div');
  m.id = 'adminModal';
  m.style = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);z-index:9999';
  m.innerHTML = `<div id="adminModalContent" style="background:#fff;padding:18px;max-width:720px;width:100%;border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,0.2)"></div>`;
  document.body.appendChild(m);
  m.addEventListener('click', (ev) => { if (ev.target === m) closeModal(); });
  // inject modal styles once
  if (!document.getElementById('adminModalStyles')) {
    const s = document.createElement('style');
    s.id = 'adminModalStyles';
    s.textContent = `
      #adminModalContent { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; }
      #adminModalContent h3 { margin:0 0 12px; font-size:18px; }
      #adminModalContent .admin-form label { display:block; margin-bottom:8px; font-size:13px; color:#333; }
      #adminModalContent .admin-form input, #adminModalContent .admin-form textarea, #adminModalContent .admin-form select { width:100%; padding:8px 10px; border:1px solid #e0e0e0; border-radius:6px; box-sizing:border-box; font-size:14px }
      #adminModalContent .admin-form textarea { min-height:100px; resize:vertical }
      #adminModalContent .form-row { display:flex; gap:12px; margin-bottom:8px }
      #adminModalContent .form-row .col { flex:1 }
      #adminModalContent .modal-actions { display:flex;gap:8px;justify-content:flex-end;margin-top:12px }
      #adminModalContent label span.label { display:block; margin-bottom:6px; font-weight:600 }
    `;
    document.head.appendChild(s);
  }
  return m;
}

function closeModal() {
  const m = document.getElementById('adminModal');
  if (m) m.remove();
}

function openProductModal(p) {
  const m = createModal();
  const content = m.querySelector('#adminModalContent');
  const isEdit = !!(p && p.id);
  content.innerHTML = `
    <h3>${isEdit ? 'Edit' : 'Add'} Product</h3>
    <form id="productForm" class="admin-form">
      <div class="form-row">
        <div class="col"><label><span class="label">Name</span><input name="name" value="${isEdit ? (p.name||'') : ''}" required></label></div>
        <div class="col" style="max-width:140px"><label><span class="label">Price</span><input name="price" type="number" step="0.01" value="${isEdit ? (p.price||0) : 0}" required></label></div>
        <div class="col" style="max-width:120px"><label><span class="label">Stock</span><input name="stock_quantity" type="number" value="${isEdit ? (p.stock_quantity||0) : 0}"></label></div>
      </div>
      <div class="form-row">
        <div class="col"><label><span class="label">Category ID</span><input name="category_id" value="${isEdit ? (p.category||'') : ''}"></label></div>
        <div class="col"><label><span class="label">Image URL</span><input name="image" value="${isEdit ? (p.image||'') : ''}"></label></div>
      </div>
      <label><span class="label">Description</span><textarea name="desc">${isEdit ? (p.desc||'') : ''}</textarea></label>
      <div class="modal-actions">
        <button type="button" id="cancelModal" class="btn secondary">Cancel</button>
        <button type="submit" class="btn">${isEdit ? 'Save' : 'Create'}</button>
      </div>
    </form>
  `;

  content.querySelector('#cancelModal').addEventListener('click', closeModal);
  content.querySelector('#productForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const form = new FormData(ev.target);
    const body = {};
    form.forEach((v, k) => { body[k] = v; });
    body.price = parseFloat(body.price || 0);
    body.stock_quantity = parseInt(body.stock_quantity || 0);

    if (isEdit) {
      fetch(`/api/products/${p.id}`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (res) => {
        if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'Failed'); return; }
        closeModal();
        fetchProducts().then(() => renderAdminProducts());
      }).catch(() => alert('Failed to contact server'));
    } else {
      fetch('/api/products', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (res) => {
        if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'Failed'); return; }
        closeModal();
        fetchProducts().then(() => renderAdminProducts());
      }).catch(() => alert('Failed to contact server'));
    }
  });
}

function openUserModal(u) {
  const m = createModal();
  const content = m.querySelector('#adminModalContent');
  const isEdit = !!(u && u.user_id);
  content.innerHTML = `
    <h3>Edit User</h3>
    <form id="userForm" class="admin-form">
      <div class="form-row">
        <div class="col"><label><span class="label">Email</span><input name="email" value="${isEdit ? (u.email||'') : ''}"></label></div>
      </div>
      <div class="form-row">
        <div class="col"><label><span class="label">First name</span><input name="first_name" value="${isEdit ? (u.first_name||'') : ''}"></label></div>
        <div class="col"><label><span class="label">Last name</span><input name="last_name" value="${isEdit ? (u.last_name||'') : ''}"></label></div>
      </div>
      <div class="form-row">
        <div class="col" style="max-width:140px"><label><span class="label">Role ID</span><input name="role_id" type="number" value="${isEdit ? (u.role_id||0) : 0}"></label></div>
        <div class="col"><label><span class="label">Password (leave blank to keep)</span><input name="password" type="password"></label></div>
      </div>
      <div class="modal-actions">
        <button type="button" id="cancelUserModal" class="btn secondary">Cancel</button>
        <button type="submit" class="btn">Save</button>
      </div>
    </form>
  `;

  content.querySelector('#cancelUserModal').addEventListener('click', closeModal);
  content.querySelector('#userForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const form = new FormData(ev.target);
    const body = {};
    form.forEach((v, k) => { if (v !== '') body[k] = v; });
    if (!isEdit) { alert('Missing user id'); return; }
    fetch(`/api/users/${u.user_id}`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (res) => {
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'Failed'); return; }
      closeModal();
      renderAdminUsers();
    }).catch(() => alert('Failed to contact server'));
  });
}
