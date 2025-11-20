const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const PORT = process.env.PORT || 4000;
const CHAT_KEY = process.env.CHAT_KEY || 'demo-key';

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300
  })
);

app.get('/', (_, res) => {
  res.json({ status: 'ok', message: 'SaaS live chat realtime server' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const conversations = new Map();

const ensureConversation = (conversationId) => {
  if (!conversationId) return null;
  if (!conversations.has(conversationId)) {
    conversations.set(conversationId, {
      id: conversationId,
      topic: '',
      status: 'open',
      messages: []
    });
  }
  return conversations.get(conversationId);
};

const sanitizeText = (text = '') =>
  text
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 1200);

const serializeHistory = () => {
  const all = [];
  conversations.forEach((conversation) => {
    all.push(...conversation.messages);
  });
  return all.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
};

io.use((socket, next) => {
  const { key, role } = socket.handshake.auth || {};
  if (key !== CHAT_KEY) {
    return next(new Error('Unauthorized'));
  }
  socket.data.role = role || 'anonymous';
  next();
});

io.on('connection', (socket) => {
  socket.emit('history', serializeHistory());

  socket.on('message', (payload = {}) => {
    const { conversationId, text, role, topic, id } = payload;
    const safeText = sanitizeText(text);
    if (!conversationId || !safeText) return;

    const conversation = ensureConversation(conversationId);
    if (!conversation) return;
    if (!conversation.topic && topic) {
      conversation.topic = topic;
    }

    const message = {
      id: id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      conversationId,
      role: role || socket.data.role || 'client',
      topic: topic || conversation.topic,
      text: safeText,
      timestamp: Date.now()
    };

    conversation.messages.push(message);
    conversation.status = message.meta?.status || conversation.status || 'open';
    io.emit('message', message);
  });

  socket.on('typing', ({ conversationId, role }) => {
    if (!conversationId) return;
    socket.broadcast.emit('typing', {
      conversationId,
      role: role || socket.data.role || 'client',
      timestamp: Date.now()
    });
  });

  socket.on('typing-stop', ({ conversationId, role }) => {
    if (!conversationId) return;
    socket.broadcast.emit('typing-stop', {
      conversationId,
      role: role || socket.data.role || 'client'
    });
  });

  socket.on('archive', ({ conversationId, meta = {} }) => {
    const conversation = ensureConversation(conversationId);
    if (!conversation || conversation.status === 'archived') return;
    conversation.status = 'archived';
    const systemMessage = {
      id: `${conversationId}-archived-${Date.now()}`,
      conversationId,
      role: 'system',
      topic: conversation.topic,
      timestamp: Date.now(),
      text: meta.reason || 'Conversația a fost arhivată de echipa de suport.',
      meta: { status: 'archived' }
    };
    conversation.messages.push(systemMessage);
    io.emit('message', systemMessage);
    io.emit('archive', { conversationId, status: 'archived', reason: systemMessage.text });
  });
});

server.listen(PORT, () => {
  console.log(`Realtime server pornit pe portul ${PORT}`);
});

