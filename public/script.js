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
    botResponse(message);
    sendBtn.disabled = true; // Se desactiva después de enviar
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

function botResponse(userMessage) {
  if (awaitingOrderNumber) {
    addBotMessage(`Gracias. Hemos recibido tu número de pedido: ${userMessage}. Pronto te atenderemos.`);
    awaitingOrderNumber = false;
  } else {
    addBotMessage('Gracias por tu mensaje. En breve te responderemos.');
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
    // Devolver foco al elemento que abrió
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      lastFocusedEl.focus();
    }
  };
  prefersReduced ? onEnd() : chatEl.addEventListener('transitionend', onEnd);
}

function toggleChat() {
  isOpen ? closeChat() : openChat();
}

// ==================
// Cerrar con ESC
// ==================
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen) closeChat();
});

// ==================
// Triggers desde tu HTML
// ==================
// Usa data-chat-open en tu botón para abrir,
// data-chat-close en tu "X" para cerrar,
// o data-chat-toggle para alternar.
document.addEventListener('click', (e) => {
  const openTrigger = e.target.closest('[data-chat-open]');
  const closeTrigger = e.target.closest('[data-chat-close]');
  const toggleTrigger = e.target.closest('[data-chat-toggle]');

  if (openTrigger) {
    e.preventDefault();
    openChat();
  } else if (closeTrigger) {
    e.preventDefault();
    closeChat();
  } else if (toggleTrigger) {
    e.preventDefault();
    toggleChat();
  }
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

  // Si quieres abrir automáticamente al cargar, descomenta:
  // openChat();
});

// Exponer funciones por si las necesitas desde fuera
window.FrankiesChat = { open: openChat, close: closeChat, toggle: toggleChat };

