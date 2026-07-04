export interface LlmClient {
  /** Rewrites factualText into one friendly sentence. Never throws — falls back to factualText on any failure. */
  humanize(factualText: string, context: string): Promise<string>;
}

export interface AnthropicLlmFormatterOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

const SYSTEM_PROMPT =
  "You rewrite short factual office-monitoring statements into one " +
  "friendly, concise sentence or two, suitable for a Discord message. " +
  "Never invent numbers or facts not present in the input. No preamble, " +
  "no markdown headers — just the rewritten message.";

/**
 * Humanizes command output via the Anthropic API. If no API key is
 * configured, or the request fails for any reason (network error, bad
 * response, malformed body), this degrades gracefully to the original
 * factual text rather than ever throwing or leaving the user with no
 * response — a bot that occasionally sounds a bit robotic is fine; a bot
 * that goes silent because an API call failed is not.
 */
export class AnthropicLlmFormatter implements LlmClient {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AnthropicLlmFormatterOptions = {}) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? "claude-3-5-haiku-latest";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async humanize(factualText: string, context: string): Promise<string> {
    if (!this.apiKey) {
      return factualText;
    }

    try {
      const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 200,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Context: ${context}\n\nFacts:\n${factualText}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        return factualText;
      }

      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const textBlock = data.content?.find((block) => block.type === "text");
      const text = textBlock?.text?.trim();

      return text && text.length > 0 ? text : factualText;
    } catch {
      return factualText;
    }
  }
}

/** Passes text through unchanged — used when no LLM formatting is desired at all. */
export class PassthroughLlmFormatter implements LlmClient {
  async humanize(factualText: string, _context: string): Promise<string> {
    return factualText;
  }
}
