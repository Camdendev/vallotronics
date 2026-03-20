function updateSummary() {
  const cart = getCart();

  const placeBtn = document.getElementById('placeOrderBtn');

  if (!cart.length) {
    document.getElementById('orderItems').innerHTML = '<p class="muted">Cart is empty</p>';
    if (placeBtn) { placeBtn.disabled = true; placeBtn.textContent = 'Place Order'; }
    return;
  }

  let subtotal = 0;
  // do not show item list or count in the summary
  const itemsEl = document.getElementById('orderItems');
  itemsEl.innerHTML = '';
  cart.forEach((i) => {
    const p = findProduct(i.id);
    subtotal += p.price * i.qty;
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

updateSummary();

// Autofill shipping full name from logged-in user (capitalized); do NOT autofill card name
(function autofillShippingName() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return;

  const raw = user.name || (user.email ? user.email.split('@')[0] : '');
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
})();

document.getElementById('checkoutForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const cart = getCart();
  if (!cart.length) {
    alert('Cart empty');
    return;
  }

  const order = {
    id: Date.now(),
    items: cart,
    shipping: {
      name: document.getElementById('fullname').value,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      zip: document.getElementById('zip').value
    }
  };

  placeOrder(order);
  location.href = 'order-confirmation.html?id=' + order.id;
});
