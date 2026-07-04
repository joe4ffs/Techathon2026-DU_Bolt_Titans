# Office Monitor — Lights, Fans, Discord

Real-time office device monitoring system: a web dashboard and a Discord bot,
both reading from a single shared backend (one source of truth for device state).

## Structure

- `packages/shared-types` — shared TypeScript interfaces used by every service
- `packages/backend` — Fastify API + WebSocket + device simulator + alert engine
- `packages/dashboard` — React dashboard (live device status, power meter, alerts)
- `packages/discord-bot` — Discord bot (`!status`, `!room`, `!usage`)

## Requirements

- Node.js >= 18
- npm >= 9 (workspaces support)

## Setup

```bash
npm install
```

## Running the backend

```bash
cd packages/backend
cp .env.example .env   # optional — defaults work out of the box
npm run dev
```

This starts a real server:
- REST API at `http://localhost:3001/api/...`
- WebSocket at `ws://localhost:3001/ws`

Try it:
```bash
curl http://localhost:3001/api/devices
curl http://localhost:3001/api/usage
curl http://localhost:3001/api/alerts
```

The simulated clock runs 300x faster than real time by default (configurable
via `SIM_SPEED_MULTIPLIER` in `.env`), so a full simulated day — and every
alert condition — cycles within a few real minutes.

## Running the dashboard

In a second terminal, with the backend already running:
```bash
cd packages/dashboard
cp .env.example .env   # optional — defaults to ws://localhost:3001/ws
npm run dev
```
Open the URL Vite prints (typically `http://localhost:5173`).

## Testing

```bash
npm test
```

Runs the test suite for every package via npm workspaces.

## Development

(Run instructions for each service are added here as each package comes online.)
