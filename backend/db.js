const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// шлях до файлу бази даних (chat.db буде лежати поруч із db.js)
const dbPath = path.join(__dirname, 'chat.db');
const db = new sqlite3.Database(dbPath);

// створюємо таблиці, якщо їх ще немає
db.serialize(() => {
  // Таблиця користувачів
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Таблиця повідомлень
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

module.exports = db;

