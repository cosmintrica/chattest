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
  const typingIndicator = document.getElementById('typingIndicator');
  const clientForm = document.getElementById('clientForm');
  const clientInput = document.getElementById('clientInput');
  const clientSend = document.getElementById('clientSend');
  const helperText = document.getElementById('helperText');
  const topicPill = document.getElementById('topicPill');
  const conversationTag = document.getElementById('conversationTag');
  const conversationAlert = document.getElementById('conversationAlert');
  const resetBtn = document.getElementById('resetBtn');
  const waitingPill = document.querySelector('.status-pill.waiting');

  const CLOSED_KEY = 'saas-live-chat-closed';
  const safeParse = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  let topicButtons = [];
  let currentTopic = '';
  let currentConversationId = sessionStorage.getItem(SESSION_KEY) || '';
  let typingTimeout = null;
  let closedConversations = new Set(safeParse(localStorage.getItem(CLOSED_KEY), []));

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
  if (currentConversationId && closedConversations.has(currentConversationId)) {
    showConversationAlert('Conversația anterioară este închisă. Selectează un nou playbook.');
    disableComposer();
  }

  ChatChannel.connect({ role: 'client' });

  ChatChannel.onEvent((event) => {
    switch (event.type) {
      case 'connected':
        toggleOnlineStatus(true);
        break;
      case 'disconnected':
        toggleOnlineStatus(false);
        break;
      case 'message':
        renderHistory(ChatChannel.getHistory());
        if (event.payload?.meta?.status === 'archived') {
          handleConversationClosed(event.payload.conversationId, event.payload.meta?.reason);
        }
        break;
      case 'sync':
        renderHistory(event.payload || []);
        break;
      case 'archive':
        if (event.payload?.conversationId === currentConversationId) {
          handleConversationClosed(event.payload.conversationId, event.payload.reason);
        }
        break;
      case 'typing':
        if (event.payload?.role === 'support' && event.payload.conversationId === currentConversationId) {
          showTypingIndicator();
        }
        break;
      case 'typing-stop':
        if (event.payload?.role === 'support' && event.payload.conversationId === currentConversationId) {
          hideTypingIndicator();
        }
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
    ChatChannel.stopTyping(currentConversationId);
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
      ChatChannel.archiveConversation(currentConversationId, {
        reason: 'Clientul a închis conversația din interfața client.'
      });
    }
    currentTopic = '';
    helperText.textContent = 'Chat-ul se activează după selectarea unei opțiuni.';
    applyTopicUI(currentTopic);
    updateWaitingPill();
    startNewConversation();
  });

  clientInput.addEventListener('input', () => {
    if (!currentConversationId || clientInput.disabled) return;
    ChatChannel.sendTyping(currentConversationId);
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

      if (message.meta?.status === 'archived') {
        item.classList.add('bubble-status');
      }

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
    hideTypingIndicator();
    hideConversationAlert();
    enableComposer();
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
    waitingPill.textContent = currentTopic ? 'Flux selectat' : 'Selectează flux';
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
      button.textContent = article.title;
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

  function toggleOnlineStatus(isOnline) {
    const onlinePill = document.querySelector('.status-pill.online');
    const syncPill = document.querySelector('.status-pill.sync');
    if (!onlinePill || !syncPill) return;
    onlinePill.classList.toggle('is-offline', !isOnline);
    onlinePill.textContent = isOnline ? 'Client online' : 'Offline';
    syncPill.textContent = isOnline ? 'Broadcast sincron' : 'Reconectare...';
  }

  function showTypingIndicator() {
    if (!typingIndicator) return;
    typingIndicator.hidden = false;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      hideTypingIndicator();
    }, 2600);
  }

  function hideTypingIndicator() {
    if (!typingIndicator) return;
    typingIndicator.hidden = true;
  }

  function showConversationAlert(message) {
    if (!conversationAlert) return;
    conversationAlert.hidden = false;
    conversationAlert.textContent = message;
  }

  function hideConversationAlert() {
    if (!conversationAlert) return;
    conversationAlert.hidden = true;
    conversationAlert.textContent = '';
  }

  function handleConversationClosed(conversationId, reason) {
    if (!conversationId) return;
    closedConversations.add(conversationId);
    localStorage.setItem(CLOSED_KEY, JSON.stringify([...closedConversations]));
    if (conversationId === currentConversationId) {
      showConversationAlert(reason || 'Conversația a fost închisă de suport.');
      disableComposer();
    }
  }

  function disableComposer() {
    clientInput.disabled = true;
    clientSend.disabled = true;
    helperText.textContent = 'Conversația a fost închisă. Selectează un nou playbook.';
  }

  function enableComposer() {
    const disabled = !currentTopic;
    clientInput.disabled = disabled;
    clientSend.disabled = disabled;
    if (!disabled) {
      helperText.textContent = `Problemă selectată: ${currentTopic}`;
    } else {
      helperText.textContent = 'Chat-ul se activează după selectarea unei opțiuni.';
    }
  }
})();


