async function renderCart() {
  const listEl = document.getElementById('cart');
  const summaryEl = document.getElementById('summary');
  if (!listEl || !summaryEl) return;

  try {
    const res = await fetch('/api/cart', { credentials: 'same-origin' });
    let cart = await res.json();
    let usedLocal = false;
    if (!cart || !cart.length) {
      const local = (window.app && typeof window.app.getCart === 'function') ? window.app.getCart() : (JSON.parse(localStorage.getItem('local_cart') || '[]'));
      if (!local || !local.length) {
        listEl.innerHTML = '<p class="muted">Cart is empty</p>';
        summaryEl.innerHTML = '';
        return;
      }
      cart = local;
      usedLocal = true;
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

    // show checkout only if server says user is authenticated; if using local cart, require login
    let checkoutControl = `<div class="summary-primary muted" style="margin-top:40px;margin-bottom:18px;clear:both">Please <a href="/login.html">log in</a> to checkout.</div>`;
    if (!usedLocal) {
      try {
        const me = await fetch('/api/me', { credentials: 'same-origin' }).then(r => r.json());
        if (me) {
          checkoutControl = `<div class="summary-primary" style="margin-top:30px;margin-bottom:18px;clear:both"><a href="/checkout.html" class="btn">Proceed to checkout</a></div>`;
        }
      } catch (e) {}
    }

    summaryEl.innerHTML = `
      <h3>Order Summary</h3>
      <div class="summary-line"><span>Subtotal</span> <strong>$${subtotal.toFixed(2)}</strong></div>
      <div class="summary-line"><span>Estimated tax</span> <strong>$${tax.toFixed(2)}</strong></div>
      <div class="summary-line"><span>Shipping</span> <strong>$${ship.toFixed(2)}</strong></div>
      <hr>
      <div class="summary-line"><strong>Total</strong> <strong>$${total.toFixed(2)}</strong></div>
      ${checkoutControl}
      <div class="summary-actions" style="margin-top:24px;clear:both"><a href="/products.html" class="btn secondary">Continue shopping</a></div>
    `;
  } catch (e) {
    listEl.innerHTML = '<p class="muted">Failed to load cart.</p>';
    summaryEl.innerHTML = '';
  }
}

// remove handler: try server endpoint, otherwise refresh
document.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn) {
    const id = removeBtn.getAttribute('data-remove');
    if (id) {
      fetch('/api/remove_from_cart', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: Number(id) }) })
        .then((res) => {
          if (res.status === 401) {
            // unauthenticated: remove from local cart instead
            if (window.app && typeof window.app.removeFromCart === 'function') {
              window.app.removeFromCart(Number(id));
              renderCart();
              return;
            }
            try {
              const local = JSON.parse(localStorage.getItem('local_cart') || '[]');
              const updated = local.filter(i => i.id !== Number(id));
              localStorage.setItem('local_cart', JSON.stringify(updated));
              renderCart();
              return;
            } catch (e) { console.warn('local remove failed', e); }
            alert('Please login to modify your cart');
            return;
          }
          renderCart();
        }).catch(() => {
          alert('Failed to remove item from cart (server).');
        });
    }
  }
});

// qty change: try server update endpoint
document.addEventListener('change', (e) => {
  const input = e.target.closest('input[data-id]');
  if (input) {
    const id = input.getAttribute('data-id');
    const val = input.value;
    if (id && val) {
      fetch('/api/update_cart', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: Number(id), quantity: Number(val) }) })
        .then((res) => {
          if (res.status === 401) {
            // unauthenticated: update local cart
            if (window.app && typeof window.app.updateQty === 'function') {
              window.app.updateQty(Number(id), Number(val));
              renderCart();
              return;
            }
            try {
              const local = JSON.parse(localStorage.getItem('local_cart') || '[]');
              const it = local.find(x => x.id === Number(id));
              if (it) it.qty = Number(val);
              localStorage.setItem('local_cart', JSON.stringify(local));
              renderCart();
              return;
            } catch (e) { console.warn('local update failed', e); }
            alert('Please login to update cart');
            return;
          }
          if (!res.ok) { alert('Failed to update cart'); }
          renderCart();
        }).catch(() => { alert('Cart update failed'); });
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (window.fetchProducts) {
    window.fetchProducts().then(renderCart).catch(renderCart);
  } else {
    renderCart();
  }
});

window.renderCart = renderCart;
