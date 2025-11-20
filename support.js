(function () {
  const cannedReplies = [
    'Mulțumim, monitorizăm în timp real și revenim imediat ce avem update.',
    'Confirm că am deschis ticket prioritar și escaladăm către echipa de platformă.',
    'Aplicăm patch-ul recomandat și urmărim metricile pentru a verifica stabilizarea.',
    'Sincronizăm contul și trimitem un rezumat cu acțiunile făcute în următoarele minute.',
    'Incidentul este stabilizat, pregătim comunicarea oficială către stakeholderi.',
    'Recomandăm să rulați din nou workflow-ul — noi păstrăm monitorizarea activă.'
  ];

  const messageList = document.getElementById('messageList');
  const emptyState = document.getElementById('emptyState');
  const quickButtons = document.getElementById('quickButtons');
  const supportForm = document.getElementById('supportForm');
  const supportInput = document.getElementById('supportInput');
  const supportReset = document.getElementById('supportReset');
  const topicPill = document.getElementById('topicPill');

  let currentTopic = ChatChannel.getTopic();

  renderHistory(ChatChannel.getHistory());
  applyTopic(currentTopic);
  renderQuickReplies();

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
        applyTopic(currentTopic);
        break;
      case 'sync':
        renderHistory(event.payload || []);
        break;
      default:
        break;
    }
  });

  supportForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = supportInput.value.trim();
    if (!text) return;
    sendSupportMessage(text);
    supportInput.value = '';
  });

  supportReset.addEventListener('click', () => {
    ChatChannel.clearHistory();
  });

  function renderQuickReplies() {
    cannedReplies.forEach((text) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.addEventListener('click', () => sendSupportMessage(text));
      quickButtons.appendChild(button);
    });
  }

  function sendSupportMessage(text) {
    ChatChannel.addMessage(buildMessage('support', text, currentTopic));
  }

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
  }

  function toggleEmpty(showEmpty) {
    if (!emptyState) return;
    emptyState.hidden = !showEmpty;
    messageList.hidden = showEmpty;
  }

  function applyTopic(topic) {
    topicPill.textContent = topic ? `Context: ${topic}` : 'Așteptăm subiectul clientului';
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
})();


