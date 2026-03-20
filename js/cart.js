(function () {
  function renderCart() {
    const listEl = document.getElementById('cart');
    const summaryEl = document.getElementById('summary');
    const cart = getCart();

    if (!listEl || !summaryEl) return;

    if (!cart.length) {
      listEl.innerHTML = '<p class="muted">Cart is empty</p>';
      summaryEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = cart
      .map((it) => {
        const p = findProduct(it.id) || { name: 'Unknown', price: 0, image: '' };
        return `
          <div class="card cart-item">
            <img src="${p.image}" style="width:96px;height:72px;border-radius:6px;object-fit:cover">
            <div>
              <h4>${p.name}</h4>
              <div class="muted">$${p.price.toFixed(2)} each</div>
              <div style="margin-top:8px">Qty: <input type="number" min="1" value="${it.qty}" data-id="${p.id}" style="width:72px"></div>
              <p style="margin-top:8px"><button data-remove="${p.id}" class="btn secondary">Remove</button></p>
            </div>
          </div>
        `;
      })
      .join('');

    const subtotal = cart.reduce((s, i) => {
      const p = findProduct(i.id) || { price: 0 };
      return s + p.price * i.qty;
    }, 0);

    const tax = subtotal * 0.07;
    const ship = 4.99;
    const total = subtotal + tax + ship;

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const checkoutControl = user
      ? `<div class="summary-primary" style="margin-top:30px;margin-bottom:18px;clear:both"><a href="checkout.html" class="btn">Proceed to checkout</a></div>`
      : `<div class="summary-primary muted" style="margin-top:40px;margin-bottom:18px;clear:both">Please <a href="login.html">log in</a> to checkout.</div>`;

    summaryEl.innerHTML = `
      <h3>Order Summary</h3>
      <div class="summary-line"><span>Subtotal</span> <strong>$${subtotal.toFixed(2)}</strong></div>
      <div class="summary-line"><span>Estimated tax</span> <strong>$${tax.toFixed(2)}</strong></div>
      <div class="summary-line"><span>Shipping</span> <strong>$${ship.toFixed(2)}</strong></div>
      <hr>
      <div class="summary-line"><strong>Total</strong> <strong>$${total.toFixed(2)}</strong></div>
      ${checkoutControl}
      <div class="summary-actions" style="margin-top:24px;clear:both"><a href="products.html" class="btn secondary">Continue shopping</a></div>
    `;
  }

  document.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      const id = removeBtn.getAttribute('data-remove');
      if (id) {
        app.removeFromCart(id);
        renderCart();
      }
    }
  });

  document.addEventListener('change', (e) => {
    const input = e.target.closest('input[data-id]');
    if (input) {
      const id = input.getAttribute('data-id');
      const val = input.value;
      if (id && val) {
        app.updateQty(id, val);
        renderCart();
      }
    }
  });

  document.addEventListener('DOMContentLoaded', renderCart);
  window.renderCart = renderCart;
})();
