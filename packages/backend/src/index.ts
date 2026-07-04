import "dotenv/config";
import { AppRuntime } from "./runtime.js";
import { SimClock } from "./clock.js";
import { buildServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3001);
const TICK_INTERVAL_MS = Number(process.env.TICK_INTERVAL_MS ?? 5000);
const SIM_SPEED_MULTIPLIER = Number(process.env.SIM_SPEED_MULTIPLIER ?? 300);

async function main(): Promise<void> {
  const clock = new SimClock({ speedMultiplier: SIM_SPEED_MULTIPLIER });
  const runtime = new AppRuntime({ clock });
  const { app } = await buildServer(runtime);

  runtime.start(TICK_INTERVAL_MS);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  // eslint-disable-next-line no-console
  console.log(
    `Simulated clock running at ${SIM_SPEED_MULTIPLIER}x real time`
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start backend:", err);
  process.exit(1);
});
