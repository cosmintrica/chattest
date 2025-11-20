(function () {
  const SESSION_KEY = 'saas-live-chat-session';
  const knowledgeArticles = [
    { topic: 'Resetare parolă end-user', title: 'Reset password flow', subtitle: 'Automatizare secure' },
    { topic: 'Anomalii de facturare', title: 'Billing discrepancies', subtitle: 'Credit note, dispute' },
    { topic: 'Provisioning cont nou', title: 'New account provisioning', subtitle: 'Onboarding orchestration' },
    { topic: 'Limitări API', title: 'API rate limits', subtitle: 'Observability & scaling' },
    { topic: 'Integrare SSO enterprise', title: 'Single sign-on setup', subtitle: 'SAML & SCIM' },
    { topic: 'Analitice întârziate', title: 'Usage analytics delays', subtitle: 'Dashboard lag' },
    { topic: 'Upgrade plan + add-ons', title: 'Plan upgrades & add-ons', subtitle: 'Prorata & seats' },
    { topic: 'Export date / GDPR', title: 'Data export & GDPR', subtitle: 'Compliance requests' },
    { topic: 'Integrare marketplace', title: 'Marketplace integrations', subtitle: 'Webhooks QA' },
    { topic: 'Incident critic în platformă', title: 'Critical incident', subtitle: 'Runbooks NOC' }
  ];

  const topicList = document.getElementById('topicList');
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
  const sideConversationCount = document.getElementById('sideConversationCount');
  const waitingPill = document.querySelector('.status-pill.waiting');

  let topicButtons = [];
  let currentTopic = '';
  let currentConversationId = sessionStorage.getItem(SESSION_KEY) || '';

  renderTopicList();
  bindContactButton();

  const initialHistory = ChatChannel.getHistory();
  const existingMessages = getMessagesForCurrentConversation(initialHistory);
  if (existingMessages.length) {
    currentTopic = existingMessages[existingMessages.length - 1].topic || '';
  }

  renderHistory(initialHistory);
  applyTopicUI(currentTopic);
  updateConversationTag();
  updateWaitingPill();
  updateConversationCounter(initialHistory);

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
    updateWaitingPill();
    startNewConversation();
  };

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
    updateWaitingPill();
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
    updateConversationCounter(entries);
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

  function updateWaitingPill() {
    if (!waitingPill) return;
    waitingPill.textContent = currentTopic ? 'Playbook selectat' : 'Selectează playbook';
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

  function renderTopicList() {
    if (!topicList) return;
    topicList.innerHTML = '';
    knowledgeArticles.forEach((article) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.className = 'topic-btn';
      button.dataset.topic = article.topic;
      button.innerHTML = `<span>${article.title}</span><small>${article.subtitle}</small>`;
      button.addEventListener('click', () => setTopic(article.topic));
      item.appendChild(button);
      topicList.appendChild(item);
    });
    topicButtons = Array.from(topicList.querySelectorAll('.topic-btn'));
  }

  function bindContactButton() {
    if (!contactButton) return;
    contactButton.addEventListener('click', () => setTopic(contactButton.dataset.topic));
  }

  function updateConversationCounter(entries) {
    if (!sideConversationCount) return;
    const unique = new Set(
      (entries || [])
        .map((msg) => msg.conversationId)
        .filter(Boolean)
    );
    sideConversationCount.textContent = unique.size;
  }
})();


