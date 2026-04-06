document.getElementById('regForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const payload = {
    username: document.getElementById('email').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password') ? document.getElementById('password').value : '',
    first_name: document.getElementById('name') ? document.getElementById('name').value : ''
  };

  fetch('/api/register', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Registration failed');
      return;
    }
    // server sets session; redirect and let header fetch /api/me
    location.href = '/dashboard.html';
  }).catch((e) => {
    console.error(e);
    alert('Registration failed');
  });
});