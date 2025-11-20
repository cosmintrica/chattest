(function () {
  const topicButtons = document.querySelectorAll('.topic-btn');
  const contactButton = document.getElementById('contactButton');
  const messageList = document.getElementById('messageList');
  const emptyState = document.getElementById('emptyState');
  const clientForm = document.getElementById('clientForm');
  const clientInput = document.getElementById('clientInput');
  const clientSend = document.getElementById('clientSend');
  const helperText = document.getElementById('helperText');
  const topicPill = document.getElementById('topicPill');
  const resetBtn = document.getElementById('resetBtn');

  let currentTopic = ChatChannel.getTopic();

  const history = ChatChannel.getHistory();
  renderHistory(history);
  applyTopicUI(currentTopic);

  ChatChannel.onEvent((event) => {
    switch (event.type) {
      case 'message':
        renderMessage(event.payload);
        break;
      case 'reset':
        wipeConversation();
        break;
      case 'topic':
        currentTopic = event.payload || '';
        applyTopicUI(currentTopic);
        break;
      case 'sync':
        renderHistory(event.payload || []);
        break;
      default:
        break;
    }
  });

  const setTopic = (topic) => {
    currentTopic = topic;
    ChatChannel.setTopic(topic);
    helperText.textContent = topic
      ? `Problemă selectată: ${topic}`
      : 'Chat-ul se activează după selectarea unei opțiuni.';
  };

  topicButtons.forEach((button) =>
    button.addEventListener('click', () => setTopic(button.dataset.topic))
  );
  if (contactButton) {
    contactButton.addEventListener('click', () => setTopic(contactButton.dataset.topic));
  }

  clientForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!currentTopic) {
      helperText.textContent = 'Alege o opțiune înainte de a trimite un mesaj.';
      return;
    }
    const text = clientInput.value.trim();
    if (!text) return;
    ChatChannel.addMessage(buildMessage('client', text, currentTopic));
    clientInput.value = '';
  });

  resetBtn.addEventListener('click', () => {
    ChatChannel.clearHistory();
    ChatChannel.setTopic('');
  });

  const buildMessage = (role, text, topic) => ({
    id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    topic,
    timestamp: Date.now()
  });

  function renderHistory(entries) {
    messageList.innerHTML = '';
    entries.forEach(renderMessage);
    toggleEmpty(entries.length === 0);
    if (entries.length) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  function renderMessage(message) {
    if (!message || !message.id) return;
    const item = document.createElement('li');
    item.className = `bubble ${message.role}`;

    const meta = document.createElement('div');
    meta.className = 'bubble-meta';
    const label =
      message.role === 'client' ? 'Client' : message.role === 'support' ? 'Support' : 'System';
    const time = formatTime(message.timestamp);
    meta.textContent = message.topic ? `${label} • ${time} • ${message.topic}` : `${label} • ${time}`;

    const copy = document.createElement('p');
    copy.textContent = message.text;

    item.append(meta, copy);
    messageList.appendChild(item);
    toggleEmpty(false);
    messageList.scrollTop = messageList.scrollHeight;
  }

  function wipeConversation() {
    messageList.innerHTML = '';
    toggleEmpty(true);
    clientInput.value = '';
    helperText.textContent = 'Conversatia a fost resetată. Selectează un nou subiect.';
  }

  function toggleEmpty(showEmpty) {
    if (!emptyState) return;
    emptyState.hidden = !showEmpty;
    messageList.hidden = showEmpty;
  }

  function applyTopicUI(topic) {
    topicPill.textContent = topic ? topic : 'Nicio problemă selectată';
    const disabled = !topic;
    clientInput.disabled = disabled;
    clientSend.disabled = disabled;

    topicButtons.forEach((button) => {
      const isActive = button.dataset.topic === topic;
      button.classList.toggle('active', isActive);
    });
    if (contactButton) {
      contactButton.classList.toggle('active', contactButton.dataset.topic === topic);
    }
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
})();


