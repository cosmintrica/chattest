(function () {
  window.CHAT_CONFIG = Object.freeze({
    serverUrl: window.CHAT_SERVER_URL || 'http://localhost:4000',
    serverKey: window.CHAT_SERVER_KEY || 'demo-key',
    maxMessageLength: 1200
  });
})();

