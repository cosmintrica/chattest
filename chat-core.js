(function () {
  const STORAGE_KEY = 'saas-live-chat-history';
  const TOPIC_KEY = 'saas-live-chat-topic';
  const CHANNEL_NAME = 'saas-live-chat-channel';
  const listeners = new Set();
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

  const safeParse = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const getHistory = () => safeParse(localStorage.getItem(STORAGE_KEY), []);

  const saveHistory = (history) => {
    const limited = history.slice(-200);
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
    listeners.forEach((callback) => callback(event));
  };

  const handleEvent = (event) => {
    if (!event || !event.type) return;

    if (event.type === 'message' && event.payload) {
      upsertMessage(event.payload);
    }

    if (event.type === 'reset') {
      localStorage.removeItem(STORAGE_KEY);
    }

    if (event.type === 'topic') {
      if (event.payload) {
        localStorage.setItem(TOPIC_KEY, event.payload);
      } else {
        localStorage.removeItem(TOPIC_KEY);
      }
    }

    emit(event);
  };

  if (channel) {
    channel.onmessage = (event) => handleEvent(event.data);
  }

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      emit({ type: 'sync', payload: getHistory() });
    }
    if (event.key === TOPIC_KEY) {
      emit({ type: 'topic', payload: getTopic() });
    }
  });

  const send = (event) => {
    if (channel) {
      channel.postMessage(event);
    }
    handleEvent(event);
  };

  const getTopic = () => localStorage.getItem(TOPIC_KEY) || '';

  window.ChatChannel = {
    addMessage(message) {
      send({ type: 'message', payload: message });
    },
    clearHistory() {
      send({ type: 'reset' });
    },
    setTopic(topic) {
      send({ type: 'topic', payload: topic || '' });
    },
    getTopic,
    getHistory,
    onEvent(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    }
  };
})();


