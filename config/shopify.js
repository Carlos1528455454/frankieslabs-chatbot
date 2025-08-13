// config/shopify.js — Cliente mínimo para Shopify Storefront API (GraphQL)

const fetch = require('node-fetch');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN; // p.ej.: frankieslabs.myshopify.com
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN; // desde "Storefront API" en Shopify
const API_VERSION = process.env.SHOPIFY_STOREFRONT_VERSION || '2024-07'; // opcional

if (!SHOPIFY_DOMAIN || !STOREFRONT_TOKEN) {
  console.warn('[Shopify] Falta SHOPIFY_DOMAIN o SHOPIFY_STOREFRONT_TOKEN en variables de entorno.');
}

const ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

async function shopifyStorefront(query, variables = {}) {
  if (!SHOPIFY_DOMAIN || !STOREFRONT_TOKEN) {
    return { data: null, errors: [{ message: 'Shopify no configurado' }] };
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await res.json();
  return json;
}

/**
 * Obtiene políticas públicas: envíos (shipping), devoluciones (refund), privacidad (privacy).
 * Devuelve { shipping, refund, privacy } con { title, body, url } cuando existan.
 */
async function getPolicies() {
  const QUERY = `
    query Policies {
      shop {
        privacyPolicy { title handle url body }
        shippingPolicy { title handle url body }
        refundPolicy  { title handle url body }
      }
    }
  `;

  const { data, errors } = await shopifyStorefront(QUERY);
  if (errors) {
    console.warn('[Shopify] getPolicies errors:', errors);
  }

  const shop = data?.shop || {};
  const pick = (p) => p ? {
    title: p.title || '',
    url: p.url || '',
    // recorta cuerpo para no saturar el prompt
    body: (p.body || '').replace(/<[^>]+>/g, '').slice(0, 2000)
  } : null;

  return {
    shipping: pick(shop.shippingPolicy),
    refund: pick(shop.refundPolicy),
    privacy: pick(shop.privacyPolicy),
  };
}

module.exports = {
  shopifyStorefront,
  getPolicies,
};
