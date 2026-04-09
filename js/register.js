console.log('register.js loaded');
window.onload = () => {
  const form = document.getElementById('regForm');
  if (!form) {
    console.error('regForm not found');
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('register form submit');

    const nameVal = document.getElementById('name').value;
    const parts = nameVal.trim().split(/\s+/).filter(Boolean);
    const payload = {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      first_name: parts.length ? parts.shift() : '',
      last_name: parts.length ? parts.join(' ') : ''
    };

    console.log('register payload', payload);

    fetch('/api/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('register failed', body);
        alert(body.error || 'Registration failed');
        return;
      }
      // server sets session; redirect and let header fetch /api/me
      location.href = '/dashboard.html';
    }).catch((e) => {
      console.error(e);
      alert('Registration failed');
    });
  });
};