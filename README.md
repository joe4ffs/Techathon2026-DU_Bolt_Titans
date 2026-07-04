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

## Running the Discord bot

**1. Create a Discord application and bot:**
- Go to https://discord.com/developers/applications → **New Application**
- Left sidebar → **Bot** → **Reset Token** → copy it (you'll only see it once)
- Under **Privileged Gateway Intents**, enable **Message Content Intent** — the bot can't read command text without this
- Left sidebar → **OAuth2** → **URL Generator** → check **bot** scope, then under Bot Permissions check **Send Messages** and **Read Message History** → copy the generated URL, open it, and invite the bot to your test server

**2. Configure and run:**
```bash
cd packages/discord-bot
cp .env.example .env
```
Edit `.env`:
- `DISCORD_TOKEN` — the token from step 1
- `BACKEND_URL` — defaults to `http://localhost:3001`, fine if the backend is running locally
- `ANTHROPIC_API_KEY` — optional. Without it, the bot still works fully, just replies with plain factual text instead of LLM-humanized phrasing

```bash
npm run dev
```

**3. Try it** in your Discord server (with the backend also running):
```
!status
!room work1
!usage
```

## Testing

```bash
npm test
```

Runs the test suite for every package via npm workspaces. 154 tests across
4 packages as of this writing.

## Requirements checklist

**Simulated device data**
- [x] 15 devices (3 rooms × 2 fans + 3 lights), realistic wattage (fan 60W, light 15W)
- [x] Status, wattage, room, and last-changed timestamp per device
- [x] Data changes dynamically over time via a tick-based simulator

**Web dashboard**
- [x] Live device status panel, grouped by room, updates without page refresh (WebSocket)
- [x] Live power meter — total wattage + per-room breakdown
- [x] Active alerts panel, timestamped
- [x] Bonus: animated top-down office floor plan — lights glow, fans spin, live

**Discord bot**
- [x] `!status` — full office summary
- [x] `!room <name>` — single room status
- [x] `!usage` — current wattage + estimated kWh today
- [x] Reads from the same backend as the dashboard (single source of truth)
- [x] LLM-humanized responses (optional `ANTHROPIC_API_KEY`), with graceful
      fallback to plain factual text if unset or the API call fails

**Architecture**
- [x] Single backend (Fastify REST + WebSocket) is the only source of device
      state; both the dashboard and bot are pure clients of it

**Alerts**
- [x] After-hours: device left ON outside 9AM–5PM
- [x] Room continuous-on: all devices in a room ON continuously for 2+ hours

**Not yet done**
- [ ] System diagram
- [ ] Circuit schematic (Wokwi/Tinkercad)
- [ ] Demo video

## A note on the simulated clock for anyone running a demo

The backend's clock runs 300x faster than real time by default (see
`SIM_SPEED_MULTIPLIER` in `packages/backend/.env`), so a full simulated day —
and every alert condition — reliably occurs within a few real minutes. Start
the backend a minute or two before presenting, not hours ahead: since
`estimatedKwhToday` resets at each simulated day boundary, this doesn't cause
runaway numbers, but very long-running dev sessions will cycle through many
simulated days, which can make timestamps in the alerts panel look unusual
(e.g. spanning several "days") even though the math is correct.
