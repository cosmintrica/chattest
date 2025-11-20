(function () {
  const STORAGE_KEY = 'saas-live-chat-history';
  const TOPIC_KEY = 'saas-live-chat-topic';
  const MAX_HISTORY = 400;
  const TYPING_TTL = 2800;

  const config = window.CHAT_CONFIG || {};
  const listeners = new Set();
  let socket = null;
  let role = 'client';
  let typingTimers = new Map();

  const safeParse = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const getHistory = () => safeParse(localStorage.getItem(STORAGE_KEY), []);

  const saveHistory = (history) => {
    const limited = history.slice(-MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  };

  const upsertMessage = (message) => {
    const history = getHistory();
    const exists = history.some((item) => item.id === message.id);
    if (!exists) {
      history.push(message);
      saveHistory(history);
    }
  };

  const emit = (event) => {
    if (!event || !event.type) return;
    listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.warn('ChatChannel listener error', error);
      }
    });
  };

  const syncHistory = (serverHistory = []) => {
    if (!Array.isArray(serverHistory)) return;
    saveHistory(serverHistory);
    emit({ type: 'sync', payload: serverHistory });
  };

  const ensureSocket = () => {
    if (socket || typeof io === 'undefined') return;
    if (!config.serverUrl) {
      console.warn('CHAT_CONFIG.serverUrl nu este definit.');
      return;
    }

    socket = io(config.serverUrl, {
      transports: ['websocket'],
      auth: {
        key: config.serverKey || 'demo-key',
        role
      }
    });

    socket.on('connect', () => emit({ type: 'connected' }));
    socket.on('disconnect', () => emit({ type: 'disconnected' }));
    socket.on('history', (payload) => syncHistory(payload));
    socket.on('message', (message) => {
      upsertMessage(message);
      emit({ type: 'message', payload: message });
    });
    socket.on('archive', (payload) => emit({ type: 'archive', payload }));
    socket.on('typing', (payload) => emit({ type: 'typing', payload }));
    socket.on('typing-stop', (payload) => emit({ type: 'typing-stop', payload }));
    socket.on('error', (error) => emit({ type: 'error', payload: error }));
  };

  const scheduleTypingStop = (conversationId, origin) => {
    if (!conversationId) return;
    const timerKey = `${conversationId}-${origin}`;
    clearTimeout(typingTimers.get(timerKey));
    typingTimers.set(
      timerKey,
      setTimeout(() => {
        emit({ type: 'typing-stop', payload: { conversationId, role: origin } });
      }, TYPING_TTL)
    );
  };

  window.ChatChannel = {
    connect(options = {}) {
      role = options.role || 'client';
      ensureSocket();
    },
    addMessage(message) {
      if (!message || !message.conversationId) return;
      upsertMessage(message);
      emit({ type: 'message', payload: message });
      if (socket) {
        socket.emit('message', {
          ...message,
          text: (message.text || '').slice(0, config.maxMessageLength || 1200)
        });
      }
    },
    sendTyping(conversationId) {
      if (!socket || !conversationId) return;
      socket.emit('typing', { conversationId, role });
    },
    stopTyping(conversationId) {
      if (!socket || !conversationId) return;
      socket.emit('typing-stop', { conversationId, role });
    },
    archiveConversation(conversationId, meta = {}) {
      if (!conversationId) return;
      emit({ type: 'archive', payload: { conversationId, reason: meta.reason } });
      if (socket) {
        socket.emit('archive', { conversationId, meta, role });
      }
    },
    clearHistory() {
      localStorage.removeItem(STORAGE_KEY);
      emit({ type: 'sync', payload: [] });
    },
    setTopic(topic) {
      if (topic) {
        localStorage.setItem(TOPIC_KEY, topic);
      } else {
        localStorage.removeItem(TOPIC_KEY);
      }
      emit({ type: 'topic', payload: topic || '' });
    },
    getTopic() {
      return localStorage.getItem(TOPIC_KEY) || '';
    },
    getHistory,
    onEvent(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    }
  };

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      emit({ type: 'sync', payload: getHistory() });
    }
    if (event.key === TOPIC_KEY) {
      emit({ type: 'topic', payload: window.ChatChannel.getTopic() });
    }
  });
})();
