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
let isOpen = false; // estado visual del chat
let lastFocusedEl = null; // para devolver foco al cerrar

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

// Botón flotante para abrir/cerrar (se inyecta sin tocar el HTML)
const toggleBtn = document.createElement('button');
toggleBtn.id = 'chatToggle';
toggleBtn.type = 'button';
toggleBtn.setAttribute('aria-controls', 'chat');
toggleBtn.setAttribute('aria-expanded', 'false');
toggleBtn.setAttribute('aria-label', 'Abrir chat de atención al cliente');
// Estilos inline mínimos para no depender del CSS externo
Object.assign(toggleBtn.style, {
  position: 'fixed',
  right: '16px',
  bottom: '16px',
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  border: 'none',
  boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
  background: '#4CAF50',
  color: '#fff',
  fontSize: '22px',
  cursor: 'pointer',
  zIndex: '9999'
});
toggleBtn.textContent = '✉️'; // icono de sobre como pediste
document.body.appendChild(toggleBtn);

// Botón de cierre dentro del header (X)
const header = document.querySelector('.chat-header');
const closeBtn = document.createElement('button');
closeBtn.type = 'button';
closeBtn.setAttribute('aria-label', 'Cerrar chat');
Object.assign(closeBtn.style, {
  marginLeft: 'auto',
  border: 'none',
  background: 'transparent',
  fontSize: '22px',
  lineHeight: '1',
  cursor: 'pointer'
});
closeBtn.textContent = '×';
header && header.appendChild(closeBtn);

// Base de transición y estado inicial cerrado
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function applyClosedStateInstant() {
  chatEl.style.transition = prefersReduced ? 'none' : 'transform 320ms ease-in';
  chatEl.style.transform = 'translateY(100%)';
  chatEl.style.opacity = '0';
  chatEl.style.visibility = 'hidden';
  chatEl.style.pointerEvents = 'none';
  chatEl.setAttribute('aria-hidden', 'true');
  toggleBtn.setAttribute('aria-expanded', 'false');
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
  toggleBtn.setAttribute('aria-expanded', 'true');
  toggleBtn.style.display = 'none'; // ocultamos el botón mientras está abierto
  isOpen = true;

  // Al abrir por primera vez, mostramos opciones iniciales
  showInitialOptions();

  // Foco al input para escribir de inmediato
  setTimeout(() => inputMessage && inputMessage.focus(), prefersReduced ? 0 : 350);
}

function closeChat() {
  if (!isOpen) return;
  chatEl.style.transition = prefersReduced ? 'none' : 'transform 300ms ease-in';
  chatEl.style.transform = 'translateY(100%)';
  chatEl.setAttribute('aria-hidden', 'true');
  isOpen = false;

  // Al finalizar la transición, desactivar interacción y mostrar el botón
  const onEnd = () => {
    chatEl.style.visibility = 'hidden';
    chatEl.style.pointerEvents = 'none';
    toggleBtn.style.display = 'block';
    toggleBtn.setAttribute('aria-expanded', 'false');
    chatEl.removeEventListener('transitionend', onEnd);
    // Devolver foco al último elemento que lo tenía
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      lastFocusedEl.focus();
    } else {
      toggleBtn.focus();
    }
  };
  prefersReduced ? onEnd() : chatEl.addEventListener('transitionend', onEnd);
}

function toggleChat() {
  isOpen ? closeChat() : openChat();
}

// Eventos del toggle y cierre
toggleBtn.addEventListener('click', toggleChat);
closeBtn.addEventListener('click', closeChat);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen) {
    closeChat();
  }
});

// ==================
// Inicialización
// ==================
window.addEventListener('load', () => {
  // Aseguramos capa base de animación y estado cerrado al iniciar
  chatEl.style.transform = 'translateY(100%)';
  chatEl.style.opacity = '0';
  chatEl.style.visibility = 'hidden';
  chatEl.style.pointerEvents = 'none';
  chatEl.style.willChange = 'transform';

  // Botón enviar deshabilitado al inicio
  sendBtn.disabled = true;

  // Estado cerrado inmediato
  applyClosedStateInstant();

  // Si quieres que el chat se abra automáticamente al cargar, descomenta:
  // openChat();
});

