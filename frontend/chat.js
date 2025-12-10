// frontend/chat.js
const API_BASE = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
  const messagesDiv    = document.getElementById('messages');
  const messageInput   = document.getElementById('messageInput');
  const sendBtn        = document.getElementById('sendBtn');
  const logoutBtn      = document.getElementById('logoutBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  // ===== Права колонка – ТІЛО таблиці з історією =====
  const historyBody = document.getElementById('historyBody');   // <tbody id="historyBody">

  // айді користувача
  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = 'index.html';
    return;
  }

  // ===== Допоміжні функції =====
  function addMessage(role, text, scroll = true) {
    if (!messagesDiv) return;

    const wrapper = document.createElement('div');
    wrapper.className = role === 'user' ? 'msg msg-user' : 'msg msg-bot';

    wrapper.innerHTML = `
      <div class="msg-avatar">${role === 'user' ? '😊' : '🤖'}</div>
      <div class="msg-body">${text}</div>
    `;

    messagesDiv.appendChild(wrapper);
    if (scroll) messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function formatDateTime(dtStr) {
    const d = new Date(dtStr);
    const date = d.toLocaleDateString('uk-UA');
    const time = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  }

  // 👉 НОВА функція: додає один рядок у таблицю історії
  function addHistoryRow(time, who, message) {
    if (!historyBody) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="history-time">${time}</td>
      <td class="history-who ${who === 'AI' ? 'ai' : 'user'}">${who}</td>
      <td class="history-text">${message}</td>
    `;
    historyBody.appendChild(tr);
  }

  // ===== Історія з сервера =====
  async function loadHistory() {
    // якщо таблиці немає – нічого не робимо
    if (!historyBody) return;

    try {
      const res = await fetch(`${API_BASE}/api/history?userId=${encodeURIComponent(userId)}`);
      const rows = await res.json();

      // очистити попередній вміст tbody
      historyBody.innerHTML = '';

      rows.forEach(row => {
        const time = formatDateTime(row.created_at);
        const who = row.role === 'user' ? 'Ви' : 'AI';
        const message = row.content;

        // замість ручного створення <td> використовуємо красиву функцію
        addHistoryRow(time, who, message);
      });
    } catch (err) {
      console.error('History load error:', err);
    }
  }

  // ===== Відправка повідомлення =====
  async function sendMessage() {
    if (!messageInput) return;

    const text = messageInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    messageInput.value = '';

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: text }),
      });

      const data = await res.json();

      if (data.reply) {
        addMessage('assistant', data.reply);
      } else if (data.error) {
        addMessage('assistant', 'Помилка: ' + data.error);
      }

      // після нового повідомлення оновлюємо таблицю історії
      loadHistory();
    } catch (err) {
      console.error(err);
      addMessage('assistant', 'Помилка зʼєднання з сервером.');
    }
  }

  // ===== Події =====
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }
  if (messageInput) {
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('userId');
      window.location.href = 'index.html';
    });
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('bg-dark');
      document.body.classList.toggle('text-white');
    });
  }

  // підтягнути історію при завантаженні
  loadHistory();
});
