import { describe, it, expect, vi } from "vitest";
import { CommandRouter } from "./commandRouter.js";
import type { DeviceApi } from "./apiClient.js";
import type { LlmClient } from "./llmFormatter.js";
import { createInitialDevices } from "@office-monitor/shared-types";

function makeStubApi(overrides: Partial<DeviceApi> = {}): DeviceApi {
  return {
    getDevices: vi.fn(async () => createInitialDevices()),
    getRoom: vi.fn(async () =>
      createInitialDevices().filter((d) => d.room === "work1")
    ),
    getUsage: vi.fn(async () => ({
      totalWattsNow: 100,
      perRoomWatts: { drawing: 0, work1: 100, work2: 0 },
      estimatedKwhToday: 1.5,
    })),
    getAlerts: vi.fn(async () => []),
    ...overrides,
  };
}

function makePassthroughLlm(): LlmClient {
  return {
    humanize: vi.fn(async (factualText: string) => factualText),
  };
}

describe("CommandRouter", () => {
  it("returns null for a message that isn't a command", async () => {
    const router = new CommandRouter({
      apiClient: makeStubApi(),
      llm: makePassthroughLlm(),
    });
    expect(await router.handle("hey everyone")).toBeNull();
  });

  it("returns null for an unrecognized command", async () => {
    const router = new CommandRouter({
      apiClient: makeStubApi(),
      llm: makePassthroughLlm(),
    });
    expect(await router.handle("!banana")).toBeNull();
  });

  it("!status fetches all devices and returns a formatted summary", async () => {
    const api = makeStubApi();
    const router = new CommandRouter({ apiClient: api, llm: makePassthroughLlm() });

    const result = await router.handle("!status");

    expect(api.getDevices).toHaveBeenCalled();
    expect(result).toContain("Drawing Room");
    expect(result).toContain("all off");
  });

  it("!room work1 fetches that room and returns a formatted summary", async () => {
    const api = makeStubApi();
    const router = new CommandRouter({ apiClient: api, llm: makePassthroughLlm() });

    const result = await router.handle("!room work1");

    expect(api.getRoom).toHaveBeenCalledWith("work1");
    expect(result).toContain("Work Room 1");
  });

  it("!room with an unrecognized name returns a friendly error without calling the API", async () => {
    const api = makeStubApi();
    const router = new CommandRouter({ apiClient: api, llm: makePassthroughLlm() });

    const result = await router.handle("!room basement");

    expect(api.getRoom).not.toHaveBeenCalled();
    expect(result).toContain("basement");
    expect(result).toContain("drawing");
  });

  it("!usage fetches usage and returns a formatted summary", async () => {
    const api = makeStubApi();
    const router = new CommandRouter({ apiClient: api, llm: makePassthroughLlm() });

    const result = await router.handle("!usage");

    expect(api.getUsage).toHaveBeenCalled();
    expect(result).toContain("100W");
    expect(result).toContain("1.5 kWh");
  });

  it("commands are case-insensitive", async () => {
    const api = makeStubApi();
    const router = new CommandRouter({ apiClient: api, llm: makePassthroughLlm() });

    const result = await router.handle("!STATUS");

    expect(api.getDevices).toHaveBeenCalled();
    expect(result).toContain("Drawing Room");
  });

  it("passes the factual text through the LLM client", async () => {
    const llm: LlmClient = {
      humanize: vi.fn(async () => "A friendlier version of the facts."),
    };
    const router = new CommandRouter({ apiClient: makeStubApi(), llm });

    const result = await router.handle("!usage");

    expect(llm.humanize).toHaveBeenCalled();
    expect(result).toBe("A friendlier version of the facts.");
  });
});
