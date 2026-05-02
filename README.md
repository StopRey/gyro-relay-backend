# gyro-relay-backend

Node.js relay: **Express** + **Socket.IO**. Телефон і Unity підключаються як клієнти; події `join-room` та `gyro-data` розносяться лише по відповідній кімнаті.

## Локально

```bash
npm install
npm start
```

Сервіс слухає `PORT` з оточення або **3000**. Перевірка: `GET http://localhost:3000/health` → `{"ok":true}`.

## Render.com

1. New **Web Service**, підключи цей репозиторій.
2. **Runtime:** Node.
3. **Build command:** `npm install` (або залиш порожнім, якщо Render ставить залежності автоматично).
4. **Start command:** `npm start`.
5. Після деплою скопіюй публічний URL (наприклад `https://gyro-relay-backend.onrender.com`).

У **gyro-controller-web** (`index.html`, `CONFIG.SOCKET_SERVER_URL`) і в Unity (`serverUrl`) вкажи **той самий** базовий URL без слеша в кінці.

## Події Socket.IO

| Подія        | Напрямок | Опис |
|-------------|----------|------|
| `join-room` | клієнт → сервер | аргумент: рядок `roomId` |
| `gyro-data` | клієнт → сервер | об’єкт `{ alpha, beta, gamma }`; сервер шле в кімнату відправника |
