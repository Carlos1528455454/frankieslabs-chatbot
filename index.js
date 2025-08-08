const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config(); // Solo útil en local

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "No se recibió ningún mensaje" });
  }

  try {
    console.log("API KEY:", process.env.OPENAI_API_KEY); // Solo para depuración

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      console.error("Respuesta no válida de OpenAI:", data);
      return res.status(500).json({ error: "No se recibió respuesta válida de la API" });
    }

    const reply = data.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("Error real:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor funcionando en http://localhost:${port}`);
});
