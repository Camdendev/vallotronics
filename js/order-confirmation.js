const id = qs('id');
const user = JSON.parse(localStorage.getItem('user') || 'null');
const key = 'orders_' + (user && user.email ? user.email : 'guest');
const orders = JSON.parse(localStorage.getItem(key) || '[]');
const o = orders.find((x) => x.id == id) || orders[orders.length - 1];

const el = document.getElementById('conf');
if (!o) {
  el.innerHTML = '<p class="muted">Order not found.</p>';
} else {
  // compute totals
  let subtotal = 0;
  const itemsHtml = o.items.map((i) => {
    const p = findProduct(i.id);
    const line = (p.price * i.qty);
    subtotal += line;
    return `<li class="muted">${p.name} x${i.qty} — <strong>$${(line).toFixed(2)}</strong></li>`;
  }).join('');

  const tax = subtotal * 0.07;
  const ship = 4.99;
  const total = subtotal + tax + ship;

  el.innerHTML = `
    <div class="card">
      <h3>Order #${o.id}</h3>
      <p class="muted">Thank you! Your order has been received and is being processed.</p>

      <h4>Shipping</h4>
      <div class="specs">
        <div>${o.shipping.name}</div>
        <div>${o.shipping.address}</div>
        <div>${o.shipping.city} ${o.shipping.zip}</div>
      </div>

      <h4 style="margin-top:12px">Items</h4>
      <ul>${itemsHtml}</ul>

      <div class="summary-card" style="margin-top:12px">
        <div class="summary-line"><span>Subtotal</span> <strong>$${subtotal.toFixed(2)}</strong></div>
        <div class="summary-line"><span>Est. tax</span> <strong>$${tax.toFixed(2)}</strong></div>
        <div class="summary-line"><span>Shipping</span> <strong>$${ship.toFixed(2)}</strong></div>
        <hr>
        <div class="summary-line"><strong>Total</strong> <strong>$${total.toFixed(2)}</strong></div>
      </div>

      <div style="margin-top:14px;display:flex;gap:8px">
        <a href="products.html" class="btn">Continue shopping</a>
        <a href="dashboard.html" class="btn secondary">View orders</a>
      </div>
    </div>
  `;
}
