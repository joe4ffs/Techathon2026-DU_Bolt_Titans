import { describe, it, expect, vi } from "vitest";
import { AnthropicLlmFormatter, PassthroughLlmFormatter } from "./llmFormatter.js";

describe("AnthropicLlmFormatter", () => {
  it("returns the factual text unchanged when no API key is configured", async () => {
    const fetchImpl = vi.fn();
    const formatter = new AnthropicLlmFormatter({ fetchImpl });

    const result = await formatter.humanize("Total power: 100W.", "usage");

    expect(result).toBe("Total power: 100W.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns the LLM's rewritten text on a successful response", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Everything's drawing 100 watts right now!" }],
      }),
    })) as unknown as typeof fetch;

    const formatter = new AnthropicLlmFormatter({
      apiKey: "test-key",
      fetchImpl,
    });

    const result = await formatter.humanize("Total power: 100W.", "usage");

    expect(result).toBe("Everything's drawing 100 watts right now!");
  });

  it("sends the API key and factual text in the request", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "ok" }] }),
    })) as unknown as typeof fetch;

    const formatter = new AnthropicLlmFormatter({
      apiKey: "secret-123",
      fetchImpl,
    });

    await formatter.humanize("Total power: 100W.", "usage context");

    const [url, init] = (fetchImpl as any).mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe("secret-123");
    expect(init.body).toContain("Total power: 100W.");
    expect(init.body).toContain("usage context");
  });

  it("falls back to factual text when the API responds with a non-ok status", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const formatter = new AnthropicLlmFormatter({
      apiKey: "test-key",
      fetchImpl,
    });

    const result = await formatter.humanize("Total power: 100W.", "usage");
    expect(result).toBe("Total power: 100W.");
  });

  it("falls back to factual text when fetch throws (network error)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network unreachable");
    }) as unknown as typeof fetch;

    const formatter = new AnthropicLlmFormatter({
      apiKey: "test-key",
      fetchImpl,
    });

    const result = await formatter.humanize("Total power: 100W.", "usage");
    expect(result).toBe("Total power: 100W.");
  });

  it("falls back to factual text when the response body is malformed", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ unexpected: "shape" }),
    })) as unknown as typeof fetch;

    const formatter = new AnthropicLlmFormatter({
      apiKey: "test-key",
      fetchImpl,
    });

    const result = await formatter.humanize("Total power: 100W.", "usage");
    expect(result).toBe("Total power: 100W.");
  });

  it("falls back to factual text when the LLM returns empty text", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "   " }] }),
    })) as unknown as typeof fetch;

    const formatter = new AnthropicLlmFormatter({
      apiKey: "test-key",
      fetchImpl,
    });

    const result = await formatter.humanize("Total power: 100W.", "usage");
    expect(result).toBe("Total power: 100W.");
  });
});

describe("PassthroughLlmFormatter", () => {
  it("returns the input text unchanged", async () => {
    const formatter = new PassthroughLlmFormatter();
    const result = await formatter.humanize("Total power: 100W.", "usage");
    expect(result).toBe("Total power: 100W.");
  });
});
