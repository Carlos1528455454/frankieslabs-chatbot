const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config(); // Solo se necesita si ejecutas en local

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Ruta POST para recibir mensajes del frontend
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  // Validación básica: verificar que se envió un mensaje
  if (!message) {
    return res.status(400).json({ error: "No se recibió ningún mensaje" });
  }

  try {
    // Mostrar la API Key en logs (solo para depuración, eliminar luego)
    console.log("API KEY:", process.env.OPENAI_API_KEY); 

    //
