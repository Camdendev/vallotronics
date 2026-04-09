document.getElementById('showRegister').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('registerSection').style.display = 'block';
});

document.getElementById('cancelRegister').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('registerSection').style.display = 'none';
  document.getElementById('loginSection').style.display = 'block';
});

// login form handled via API below
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email: email, password })
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Login failed');
      return;
    }
    // server sets session; sync any local cart to server then redirect
    try {
      const local = (window.app && typeof window.app.getCart === 'function') ? window.app.getCart() : JSON.parse(localStorage.getItem('local_cart') || '[]');
      if (Array.isArray(local) && local.length) {
        await Promise.all(local.map((it) => fetch('/api/add_to_cart', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: Number(it.id), quantity: Number(it.qty) }) })));
        if (window.app && typeof window.app.clearLocalCart === 'function') window.app.clearLocalCart(); else localStorage.removeItem('local_cart');
      }
    } catch (e) {
      console.warn('Failed to sync local cart on login', e);
    }

    location.href = '/dashboard.html';
  }).catch((e) => {
    console.error(e);
    alert('Login failed');
  });
});