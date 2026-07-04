import { Client, Events, GatewayIntentBits, type Message } from "discord.js";
import type { CommandRouter } from "./commandRouter.js";

export function createBot(router: CommandRouter): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    // eslint-disable-next-line no-console
    console.log(`Discord bot logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;

    try {
      const reply = await router.handle(message.content);
      if (reply) {
        await message.reply(reply);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error handling message:", err);
      await message
        .reply("Something went wrong reaching the office backend — try again in a moment.")
        .catch(() => {
          /* if even the error reply fails, there's nothing more to do */
        });
    }
  });

  return client;
}
