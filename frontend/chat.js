// ===== Налаштування =====
const API_BASE = "http://localhost:3000";

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

// айді користувача (якщо в auth.js ти зберігав localStorage)
let userId = localStorage.getItem("userId") || "anonymous";

// ---- Допоміжні функції ----
function addMessage(role, text, scroll = true) {
  const wrapper = document.createElement("div");
  wrapper.className = role === "user" ? "msg msg-user" : "msg msg-bot";

  wrapper.innerHTML = `
    <div class="msg-avatar">
      ${role === "user" ? "😊" : "🤖"}
    </div>
    <div class="msg-body">
      ${text}
    </div>
  `;

  messagesDiv.appendChild(wrapper);
  if (scroll) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

// ---- ЗБЕРЕЖЕННЯ В FIREBASE ----
async function saveMessageToFirebase(role, content) {
  try {
    await db.collection("messages").add({
      userId: userId,
      role: role,
      content: content,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("Firebase save error:", err);
  }
}

// ---- ЗАВАНТАЖЕННЯ ІСТОРІЇ З FIREBASE ----
function loadHistoryFromFirebase() {
  db.collection("messages")
    .where("userId", "==", userId)
    .orderBy("createdAt")
    .onSnapshot((snapshot) => {
      messagesDiv.innerHTML = "";
      snapshot.forEach((doc) => {
        const m = doc.data();
        addMessage(m.role, m.content, false);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// ---- ВІДПРАВКА ПОВІДОМЛЕННЯ БОТУ ----
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  // показати в інтерфейсі
  addMessage("user", text);
  // зберегти в Firebase
  saveMessageToFirebase("user", text);

  messageInput.value = "";

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message: text }),
    });

    const data = await res.json();

    if (data.reply) {
      addMessage("assistant", data.reply);
      saveMessageToFirebase("assistant", data.reply);
    } else if (data.error) {
      addMessage("assistant", "Помилка: " + data.error);
    }
  } catch (err) {
    console.error(err);
    addMessage("assistant", "Помилка зʼєднання з сервером.");
  }
}

// ---- Обробники подій ----
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("userId");
  window.location.href = "index.html";
});

// Темна/світла тема (простий приклад)
themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("bg-dark");
  document.body.classList.toggle("text-white");
});

// Перший запуск: підтягуємо історію
loadHistoryFromFirebase();
