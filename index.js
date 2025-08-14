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

// Vars Shopify Storefront
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-07';

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
// Helpers Storefront
// ─────────────────────────────────────────────────────────────
async function callStorefront(query, variables = {}) {
  if (!SHOPIFY_SHOP_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN || !SHOPIFY_API_VERSION) {
    const missing = {
      SHOPIFY_SHOP_DOMAIN: !!SHOPIFY_SHOP_DOMAIN,
      SHOPIFY_STOREFRONT_ACCESS_TOKEN: !!SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      SHOPIFY_API_VERSION: !!SHOPIFY_API_VERSION
    };
    const err = new Error('Faltan variables de entorno de Shopify');
    err.missing = missing;
    throw err;
  }

  const resp = await fetch(`https://${SHOPIFY_SHOP_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await resp.json();
  if (!resp.ok || json.errors) {
    const err = new Error('Error Storefront');
    err.status = resp.status;
    err.details = json.errors || json;
    throw err;
  }
  return json.data;
}

// Pequeño normalizador para extraer términos de búsqueda del mensaje del usuario
function makeSearchQuery(text) {
  if (!text) return null;
  const stop = new Set([
    'de','la','el','los','las','para','con','y','o','u','en','del','al','un','una','unos','unas',
    'que','cuál','cual','cómo','como','qué','por','mi','me','quiero','dime','sobre','es','son',
    'the','a','an','of','for','and','or','in','to','on','my','is','are','i','you'
  ]);
  const terms = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w))
    .slice(0, 8);
  return terms.length ? terms.join(' ') : null;
}

// Búsqueda de productos para enriquecer el chat
async function searchProductsForQuery(userText, limit = 5) {
  const q = makeSearchQuery(userText);
  const first = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 20);

  const GQL = `
    query Products($first:Int!, $query:String) {
      products(first:$first, query:$query) {
        edges {
          node {
            id
            title
            handle
            descriptionHtml
            featuredImage { url altText }
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  sku
                  availableForSale
                  selectedOptions { name value }
                  price { amount currencyCode }
                }
              }
            }
          }
        }
      }
    }
  `;
  const data = await callStorefront(GQL, { first, query: q });
  const list = (data.products?.edges || []).map(e => e.node);
  return list;
}

// ─────────────────────────────────────────────────────────────
// Healthcheck Storefront (verificación rápida)
// ─────────────────────────────────────────────────────────────
app.get('/health/shopify', async (_req, res) => {
  try {
    const data = await searchProductsForQuery('frankies labs', 3);
    const titles = data.map(p => p.title);
    res.json({ ok: true, titles });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err), details: err?.details || err?.missing || null });
  }
});

// ─────────────────────────────────────────────────────────────
// Endpoint público: listar productos (búsqueda básica)
// Uso: /storefront/products?limit=6&q=serum
// ─────────────────────────────────────────────────────────────
app.get('/storefront/products', async (req, res) => {
  try {
    const first = Math.min(Math.max(parseInt(req.query.limit || '6', 10), 1), 20);
    const qParam = (req.query.q || '').toString().trim();
    const q = qParam || makeSearchQuery(qParam) || null;

    const GQL = `
      query Products($first:Int!, $query:String) {
        products(first:$first, query:$query) {
          edges {
            node {
              id
              title
              handle
              descriptionHtml
              featuredImage { url altText }
              priceRange {
                minVariantPrice { amount currencyCode }
                maxVariantPrice { amount currencyCode }
              }
              tags
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    sku
                    availableForSale
                    selectedOptions { name value }
                    price { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await callStorefront(GQL, { first, query: q });
    const products = (data.products?.edges || []).map(e => {
      const p = e.node;
      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        descriptionHtml: p.descriptionHtml,
        image: p.featuredImage,
        priceRange: p.priceRange,
        tags: p.tags || [],
        variants: (p.variants?.edges || []).map(v => v.node)
      };
    });

    res.json({ ok: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err), details: err?.details || null });
  }
});

// ─────────────────────────────────────────────────────────────
// Utilidades para prompts
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  // Reemplaza TODAS las apariciones de los placeholders
  return SYSTEM_PROMPT
    .replaceAll('{{OUT_OF_SCOPE}}', OUT_OF_SCOPE_MESSAGE)
    .replaceAll('{{SUPPORT_HANDOFF}}', SUPPORT_HANDOFF_MESSAGE);
}

/**
 * Sanitiza el contexto que pueda venir del cliente:
 * - Acepta solo roles 'user' y 'assistant' (nunca 'system')
 * - Acepta solo objetos con 'role' y 'content' string
 * - Limita longitud para evitar abusos accidentales
 */
function sanitizeContext(raw) {
  if (!Array.isArray(raw)) return [];
  const ALLOWED_ROLES = new Set(['user', 'assistant']);
  const MAX_ITEMS = 20;
  const MAX_CHARS = 4000;

  const safe = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    if (!ALLOWED_ROLES.has(item.role)) continue;
    if (typeof item.content !== 'string') continue;

    const trimmed = item.content.slice(0, MAX_CHARS).trim();
    if (!trimmed) continue;

    safe.push({ role: item.role, content: trimmed });
    if (safe.length >= MAX_ITEMS) break;
  }
  return safe;
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
    if (!userMsg) {
      return res.status(400).json({ error: 'El campo "message" es requerido.' });
    }

    const context = sanitizeContext(req.body?.context);

    // 1) Busca productos relevantes del catálogo para este mensaje (máx 5)
    let productContext = '';
    try {
      const prods = await searchProductsForQuery(userMsg, 5);
      if (prods.length) {
        const lines = prods.map((p, i) => {
          const min = p.priceRange?.minVariantPrice;
          const max = p.priceRange?.maxVariantPrice;
          const price =
            min && max
              ? (min.amount === max.amount
                  ? `${min.amount} ${min.currencyCode}`
                  : `${min.amount}-${max.amount} ${min.currencyCode}`)
              : 'N/D';
        const url = `https://${SHOPIFY_SHOP_DOMAIN}/products/${p.handle}`;
          // disponibilidad simple: si alguna variante está disponible
          const available = (p.variants?.edges || []).some(v => v.node.availableForSale);
          return `${i + 1}. ${p.title} — Precio: ${price} — Disponible: ${available ? 'Sí' : 'Consultar'} — URL: ${url}`;
        });
        productContext =
          `CATÁLOGO RELEVANTE (máx 5):\n` +
          lines.join('\n') +
          `\nUsa solo esta información para responder sobre productos. Si algo no está aquí, responde que no puedes confirmarlo.`;
      }
    } catch (_) {
      // Si falla la búsqueda, continuamos sin contexto de productos.
    }

    // 2) Construimos prompt de sistema con reglas de alcance + handoff soporte
    const systemPrompt = buildSystemPrompt();

    // 3) Mensajes para la API (inyectamos el contexto de catálogo como system extra)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(productContext ? [{ role: 'system', content: productContext }] : []),
      ...context, // historial o pasajes (si usas RAG en el futuro)
      { role: 'user', content: userMsg }
    ];

    // 4) Llamada a OpenAI
    const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2, // respuestas estables y pegadas al contexto
        // max_tokens: 500, // opcional: limita coste/respuesta
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
