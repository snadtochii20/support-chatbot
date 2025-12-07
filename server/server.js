require("dotenv").config();
const OpenAI = require("openai");
const express = require("express");
const cors = require("cors");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const PORT = process.env.PORT || 3000;

// дозволяємо JSON і запити з фронтенду
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful support chatbot." },
        { role: "user", content: message },
      ],
    });

    const answer = response.choices[0].message.content;
    res.json({ reply: answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
