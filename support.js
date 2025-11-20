(function () {
  const AUTH_KEY = 'saas-support-authenticated';
  const VALID_USER = 'admin';
  const VALID_PASS = 'admin';
  const cannedReplies = [
    'Mulțumim, monitorizăm în timp real și revenim imediat ce avem update.',
    'Confirm că am deschis ticket prioritar și escaladăm către echipa de platformă.',
    'Aplicăm patch-ul recomandat și urmărim metricile pentru a verifica stabilizarea.',
    'Sincronizăm contul și trimitem un rezumat cu acțiunile făcute în următoarele minute.',
    'Incidentul este stabilizat, pregătim comunicarea oficială către stakeholderi.',
    'Recomandăm să rulați din nou workflow-ul — noi păstrăm monitorizarea activă.'
  ];

  const authCard = document.getElementById('authCard');
  const authForm = document.getElementById('authForm');
  const authUser = document.getElementById('authUser');
  const authPass = document.getElementById('authPass');
  const authError = document.getElementById('authError');
  const supportApp = document.getElementById('supportApp');
  const kpiActive = document.getElementById('kpiActive');
  const kpiPending = document.getElementById('kpiPending');
  const kpiAuto = document.getElementById('kpiAuto');
  let autoReplies = 0;
  updateHeroStats([], 0);

  if (sessionStorage.getItem(AUTH_KEY) === 'true') {
    unlockConsole();
  }

  authForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (authUser.value === VALID_USER && authPass.value === VALID_PASS) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      unlockConsole();
      authForm.reset();
      authError.hidden = true;
    } else {
      authError.hidden = false;
    }
  });

  function unlockConsole() {
    authCard.hidden = true;
    supportApp.hidden = false;
    initSupportConsole();
  }

  function initSupportConsole() {
    const messageList = document.getElementById('messageList');
    const emptyState = document.getElementById('emptyState');
    const quickButtons = document.getElementById('quickButtons');
    const supportForm = document.getElementById('supportForm');
    const supportInput = document.getElementById('supportInput');
    const supportReset = document.getElementById('supportReset');
    const topicPill = document.getElementById('topicPill');
    const conversationBadge = document.getElementById('conversationBadge');
    const conversationList = document.getElementById('conversationList');
    const conversationCount = document.getElementById('conversationCount');
    const conversationEmpty = document.getElementById('conversationEmpty');

    let activeConversationId = null;
    let conversations = [];

    renderQuickReplies();
    rebuildConversations(ChatChannel.getHistory());

    ChatChannel.onEvent((event) => {
      if (event.type === 'reset') {
        rebuildConversations([]);
        return;
      }
      if (event.type === 'message' || event.type === 'sync') {
        rebuildConversations(ChatChannel.getHistory());
      }
    });

    supportForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!activeConversationId) return;
      const text = supportInput.value.trim();
      if (!text) return;
      sendSupportMessage(text);
      supportInput.value = '';
    });

    supportReset.addEventListener('click', () => {
      ChatChannel.clearHistory();
      activeConversationId = null;
      autoReplies = 0;
      renderMessages([]);
      renderConversationsList();
      updateHeroStats([], 0);
    });

    function renderQuickReplies() {
      quickButtons.innerHTML = '';
      cannedReplies.forEach((text) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.addEventListener('click', () => {
          if (!activeConversationId) return;
          sendSupportMessage(text, true);
        });
        quickButtons.appendChild(button);
      });
    }

    function rebuildConversations(history) {
      const grouped = new Map();

      history.forEach((message) => {
        const id = message.conversationId || 'legacy';
        if (!grouped.has(id)) {
          grouped.set(id, {
            id,
            messages: [],
            lastTimestamp: 0,
            lastTopic: '',
            lastRole: ''
          });
        }
        const entry = grouped.get(id);
        entry.messages.push(message);
        entry.lastTimestamp = message.timestamp || Date.now();
        if (message.topic) entry.lastTopic = message.topic;
        entry.lastRole = message.role;
      });

      conversations = Array.from(grouped.values()).sort(
        (a, b) => b.lastTimestamp - a.lastTimestamp
      );

      if (conversations.length === 0) {
        activeConversationId = null;
      } else if (!activeConversationId || !grouped.has(activeConversationId)) {
        activeConversationId = conversations[0].id;
      }

      renderConversationsList();
      const activeConversation = conversations.find((conv) => conv.id === activeConversationId);
      renderMessages(activeConversation ? activeConversation.messages : []);
      updateTopicBadge(activeConversation);
      toggleComposerState(Boolean(activeConversation));
      const pending = conversations.filter((conv) => conv.lastRole === 'client').length;
      updateHeroStats(conversations, pending);
    }

    function renderConversationsList() {
      conversationList.innerHTML = '';
      if (!conversations.length) {
        conversationEmpty.hidden = false;
      } else {
        conversationEmpty.hidden = true;
      }
      conversationCount.textContent = conversations.length;

      conversations.forEach((conversation) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'conversation-item';
        if (conversation.id === activeConversationId) {
          item.classList.add('active');
        }
        if (conversation.lastRole === 'client' && conversation.id !== activeConversationId) {
          item.classList.add('awaiting');
        }

        const shortId = formatConversationId(conversation.id);
        item.innerHTML = `
          <span class="conversation-id">#${shortId}</span>
          <span class="conversation-topic">${conversation.lastTopic || 'Fără topic'}</span>
          <p class="conversation-preview">${
            conversation.messages[conversation.messages.length - 1]?.text || ''
          }</p>
        `;

        item.addEventListener('click', () => {
          if (activeConversationId === conversation.id) return;
          activeConversationId = conversation.id;
          renderConversationsList();
          renderMessages(conversation.messages);
          updateTopicBadge(conversation);
          toggleComposerState(true);
        });

        conversationList.appendChild(item);
      });
    }

    function renderMessages(entries) {
      messageList.innerHTML = '';
      if (!entries.length) {
        toggleEmpty(true);
        return;
      }
      entries.forEach((message) => {
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
      toggleEmpty(false);
      messageList.scrollTop = messageList.scrollHeight;
    }

    function toggleEmpty(showEmpty) {
      emptyState.hidden = !showEmpty;
      messageList.hidden = showEmpty;
    }

    function sendSupportMessage(text, isAuto = false) {
      const conversation = conversations.find((conv) => conv.id === activeConversationId);
      ChatChannel.addMessage(
        buildMessage('support', text, conversation?.lastTopic || '', activeConversationId)
      );
      if (isAuto) {
        autoReplies += 1;
        updateHeroStats(
          conversations,
          conversations.filter((conv) => conv.lastRole === 'client').length
        );
      }
    }

    function toggleComposerState(enabled) {
      supportInput.disabled = !enabled;
      supportForm.querySelector('button[type="submit"]').disabled = !enabled;
      quickButtons.querySelectorAll('button').forEach((btn) => {
        btn.disabled = !enabled;
      });
    }

    function updateTopicBadge(conversation) {
      if (!conversation) {
        topicPill.textContent = 'Așteptăm un ticket';
        conversationBadge.textContent = 'Fără ID';
        return;
      }
      topicPill.textContent = conversation.lastTopic
        ? `Context: ${conversation.lastTopic}`
        : 'Context indisponibil';
      conversationBadge.textContent = `ID #${formatConversationId(conversation.id)}`;
    }
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
    if (!id) return 'LEGACY';
    return id.slice(-6).toUpperCase();
  }

  function formatTime(timestamp) {
    return new Date(timestamp || Date.now()).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function updateHeroStats(conversations, pendingCount) {
    if (kpiActive) {
      kpiActive.textContent = conversations.length;
    }
    if (kpiPending) {
      kpiPending.textContent = pendingCount;
    }
    if (kpiAuto) {
      kpiAuto.textContent = autoReplies;
    }
  }
})();


