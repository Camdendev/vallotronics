const user = JSON.parse(localStorage.getItem('user') || 'null');

const g = document.getElementById('dashGreeting');
function capitalizeName(str) {
  if (!str) return '';
  return String(str)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const rawDisplay = user && user.email ? user.email.split('@')[0] : (user && user.name ? user.name : '');
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

  if (user.isAdmin) {
      adminEl.innerHTML = '';
      const panel = document.getElementById('adminPanel');
      if (panel) panel.style.display = 'block';
      document.getElementById('showManageProducts').addEventListener('click', () => showAdminSection('products'));
      document.getElementById('showManageUsers').addEventListener('click', () => showAdminSection('users'));
  } else {
    adminEl.innerHTML = '';
  }
} else {
  profileEl.innerHTML = `<p class="muted">Not logged in — <a href="login.html">login</a></p>`;
  adminEl.innerHTML = '';
}

const userKey = JSON.parse(localStorage.getItem('user') || 'null');
const ordersKey = 'orders_' + (userKey && userKey.email ? userKey.email : 'guest');
const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');

const ordersHtml = orders.length
  ? orders
      .map((o) => {
        let subtotal = 0;
        o.items.forEach((it) => {
          const p = findProduct(it.id);
          if (p) subtotal += p.price * it.qty;
        });
        const tax = subtotal * 0.07;
        const ship = 4.99;
        const total = subtotal + tax + ship;

        const itemsHtml = o.items
          .map((it) => {
              const p = findProduct(it.id) || { name: 'Unknown', price: 0 };
              return `<div class="muted">${p.name} x${it.qty} — <strong>$${(p.price * it.qty).toFixed(2)}</strong></div>`;
            })
          .join('');

        return `
            <div class="card" style="padding:12px;margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong>Order ${o.id}</strong>
                <div class="muted">${o.items.length} items</div>
              </div>
              <div class="muted" style="margin-top:8px">${o.shipping ? o.shipping.address + ', ' + o.shipping.city : ''}</div>
              <div style="margin-top:8px">${itemsHtml}</div>
              <div class="summary-line" style="margin-top:10px"><span>Total</span> <strong>$${total.toFixed(2)}</strong></div>
              <div style="margin-top:8px;display:flex;gap:8px">
                <a class="btn secondary" href="order-confirmation.html?id=${o.id}">View</a>
                <button class="btn secondary" onclick="deleteOrder(${o.id})">Delete</button>
              </div>
            </div>
          `;
      })
      .join('')
  : '<p class="muted">No orders</p>';

document.getElementById('orders').innerHTML = ordersHtml;
