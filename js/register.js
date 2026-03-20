document.getElementById('regForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const u = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value
  };

  localStorage.setItem('user', JSON.stringify(u));
  location.href = 'dashboard.html';
});
