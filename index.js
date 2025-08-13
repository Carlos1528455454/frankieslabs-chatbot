// index.js — servidor Express para Frankie's Labs Chatbot

require('dotenv').config(); // útil en local; en Render usa "Environment" -> "Environment Variables"
const express = require('express');
const path = require('path');
// Si tu Node es <18, usas node-fetch (ya lo tienes instalado). En Node >=18 puedes usar global fetch.
const fetch = require('node-fetch');

const {
  SYSTEM_PROMPT,
  OUT_OF_SCOPE_MESSAGE,
  SUPPORT_HANDOFF_MESSAGE
} = require('./config/scope');

const app = express();
const port = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Permite cambiar el modelo sin tocar código. Recomendado: gpt-4o-mini por coste/latencia.
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// ─────────────────────────────────────────────────────────────
// Middlewares
// ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Healthcheck básico
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'frankieslabs-chatbot' });
});

// ─────────────────────────────────────────────────────────────
// Utilidad: construye el System Prompt con los textos efectivos
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return SYSTEM_PROMPT
    .replace('{{OUT_OF_SCOPE}}', OUT_OF_SCOPE_MESSAGE)
    .replace('{{SUPPORT_HANDOFF}}', SUPPORT_HANDOFF_MESSAGE);
}

// ─────────────────────────────────────────────────────────────
// Endpoint principal del chat
// Body esperado: { message: string, context?: Array<{role, content}> }
// "context" es opcional por si pasas historial del chat o pasajes RAG.
// ─────────────────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Falta OPENAI_API_KEY en variables de entorno.' });
    }

    const userMsg = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const context = Array.isArray(req.body?.context) ? req.body.context : [];

    if (!userMsg) {
      return res.status(400).json({ error: 'El campo "message" es requerido.' });
    }

    // Construimos prompt de sistema con reglas de alcance + handoff soporte
    const systemPrompt = buildSystemPrompt();

    // Mensajes para la API
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context, // historial o pasajes (si usas RAG)
      { role: 'user', content: userMsg }
    ];

    // Llamada a OpenAI
    const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2, // respuestas estables y pegadas al contexto
        messages
      })
    });

    if (!oaRes.ok) {
      const errText = await oaRes.text();
      console.error('OpenAI API error:', errText);
      return res.status(502).json({ error: 'Error en OpenAI API', detail: errText });
    }

    const data = await oaRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      // Degradación elegante: ofrece pasar a soporte humano
      return res.json({ reply: SUPPORT_HANDOFF_MESSAGE });
    }

    return res.json({ reply });
  } catch (error) {
    console.error('Error interno /chat:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
// Inicio del servidor
// ─────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Servidor Frankie's Labs Chatbot escuchando en puerto ${port}`);
});
