const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const db = require('./db');

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ====== РЕЄСТРАЦІЯ КОРИСТУВАЧА ======
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email і пароль обовʼязкові.' });
  }

  const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
  db.run(sql, [email, password], function (err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Користувач з таким email вже існує.' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Помилка бази даних.' });
    }

    res.json({ userId: this.lastID });
  });
});

// ====== ЛОГІН ======
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT id, password FROM users WHERE email = ?';
  db.get(sql, [email], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Помилка бази даних.' });
    }

    if (!row || row.password !== password) {
      return res.status(401).json({ error: 'Невірний email або пароль.' });
    }

    res.json({ userId: row.id });
  });
});

// ====== ІСТОРІЯ ПОВІДОМЛЕНЬ ======
app.get('/api/history', (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ error: 'Не переданий userId.' });
  }

  const sql = `
    SELECT role, content, created_at
    FROM messages
    WHERE user_id = ?
    ORDER BY created_at ASC
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Помилка бази даних.' });
    }

    res.json(rows);
  });
});

// ====== ЧАТ З OpenAI ======
app.post('/api/chat', async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'Потрібні userId і message.' });
  }

  // зберігаємо повідомлення користувача
  db.run(
    'INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)',
    [userId, 'user', message],
    err => {
      if (err) console.error('DB error (user msg):', err);
    }
  );

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Не вказаний OPENAI_API_KEY в .env.' });
    }

    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'Ти дружній чатбот, відповідай українською.' },
          { role: 'user', content: message },
        ],
      }),
    });

    const data = await openAiRes.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      'Сталася помилка при отриманні відповіді від моделі.';

    // зберігаємо відповідь бота
    db.run(
      'INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)',
      [userId, 'assistant', reply],
      err => {
        if (err) console.error('DB error (assistant msg):', err);
      }
    );

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка при зверненні до OpenAI.' });
  }
});

// ====== ЗАПУСК СЕРВЕРА ======
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
