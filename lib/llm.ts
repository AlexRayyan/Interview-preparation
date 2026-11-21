// Minimal client for any OpenAI-compatible chat-completions API.
// Defaults to GitHub Models (free inside GitHub Actions with GITHUB_TOKEN); also works with
// OpenRouter, Groq, Google Gemini's OpenAI endpoint, Ollama, etc.
import { z } from "zod";

export interface LlmConfig {
  baseUrl: string; // e.g. https://models.github.ai/inference
  apiKey: string;
  model: string;
}

export const DEFAULT_BASE_URL = "https://models.github.ai/inference";
export const DEFAULT_MODEL = "openai/gpt-4.1-mini";

/** Server-side config from environment variables (GitHub Actions / local scripts). Empty strings count as unset. */
export function envConfig(): LlmConfig | null {
  const env = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);
  const apiKey = env.AI_API_KEY || env.GITHUB_TOKEN || "";
  if (!apiKey) return null;
  return {
    baseUrl: (env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    apiKey,
    model: env.AI_MODEL || DEFAULT_MODEL,
  };
}

export class RateLimitError extends Error {
  constructor(message: string, readonly retryAfterSeconds: number | null) {
    super(message);
  }
}

// Free tiers allow ~10-15 requests/minute; keep a minimum gap between calls.
let lastCall = 0;
async function throttle() {
  const gap = Number((typeof process !== "undefined" && process.env.AI_MIN_INTERVAL_MS) || 0) || 0;
  const wait = lastCall + gap - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chat(cfg: LlmConfig, messages: ChatMessage[], opts: { maxTokens: number; json: boolean }): Promise<string> {
  await throttle();
  const send = (json: boolean) =>
    fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.2,
        max_tokens: opts.maxTokens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  let res = await send(opts.json);
  // Some providers/models reject response_format; retry once without it (the prompt still asks for JSON).
  if (res.status === 400 && opts.json) {
    const text = await res.text();
    if (/response_format|json/i.test(text)) res = await send(false);
    else throw new Error(`400 from ${cfg.model}: ${text.slice(0, 300)}`);
  }
  if (res.status === 429) {
    const ra = Number(res.headers.get("retry-after"));
    throw new RateLimitError(`Rate limited by ${new URL(cfg.baseUrl).host}`, Number.isFinite(ra) && ra > 0 ? ra : null);
  }
  if (!res.ok) throw new Error(`${res.status} from ${new URL(cfg.baseUrl).host}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[] };
  const choice = data.choices?.[0];
  if (!choice?.message?.content) throw new Error(`Empty response from ${cfg.model}`);
  if (choice.finish_reason === "length") throw new Error(`Response from ${cfg.model} was cut off (max_tokens)`);
  return choice.message.content;
}

/** Pulls the first JSON object out of a model reply (tolerates ```json fences and surrounding prose). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model response");
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Asks for JSON matching `schema`, validates it, and retries once with the validation error
 * so the model can correct itself. Works with models that have no native structured output.
 */
export async function chatJson<T extends z.ZodType>(
  cfg: LlmConfig,
  opts: { system: string; user: string; schema: T; maxTokens?: number },
): Promise<z.infer<T>> {
  const schemaText = JSON.stringify(z.toJSONSchema(opts.schema));
  const messages: ChatMessage[] = [
    { role: "system", content: `${opts.system}\n\nReply with a single JSON object only, no prose, matching this JSON Schema:\n${schemaText}` },
    { role: "user", content: opts.user },
  ];
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await chat(cfg, messages, { maxTokens: opts.maxTokens ?? 3000, json: true });
    try {
      return opts.schema.parse(extractJson(reply));
    } catch (e) {
      lastError = e instanceof z.ZodError ? z.prettifyError(e) : e instanceof Error ? e.message : String(e);
      messages.push({ role: "assistant", content: reply }, { role: "user", content: `That reply was invalid: ${lastError}\nReply again with corrected JSON only.` });
    }
  }
  throw new Error(`Model output did not match the expected format: ${lastError.slice(0, 300)}`);
}
