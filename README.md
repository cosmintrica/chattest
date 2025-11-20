# SaaS Live Chat · Realtime & UI Refactor

## Structură

- `index.html` + `styles.css` – landing + pulse original
- `client.html`, `support.html` – interfețe actualizate, minimaliste, cu animații fluide
- `chat-core.js` – client WebSocket (Socket.io) + fallback localStorage
- `config.js` – configurarea endpoint-ului și a cheii pentru backend
- `server.js` – backend Node.js (Express + Socket.io) pentru mesaje realtime + arhivare

## Rulare Locală

```bash
cd saas-live-chat
npm install
npm run dev      # rulează serverul pe http://localhost:4000
```

Servește fișierele statice (ex.: cu `npx serve .` sau din Vercel) și setează `CHAT_SERVER_URL` / `CHAT_SERVER_KEY` în `config.js`.

## Deploy

1. Deploy backend (`server.js`) pe Render/Fly/etc. ⇒ păstrează secret cheia.
2. Actualizează `config.js` cu `serverUrl` (HTTPS/WSS) și `serverKey`.
3. Deploy frontend pe Vercel (static). `vercel.json` expune toate fișierele.

## Funcționalități cheie

- WebSocket real (Socket.io) cu autentificare bazată pe cheie
- Sincronizare instant mesaje + typing indicators bidirecțional
- Arhivare conversații (buton “x” → status sistem + alert client)
- Istoric păstrat în localStorage (client) și în memorie (server)
- Interfețe reproiectate (client + suport) cu animații GPU-friendly
- Dark mode + pulse landing păstrate

## Securitate

- Cheie privată (`CHAT_KEY`) necesară la handshake
- Sanitizare text + limită 1200 caractere
- Rate limit pe HTTP + strip spații
- Recomandare: folosește HTTPS/WSS și rulează backend-ul pe infrastructură cu TLS

## TODO / Idei viitoare

- Persistență istoric în DB
- Notificări push când apare chat nou
- Integrare auth reală pentru suport

