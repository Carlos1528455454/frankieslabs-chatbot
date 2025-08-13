// ==================
// Referencias DOM
// ==================
const chatEl = document.getElementById('chat');
const messagesDiv = document.getElementById('messages');
const inputMessage = document.getElementById('inputMessage');
const sendBtn = document.getElementById('sendBtn');

// ==================
// Estado del chat
// ==================
let initialMessageShown = false;
let awaitingOrderNumber = false;
let isOpen = false;           // estado visual del chat
let lastFocusedEl = null;     // para devolver foco al cerrar

// ==================
// Utilidades de UI (burbujas)
// ==================
function addUserMessage(message) {
  const div = document.createElement('div');
  div.className = 'bubble message-user';
  div.innerText = message;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addBotMessage(message) {
  const div = document.createElement('div');
  div.className = 'bubble message-bot';
  div.innerText = message;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Indicador “escribiendo…”
function addTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'bubble message-bot';
  div.dataset.typing = 'true';
  div.innerText = 'Escribiendo…';
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return div;
}
function removeTypingIndicator(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ==================
// Mensaje inicial
// ==================
function showInitialOptions() {
  if (initialMessageShown) return;

  addBotMessage('👋 Hola, bienvenido al servicio de atención de Frankie’s Labs.');

  const wrapper = document.createElement('div');
  wrapper.className = 'bubble message-bot';

  const text = document.createElement('div');
  text.innerText = '¿Tu consulta está relacionada con un pedido ya realizado?';

  const buttons = document.createElement('div');
  buttons.className = 'button-group';

  const btnYes = document.createElement('button');
  btnYes.className = 'chat-btn';
  btnYes.innerText = 'Sí';
  btnYes.onclick = () => handleQuickReply('Sí');

  const btnNo = document.createElement('button');
  btnNo.className = 'chat-btn';
  btnNo.innerText = 'No';
  btnNo.onclick = () => handleQuickReply('No');

  buttons.appendChild(btnYes);
  buttons.appendChild(btnNo);
  wrapper.appendChild(text);
  wrapper.appendChild(buttons);
  messagesDiv.appendChild(wrapper);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  initialMessageShown = true;
}

function handleQuickReply(reply) {
  addUserMessage(reply);

  const buttonGroups = document.querySelectorAll('.button-group');
  buttonGroups.forEach(group => group.remove());

  if (reply === 'Sí') {
    addBotMessage('Perfecto. ¿Puedes indicarme tu número de pedido?');
    awaitingOrderNumber = true;
  } else {
    addBotMessage('Gracias. ¿Puedes explicarnos tu consulta con más detalle?');
  }
}

// ==================
// Envío de mensajes
// ==================
sendBtn.addEventListener('click', () => {
  const message = inputMessage.value.trim();
  if (message !== '') {
    addUserMessage(message);
    inputMessage.value = '';
    sendBtn.disabled = true; // se desactiva durante el envío
    botResponse(message);
  }
});

inputMessage.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !sendBtn.disabled) {
    sendBtn.click();
  }
});

// Cambiar estado del botón según si hay texto
inputMessage.addEventListener('input', () => {
  sendBtn.disabled = inputMessage.value.trim() === '';
});

// ==================
// Llamada a backend (Render) y respuesta del bot
// ==================
async function botResponse(userMessage) {
  // Si estábamos pidiendo nº de pedido, lo confirmamos y no llamamos a la API
  if (awaitingOrderNumber) {
    addBotMessage(`Gracias. Hemos recibido tu número de pedido: ${userMessage}. Pronto te atenderemos.`);
    awaitingOrderNumber = false;
    return;
  }

  // Indicador de “escribiendo…”
  const typingEl = addTypingIndicator();

  try {
    // Timeout de seguridad
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s

    // IMPORTANTE:
    // Usamos ruta relativa /chat porque el index y el script se sirven desde el mismo servicio en Render.
    // Si tuvieras otro dominio, cambia aquí por la URL absoluta y habilita CORS en el backend.
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      // Puede venir 401/403/500, mostramos un mensaje amable
      removeTypingIndicator(typingEl);
      addBotMessage('Lo siento, ahora mismo no puedo responder. Inténtalo de nuevo en unos segundos.');
      return;
    }

    const data = await res.json();
    const reply = (data && data.reply) ? String(data.reply) : 'No recibí respuesta del servidor.';

    removeTypingIndicator(typingEl);
    addBotMessage(reply);
  } catch (err) {
    removeTypingIndicator(typingEl);
    // Abort, red, u otro error de red
    addBotMessage('Tuvimos un problema de conexión. Por favor, inténtalo otra vez.');
  } finally {
    // El botón se reactivará cuando el usuario empiece a escribir (por el listener de input).
    // Si quieres reactivarlo ya, quita el comentario de la línea siguiente:
    // sendBtn.disabled = false;
  }
}

// ==================
// Animación abrir/cerrar (slide desde abajo)
// ==================
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function applyClosedStateInstant() {
  chatEl.style.transition = prefersReduced ? 'none' : 'transform 320ms ease-in';
  chatEl.style.transform = 'translateY(100%)';
  chatEl.style.opacity = '0';
  chatEl.style.visibility = 'hidden';
  chatEl.style.pointerEvents = 'none';
  chatEl.setAttribute('aria-hidden', 'true');
  isOpen = false;
}

function openChat() {
  if (isOpen) return;
  lastFocusedEl = document.activeElement;

  chatEl.style.willChange = 'transform';
  chatEl.style.transition = prefersReduced ? 'none' : 'transform 340ms ease-out';
  chatEl.style.visibility = 'visible';
  chatEl.style.pointerEvents = 'auto';
  chatEl.style.opacity = '1';

  requestAnimationFrame(() => {
    chatEl.style.transform = 'translateY(0)';
  });

  chatEl.setAttribute('aria-hidden', 'false');
  isOpen = true;

  // Mensaje inicial (solo 1 vez)
  showInitialOptions();

  // Foco al input
  setTimeout(() => inputMessage && inputMessage.focus(), prefersReduced ? 0 : 350);
}

function closeChat() {
  if (!isOpen) return;

  chatEl.style.transition = prefersReduced ? 'none' : 'transform 300ms ease-in';
  chatEl.style.transform = 'translateY(100%)';
  chatEl.setAttribute('aria-hidden', 'true');
  isOpen = false;

  const onEnd = () => {
    chatEl.style.visibility = 'hidden';
    chatEl.style.pointerEvents = 'none';
    chatEl.removeEventListener('transitionend', onEnd);
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      lastFocusedEl.focus();
    }
    // Avisar al padre (Shopify) para que cierre el panel externo con animación
    try {
      window.parent.postMessage({ source: 'FrankiesChat', action: 'close-widget' }, '*');
    } catch (e) {}
  };
  prefersReduced ? onEnd() : chatEl.addEventListener('transitionend', onEnd);
}

function toggleChat() { isOpen ? closeChat() : openChat(); }

// Cerrar con ESC
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen) closeChat();
});

// Triggers desde HTML embebido (por si algún día los usas)
document.addEventListener('click', (e) => {
  const openTrigger = e.target.closest('[data-chat-open]');
  const closeTrigger = e.target.closest('[data-chat-close]');
  const toggleTrigger = e.target.closest('[data-chat-toggle]');
  if (openTrigger) { e.preventDefault(); openChat(); }
  else if (closeTrigger) { e.preventDefault(); closeChat(); }
  else if (toggleTrigger) { e.preventDefault(); toggleChat(); }
});

// ==================
// Inicialización
// ==================
window.addEventListener('load', () => {
  // Estado cerrado al iniciar
  chatEl.style.transform = 'translateY(100%)';
  chatEl.style.opacity = '0';
  chatEl.style.visibility = 'hidden';
  chatEl.style.pointerEvents = 'none';
  chatEl.style.willChange = 'transform';

  // Botón enviar deshabilitado al inicio
  sendBtn.disabled = true;

  // Aplicar estado cerrado inmediato
  applyClosedStateInstant();

  // Si el chat está embebido en Shopify (iframe), ábrelo automáticamente
  if (window.top !== window.self) {
    setTimeout(() => openChat(), 50);
  }
});

// Exponer funciones por si las necesitas desde consola
window.FrankiesChat = { open: openChat, close: closeChat, toggle: toggleChat };
