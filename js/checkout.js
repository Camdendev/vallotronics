async function updateSummary() {
  const placeBtn = document.getElementById('placeOrderBtn');
  let cart = [];
  try {
    const res = await fetch('/api/cart', { credentials: 'same-origin' });
    if (res.ok) cart = await res.json();
  } catch (e) {
    cart = [];
  }

  if (!cart || !cart.length) {
    const itemsEl = document.getElementById('orderItems');
    if (itemsEl) itemsEl.innerHTML = '<p class="muted">Cart is empty</p>';
    if (placeBtn) { placeBtn.disabled = true; placeBtn.textContent = 'Place Order'; }
    document.getElementById('subAmt').textContent = '$0.00';
    document.getElementById('taxAmt').textContent = '$0.00';
    document.getElementById('shipAmt').textContent = '$0.00';
    document.getElementById('totalAmt').textContent = '$0.00';
    return;
  }

  let subtotal = 0;
  const itemsEl = document.getElementById('orderItems');
  if (itemsEl) itemsEl.innerHTML = '';

  cart.forEach((it) => {
    const qty = Number(it.quantity ?? it.qty ?? 1);
    const itemId = it.item_id ?? it.itemId ?? it.id;
    const price = (it.price != null) ? Number(it.price) : (it.item && it.item.price ? Number(it.item.price) : null);
    let name = it.name || (it.item && it.item.name) || `Item ${itemId}`;

    let unitPrice = 0;
    if (price != null) unitPrice = price;
    else if (window.findProduct && itemId) {
      const p = findProduct(itemId);
      if (p) {
        unitPrice = Number(p.price || 0);
        name = name === `Item ${itemId}` ? (p.name || name) : name;
      }
    }

    subtotal += unitPrice * qty;
    if (itemsEl) {
      const row = document.createElement('div');
      row.className = 'order-item';
      row.textContent = `${name} — ${qty} × $${unitPrice.toFixed(2)}`;
      itemsEl.appendChild(row);
    }
  });

  const tax = subtotal * 0.07;
  const ship = 4.99;

  document.getElementById('subAmt').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('taxAmt').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('shipAmt').textContent = `$${ship.toFixed(2)}`;
  const total = (subtotal + tax + ship);
  document.getElementById('totalAmt').textContent = `$${total.toFixed(2)}`;
  if (placeBtn) { placeBtn.disabled = false; placeBtn.textContent = `Place Order — $${total.toFixed(2)}`; }
}

document.addEventListener('DOMContentLoaded', () => {
  const init = async () => {
    await updateSummary();

    (function autofillShippingName() {
      fetch('/api/me', { credentials: 'same-origin' }).then(r => r.json()).then((user) => {
        if (!user) return;

        const raw = user.first_name || (user.email ? user.email.split('@')[0] : '');
        if (!raw) return;

        function capitalizeName(str) {
          return String(str)
            .split(/[^A-Za-z0-9]+/)
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        }

        const el = document.getElementById('fullname');
        if (el && !el.value) el.value = capitalizeName(raw);
      }).catch(()=>{});
    }());

    // Let the form submit normally to `/checkout` so server creates the order and redirects
    // (no client-side localStorage placeOrder usage)
    // expiry input formatter: enforce MM/YY and insert slash
    (function formatExpiry() {
      const exp = document.getElementById('expiry');
      if (!exp) return;
      exp.addEventListener('input', (e) => {
        let v = exp.value.replace(/[^0-9]/g, '').slice(0,4);
        if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
        exp.value = v;
      });
      exp.addEventListener('blur', () => {
        const v = exp.value.split('/');
        if (v.length === 2) {
          let mm = v[0].padStart(2,'0');
          let yy = v[1];
          if (yy.length === 4) yy = yy.slice(2);
          exp.value = mm + '/' + yy;
        }
      });
    }());
  };

  if (window.fetchProducts) {
    window.fetchProducts().then(init).catch(init);
  } else {
    init();
  }
});
