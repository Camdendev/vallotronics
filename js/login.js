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

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username: email, password })
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Login failed');
        return;
      }
      // server sets session; redirect and let header fetch /api/me
      location.href = '/dashboard.html';
    }).catch((e) => {
      console.error(e);
      alert('Login failed');
    });
  });

document.getElementById('regForm').addEventListener('submit', (e) => {
  e.preventDefault();
  // submit handled by /api/register via register.js; keep fallback UX
  const form = document.getElementById('regForm');
  if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
});
