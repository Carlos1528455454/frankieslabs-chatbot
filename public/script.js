const messagesDiv = document.getElementById('messages');
const inputMessage = document.getElementById('inputMessage');
const sendBtn = document.getElementById('sendBtn');

// Mostrar mensaje del usuario
function addUserMessage(message) {
  const div = document.createElement('div');
  div.className = 'bubble message-user';
  div.innerText = message;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Mostrar respuesta del bot
function addBotMessage(message) {
  const div = document.createElement('div');
  div.className = 'bubble message-bot';
  div.innerText = message;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Mostrar opciones Sí / No al inicio
function showInitialOptions() {
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
}

// Lógica de respuesta a botones
function handleQuickReply(reply) {
  addUserMessage(reply);
  if (reply === 'Sí') {
    addBotMessage('Perfecto. ¿Puedes indicarme tu número de pedido?');
  } else if (reply === 'No') {
    addBotMessage('Gracias. ¿Puedes explicarnos tu consulta con más detalle?');
  }
}

// Lógica de campo libre
sendBtn.addEventListener('click', () => {
  const message = inputMessage.value.trim();
  if (message !== '') {
    addUserMessage(message);
    inputMessage.value = '';
    botResponse(message);
  }
});

inputMessage.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click();
  }
});

function botResponse(userMessage) {
  // Puedes conectar esto a la API real si lo deseas
  const response = `Gracias por tu mensaje. En breve te responderemos.`;
  setTimeout(() => {
    addBotMessage(response);
  }, 1000);
}

// Lanzar saludo + opciones al cargar
window.onload = () => {
  addBotMessage('👋 Hola, bienvenido al servicio de atención de Frankie’s Labs.');
  showInitialOptions();
};
