import type { DeviceApi } from "./apiClient.js";
import type { LlmClient } from "./llmFormatter.js";
import { formatStatus } from "./commands/formatStatus.js";
import { formatRoomStatus } from "./commands/formatRoomStatus.js";
import { formatUsage } from "./commands/formatUsage.js";
import { resolveRoom } from "./commands/resolveRoom.js";

export interface CommandRouterOptions {
  apiClient: DeviceApi;
  llm: LlmClient;
}

/**
 * Parses a raw Discord message and produces a reply, or null if the message
 * isn't a recognized command (so the bot stays silent rather than replying
 * to every message in the channel).
 */
export class CommandRouter {
  private readonly apiClient: DeviceApi;
  private readonly llm: LlmClient;

  constructor(options: CommandRouterOptions) {
    this.apiClient = options.apiClient;
    this.llm = options.llm;
  }

  async handle(rawMessage: string): Promise<string | null> {
    const trimmed = rawMessage.trim();
    if (!trimmed.startsWith("!")) {
      return null;
    }

    const [command, ...rest] = trimmed.slice(1).split(/\s+/);

    switch (command.toLowerCase()) {
      case "status":
        return this.handleStatus();
      case "room":
        return this.handleRoom(rest.join(" "));
      case "usage":
        return this.handleUsage();
      default:
        return null;
    }
  }

  private async handleStatus(): Promise<string> {
    const devices = await this.apiClient.getDevices();
    const factual = formatStatus(devices);
    return this.llm.humanize(
      factual,
      "Summarizing on/off status of all office devices, grouped by room."
    );
  }

  private async handleRoom(roomInput: string): Promise<string> {
    const room = resolveRoom(roomInput);
    if (!room) {
      return `I don't recognize "${roomInput}". Try: drawing, work1, or work2.`;
    }
    const devices = await this.apiClient.getRoom(room);
    const factual = formatRoomStatus(room, devices);
    return this.llm.humanize(
      factual,
      `Summarizing device status for a single office room (${room}).`
    );
  }

  private async handleUsage(): Promise<string> {
    const usage = await this.apiClient.getUsage();
    const factual = formatUsage(usage);
    return this.llm.humanize(
      factual,
      "Summarizing current power draw and today's estimated energy usage."
    );
  }
}
