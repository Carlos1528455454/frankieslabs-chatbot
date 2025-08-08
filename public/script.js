const messagesDiv = document.getElementById('messages');
const inputMessage = document.getElementById('inputMessage');
const sendBtn = document.getElementById('sendBtn');

function appendMessage(sender, text) {
  const div = document.createElement('div');
  div.className = sender === 'user' ? 'message-user' : 'message-bot';
  div.textContent = `${sender === 'user' ? 'Tú' : 'Bot'}: ${text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

sendBtn.addEventListener('click', async () => {
  const message = inputMessage.value.trim();
  if (!message) return;

  appendMessage('user', message);
  inputMessage.value = '';

  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    if (data.reply) {
      appendMessage('bot', data.reply);
    } else {
      appendMessage('bot', 'No recibí respuesta del bot');
    }
  } catch (error) {
    appendMessage('bot', 'Error de conexión con el servidor');
  }
});
