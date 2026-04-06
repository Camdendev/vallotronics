let user = null;
const g = document.getElementById('dashGreeting');
function capitalizeName(str) {
  if (!str) return '';
  return String(str)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Load user and orders from server
fetch('/api/me').then(r => r.json()).then((u) => {
  user = u;
  const rawDisplay = user && user.email ? user.email.split('@')[0] : (user && (user.first_name || user.username) ? (user.first_name || user.username) : '');
  const display = capitalizeName(rawDisplay);
  if (g) g.textContent = user ? `Hi, ${display}` : 'Your Dashboard';

  const profileEl = document.getElementById('profile');
  const adminEl = document.getElementById('adminOptions');

  if (user) {
    profileEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px">
        <div><strong>${display}</strong></div>
      </div>
    `;

    if (user.role_id && user.role_id == 1) {
      adminEl.innerHTML = '';
      const panel = document.getElementById('adminPanel');
      if (panel) panel.style.display = 'block';
      document.getElementById('showManageProducts')?.addEventListener('click', () => showAdminSection('products'));
      document.getElementById('showManageUsers')?.addEventListener('click', () => showAdminSection('users'));
    } else {
      adminEl.innerHTML = '';
    }
  } else {
    profileEl.innerHTML = `<p class="muted">Not logged in — <a href="login.html">login</a></p>`;
    adminEl.innerHTML = '';
  }

  fetch('/api/orders').then(r => r.json()).then((orders) => {
    const ordersHtml = (orders && orders.length) ? orders.map((o) => {
      let subtotal = 0;
      o.items.forEach((it) => {
        const p = findProduct(it.item_id);
        if (p) subtotal += p.price * it.quantity;
      });
      const tax = subtotal * 0.07;
      const ship = 4.99;
      const total = subtotal + tax + ship;

      const itemsHtml = o.items.map((it) => {
        const p = findProduct(it.item_id) || { name: 'Unknown', price: 0 };
        return `<div class="muted">${p.name} x${it.quantity} — <strong>$${(p.price * it.quantity).toFixed(2)}</strong></div>`;
      }).join('');

      return `
            <div class="card" style="padding:12px;margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong>Order ${o.id}</strong>
                <div class="muted">${o.items.length} items</div>
              </div>
              <div class="muted" style="margin-top:8px">${o.shipping && o.shipping.address ? o.shipping.address + ', ' + (o.shipping.city || '') : ''}</div>
              <div style="margin-top:8px">${itemsHtml}</div>
              <div class="summary-line" style="margin-top:10px"><span>Total</span> <strong>$${total.toFixed(2)}</strong></div>
              <div style="margin-top:8px;display:flex;gap:8px">
                <a class="btn secondary" href="order-confirmation.html?id=${o.id}">View</a>
              </div>
            </div>
          `;
    }).join('') : '<p class="muted">No orders</p>';

    document.getElementById('orders').innerHTML = ordersHtml;
  });
});
