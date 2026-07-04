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

## Testing

```bash
npm test
```

Runs the test suite for every package via npm workspaces.

## Development

(Run instructions for each service are added here as each package comes online.)
