// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* ========= РЕЄСТРАЦІЯ ========= */
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email і пароль обовʼязкові' });
  }

  db.run(
    'INSERT INTO users (email, password) VALUES (?, ?)',
    [email, password],
    function (err) {
      if (err) {
        return res.status(400).json({ error: 'Користувач існує' });
      }
      res.json({ userId: this.lastID });
    }
  );
});

/* ========= ЛОГІН ========= */
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.get(
    'SELECT id FROM users WHERE email = ? AND password = ?',
    [email, password],
    (err, row) => {
      if (!row) {
        return res.status(401).json({ error: 'Невірні дані' });
      }
      res.json({ userId: row.id });
    }
  );
});


// ===== ІСТОРІЯ ПОВІДОМЛЕНЬ =====
app.get('/api/history', (req, res) => {
  const userId = req.query.userId;      // /api/history?userId=123

  if (!userId) {
    return res.status(400).json({ error: 'Не переданий userId.' });
  }

  const sql = `
    SELECT created_at, role, content
    FROM messages
    WHERE user_id = ?
    ORDER BY created_at ASC
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error('DB history error', err);
      return res.status(500).json({ error: 'Помилка бази даних.' });
    }

    res.json(rows);   // [{created_at, role, content}, ...]
  });
});

/* ========= ЧАТ З OpenAI ========= */
app.post('/api/chat', async (req, res) => {
  const { userId, message } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY не знайдено' });
  }

  db.run(
    'INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)',
    [userId, 'user', message]
  );

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: message }],
      }),
    });

    const data = await aiRes.json();
    const reply = data.choices?.[0]?.message?.content || 'Помилка відповіді';

    db.run(
      'INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)',
      [userId, 'assistant', reply]
    );

    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: 'Помилка OpenAI' });
  }
});

/* ========= СТАРТ ========= */
app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});

