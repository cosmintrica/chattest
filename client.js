(function () {
  const SESSION_KEY = 'saas-live-chat-session';
  const topicButtons = document.querySelectorAll('.topic-btn');
  const contactButton = document.getElementById('contactButton');
  const messageList = document.getElementById('messageList');
  const emptyState = document.getElementById('emptyState');
  const clientForm = document.getElementById('clientForm');
  const clientInput = document.getElementById('clientInput');
  const clientSend = document.getElementById('clientSend');
  const helperText = document.getElementById('helperText');
  const topicPill = document.getElementById('topicPill');
  const conversationTag = document.getElementById('conversationTag');
  const resetBtn = document.getElementById('resetBtn');

  let currentTopic = '';
  let currentConversationId = sessionStorage.getItem(SESSION_KEY) || '';

  const initialHistory = ChatChannel.getHistory();
  const existingMessages = getMessagesForCurrentConversation(initialHistory);
  if (existingMessages.length) {
    currentTopic = existingMessages[existingMessages.length - 1].topic || '';
  }

  renderHistory(initialHistory);
  applyTopicUI(currentTopic);

  ChatChannel.onEvent((event) => {
    switch (event.type) {
      case 'message':
        renderHistory(ChatChannel.getHistory());
        break;
      case 'reset':
        currentTopic = '';
        helperText.textContent = 'Chat-ul se activează după selectarea unei opțiuni.';
        resetConversationId();
        applyTopicUI(currentTopic);
        clearLocalView();
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
    helperText.textContent = topic
      ? `Problemă selectată: ${topic}`
      : 'Chat-ul se activează după selectarea unei opțiuni.';
    applyTopicUI(currentTopic);
    startNewConversation();
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
    ensureConversationId();
    ChatChannel.addMessage(buildMessage('client', text, currentTopic, currentConversationId));
    clientInput.value = '';
  });

  resetBtn.addEventListener('click', () => {
    if (currentConversationId) {
      const closingMessage = buildMessage(
        'system',
        'Clientul a închis conversația.',
        currentTopic,
        currentConversationId
      );
      ChatChannel.addMessage(closingMessage);
    }
    currentTopic = '';
    helperText.textContent = 'Chat-ul se activează după selectarea unei opțiuni.';
    applyTopicUI(currentTopic);
    startNewConversation();
  });

  function renderHistory(entries) {
    const scopedEntries = getMessagesForCurrentConversation(entries);
    messageList.innerHTML = '';
    scopedEntries.forEach((message) => {
      const item = document.createElement('li');
      item.className = `bubble ${message.role}`;

      const meta = document.createElement('div');
      meta.className = 'bubble-meta';
      meta.textContent = buildMetaLabel(message);

      const copy = document.createElement('p');
      copy.textContent = message.text;

      item.append(meta, copy);
      messageList.appendChild(item);
    });
    toggleEmpty(scopedEntries.length === 0);
    if (scopedEntries.length) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  function getMessagesForCurrentConversation(entries) {
    if (!currentConversationId) return [];
    return (entries || []).filter((msg) => msg.conversationId === currentConversationId);
  }

  function startNewConversation() {
    resetConversationId();
    clearLocalView();
  }

  function clearLocalView() {
    messageList.innerHTML = '';
    toggleEmpty(true);
    clientInput.value = '';
    updateConversationTag();
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

  function ensureConversationId() {
    if (currentConversationId) return;
    currentConversationId = generateConversationId();
    sessionStorage.setItem(SESSION_KEY, currentConversationId);
    updateConversationTag();
  }

  function resetConversationId() {
    currentConversationId = '';
    sessionStorage.removeItem(SESSION_KEY);
    updateConversationTag();
  }

  function updateConversationTag() {
    if (!conversationTag) return;
    conversationTag.textContent = currentConversationId
      ? `ID #${formatConversationId(currentConversationId)}`
      : 'ID disponibil după primul mesaj';
  }

  function buildMessage(role, text, topic, conversationId) {
    return {
      id: crypto?.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role,
      text,
      topic,
      conversationId,
      timestamp: Date.now()
    };
  }

  function buildMetaLabel(message) {
    const label =
      message.role === 'client' ? 'Client' : message.role === 'support' ? 'Support' : 'System';
    const time = formatTime(message.timestamp);
    const topic = message.topic ? ` • ${message.topic}` : '';
    const idPart = message.conversationId ? ` • #${formatConversationId(message.conversationId)}` : '';
    return `${label} • ${time}${topic}${idPart}`;
  }

  function formatConversationId(id) {
    if (!id) return '';
    return id.slice(-6).toUpperCase();
  }

  function formatTime(timestamp) {
    return new Date(timestamp || Date.now()).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function generateConversationId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `conv-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  updateConversationTag();
})();


