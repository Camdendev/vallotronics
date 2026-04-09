const id = qs('id') || (location.pathname.match(/order-confirmation\/(\d+)/) || [])[1];
const el = document.getElementById('conf');

fetch(`/api/orders/${id}`, { credentials: 'same-origin' }).then(async (res) => {
  if (!res.ok) {
    el.innerHTML = '<p class="muted">Order not found or you must be logged in.</p>';
    return;
  }
  const o = await res.json();
  let subtotal = 0;
  const itemsHtml = o.items.map((i) => {
    const p = findProduct(i.item_id) || { name: 'Unknown', price: 0 };
    const line = (p.price * i.quantity);
    subtotal += line;
    return `<li class="muted">${p.name} x${i.quantity} — <strong>$${(line).toFixed(2)}</strong></li>`;
  }).join('');

  const tax = subtotal * 0.07;
  const ship = 4.99;
  const total = subtotal + tax + ship;
  el.innerHTML = `
    <div class="card">
      <h3>Order #${o.order_number || o.id}</h3>
      <p class="muted">Thank you! Your order has been received and is being processed.</p>

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
        <a href="/products.html" class="btn">Continue shopping</a>
        <a href="/dashboard.html" class="btn secondary">View orders</a>
      </div>
    </div>
  `;
}).catch(() => {
  el.innerHTML = '<p class="muted">Order fetch failed.</p>';
});
