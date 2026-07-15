# World Cup Live

A mobile-first, installable World Cup scores app. It uses a Node server to keep the API key private, polls live matches adaptively, and pushes score changes to every connected browser with Server-Sent Events (SSE).

## Features

- Live scores and match clock
- Instant full-time updates and browser notifications
- Knockout bracket generated from fixtures
- Group standings
- Team favourites saved on the device
- PWA installation and offline app shell
- Demo mode when no provider key is present
- Adaptive polling: 15 seconds during live matches, slower outside match windows

## Run it

```bash
cd world-cup-live
cp .env.example .env
# Add your API key to .env, then export it:
set -a && source .env && set +a
npm start
```

Open `http://localhost:3000`.

Without an API key, the app opens with demo tournament data.

## Live data configuration

The server uses API-Football v3 with:

- World Cup league ID: `1`
- Season: `2026`
- Live status refresh: every 15 seconds while a match is active

Environment variables:

```text
API_FOOTBALL_KEY=...
PORT=3000
```

## Deploy

Deploy to any Node 20+ host such as Render, Railway, Fly.io, Azure App Service or a VPS. Set `API_FOOTBALL_KEY` as a secret environment variable. Do not expose the key in browser code.

For production scale, add Redis or another shared cache if you run more than one server instance. Each instance currently maintains its own score cache and SSE clients.
