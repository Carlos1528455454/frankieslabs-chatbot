const messagesDiv = document.getElementById('messages');
const inputMessage = document.getElementById('inputMessage');
const sendBtn = document.getElementById('sendBtn');

let initialMessageShown = false; // Para evitar duplicados
let awaitingOrderNumber = false; // Controlar lógica

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

function showInitialOptions() {
  if (initialMessageShown) return; // Ya se mostró

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
  buttonGroups.forEach(group => group.remove()); // Eliminar botones después de click

  if (reply === 'Sí') {
    addBotMessage('Perfecto. ¿Puedes indicarme tu número de pedido?');
    awaitingOrderNumber = true;
  } else {
    addBotMessage('Gracias. ¿Puedes explicarnos tu consulta con más detalle?');
  }
}

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
  if (awaitingOrderNumber) {
    addBotMessage(`Gracias. Hemos recibido tu número de pedido: ${userMessage}. Pronto te atenderemos.`);
    awaitingOrderNumber = false;
  } else {
    addBotMessage('Gracias por tu mensaje. En breve te responderemos.');
  }
}

// Lanzar saludo + opciones al cargar
window.onload = showInitialOptions;
