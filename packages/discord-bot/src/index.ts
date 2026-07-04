import "dotenv/config";
import { ApiClient } from "./apiClient.js";
import { AnthropicLlmFormatter, PassthroughLlmFormatter } from "./llmFormatter.js";
import type { LlmClient } from "./llmFormatter.js";
import { CommandRouter } from "./commandRouter.js";
import { createBot } from "./bot.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!DISCORD_TOKEN) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing DISCORD_TOKEN in environment. Copy .env.example to .env and fill it in."
  );
  process.exit(1);
}

const apiClient = new ApiClient({ baseUrl: BACKEND_URL });

const llm: LlmClient = ANTHROPIC_API_KEY
  ? new AnthropicLlmFormatter({ apiKey: ANTHROPIC_API_KEY })
  : new PassthroughLlmFormatter();

if (!ANTHROPIC_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "No ANTHROPIC_API_KEY set — replies will use plain factual text instead of LLM-humanized responses."
  );
}

const router = new CommandRouter({ apiClient, llm });
const bot = createBot(router);

bot.login(DISCORD_TOKEN).catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to log in to Discord:", err);
  process.exit(1);
});
