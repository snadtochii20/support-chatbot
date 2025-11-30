const API_BASE = 'http://localhost:3000';

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const errorP = document.getElementById('authError');

async function sendAuth(path) {
  errorP.textContent = '';

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    errorP.textContent = 'Введіть email та пароль.';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorP.textContent = data.error || 'Помилка.';
      return;
    }

    // зберігаємо userId і переходимо до чату
    localStorage.setItem('userId', data.userId);
    window.location.href = 'chat.html';
  } catch (err) {
    console.error(err);
    errorP.textContent = 'Помилка зʼєднання з сервером.';
  }
}

loginBtn.addEventListener('click', () => sendAuth('login'));
registerBtn.addEventListener('click', () => sendAuth('register'));
