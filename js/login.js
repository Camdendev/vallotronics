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

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const emailOrUser = document.getElementById('email').value.trim();
  const pwd = document.getElementById('password').value;

  // Demo admin: email "admin@admin.com" and password "admin"
  if (emailOrUser.toLowerCase() === 'admin@admin.com' && pwd === 'admin') {
    const admin = { name: 'Admin', email: 'admin@admin.com', isAdmin: true };
    localStorage.setItem('user', JSON.stringify(admin));
    location.href = 'dashboard.html#admin';
    return;
  }

  // Demo user: john@doe.com with password 'john doe'
  if (emailOrUser.toLowerCase() === 'john@doe.com' && pwd === 'john doe') {
    const john = { name: 'John Doe', email: 'john@doe.com' };
    localStorage.setItem('user', JSON.stringify(john));
    location.href = 'dashboard.html';
    return;
  }

  const user = { email: emailOrUser };
  localStorage.setItem('user', JSON.stringify(user));
  location.href = 'dashboard.html';
});

document.getElementById('regForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const u = { name: document.getElementById('name').value, email: document.getElementById('regEmail').value };
  localStorage.setItem('user', JSON.stringify(u));
  location.href = 'dashboard.html';
});
