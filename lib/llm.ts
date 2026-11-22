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

/** Free providers picked up automatically from a secret named after them (checked in this order). */
const KEYED_PROVIDERS = [
  { env: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  { env: "GEMINI_API_KEY", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
  { env: "OPENROUTER_API_KEY", baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct:free" },
] as const;

/**
 * Server-side config from environment variables (GitHub Actions / local scripts). Empty strings count as unset.
 * Precedence: AI_API_KEY (+ AI_BASE_URL / AI_MODEL) > GROQ_API_KEY > GEMINI_API_KEY > OPENROUTER_API_KEY > GITHUB_TOKEN (GitHub Models).
 * AI_MODEL overrides the model in every case.
 */
/** Tolerates common copy-paste mistakes: surrounding whitespace/quotes, a "Bearer " prefix, NAME=value. */
export function cleanKey(raw: string | undefined): string {
  if (!raw) return "";
  let k = raw.trim();
  k = k.replace(/^[A-Z_]+_API_KEY\s*=\s*/, "");
  k = k.replace(/^bearer\s+/i, "");
  k = k.replace(/^["'`]+|["'`]+$/g, "");
  return k.replace(/\s+/g, "");
}

export function envConfig(): LlmConfig | null {
  const rawEnv = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);
  const env: Record<string, string | undefined> = { ...rawEnv };
  for (const k of ["AI_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY"]) env[k] = cleanKey(rawEnv[k]);
  const model = env.AI_MODEL || "";
  if (env.AI_API_KEY) {
    return { baseUrl: (env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""), apiKey: env.AI_API_KEY, model: model || DEFAULT_MODEL };
  }
  for (const p of KEYED_PROVIDERS) {
    const key = env[p.env];
    if (key) return { baseUrl: p.baseUrl, apiKey: key, model: model || p.model };
  }
  if (env.GITHUB_TOKEN && env.AI_USE_GITHUB_MODELS !== "false") {
    return { baseUrl: (env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""), apiKey: env.GITHUB_TOKEN, model: model || DEFAULT_MODEL };
  }
  return null;
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
  const isGitHub = /(^|\.)github\.ai$/.test(new URL(cfg.baseUrl).hostname);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.apiKey}`,
    // GitHub Models expects GitHub's REST headers
    ...(isGitHub ? { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } : { Accept: "application/json" }),
  };
  const send = async (json: boolean): Promise<Response> => {
    const r = await post(json);
    // Providers retire models regularly: if the configured one is gone, pick an available one and retry.
    if (r.status === 404 || r.status === 400) {
      const text = await r.clone().text();
      if (/model_not_found|does not exist|decommissioned|not supported.*model|unknown model/i.test(text)) {
        const replacement = await pickAvailableModel(cfg, headers);
        if (replacement && replacement !== cfg.model) {
          console.warn(`Model "${cfg.model}" is unavailable at ${new URL(cfg.baseUrl).host}; switching to "${replacement}". Set the AI_MODEL variable to choose one.`);
          cfg.model = replacement;
          return post(json);
        }
      }
    }
    return r;
  };
  const post = (json: boolean) =>
    fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.2,
        max_tokens: isReasoningModel(cfg.model) ? opts.maxTokens + 4000 : opts.maxTokens,
        ...(isReasoningModel(cfg.model) && /groq\.com/.test(cfg.baseUrl) ? { reasoning_effort: "low" } : {}),
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  let res = await send(opts.json);
  // Per-minute limits (requests or tokens) reset quickly: wait and retry a few times before giving up.
  for (let attempt = 0; res.status === 429 && attempt < 3; attempt++) {
    const ra = Number(res.headers.get("retry-after"));
    const waitS = Number.isFinite(ra) && ra > 0 ? ra : 20 * (attempt + 1);
    if (waitS > 90) break; // a daily limit: stop and let the next run continue
    console.warn(`Rate limited by ${new URL(cfg.baseUrl).host}; waiting ${Math.ceil(waitS)}s`);
    await new Promise((r) => setTimeout(r, waitS * 1000 + 250));
    res = await send(opts.json);
  }
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
  const raw = await res.text();
  let data: { choices?: { message?: { content?: string | null }; finish_reason?: string }[] };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Non-JSON ${res.status} response from ${cfg.baseUrl}/chat/completions (content-type ${res.headers.get("content-type")}): ${JSON.stringify(raw.slice(0, 200))}`);
  }
  const choice = data.choices?.[0];
  if (!choice?.message?.content) throw new Error(`Empty response from ${cfg.model}`);
  if (choice.finish_reason === "length") throw new Error(`Response from ${cfg.model} was cut off (max_tokens)`);
  return choice.message.content;
}

// Non-reasoning models first: they answer directly (no hidden reasoning tokens) and have higher free limits.
const PREFERRED_MODELS = [/llama-4-scout/i, /llama-4-maverick/i, /llama.*70b/i, /kimi/i, /gemini.*flash/i, /gpt-oss-120b/i, /qwen3?.*(32b|235b)/i, /deepseek/i, /gpt-oss-20b/i, /llama.*8b/i];
/** Reasoning models spend output tokens thinking first; ask them to keep it short. */
const isReasoningModel = (m: string) => /gpt-oss|qwen3|deepseek-r1|o\d-|magistral/i.test(m);
const NON_CHAT = /whisper|tts|guard|embed|playai|orpheus|compound|vision-preview|moderation|audio/i;

/** Lists the provider's models (OpenAI-compatible GET /models) and picks the best general chat model. */
export async function pickAvailableModel(cfg: LlmConfig, headers: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetch(`${cfg.baseUrl}/models`, { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { id: string; active?: boolean }[] };
    const ids = (data.data ?? []).filter((m) => m.active !== false && !NON_CHAT.test(m.id)).map((m) => m.id.replace(/^models\//, ""));
    for (const re of PREFERRED_MODELS) {
      const hit = ids.find((id) => re.test(id));
      if (hit) return hit;
    }
    return ids[0] ?? null;
  } catch {
    return null;
  }
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
  let lastReply = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await chat(cfg, messages, { maxTokens: opts.maxTokens ?? 3000, json: true });
    lastReply = reply;
    try {
      return opts.schema.parse(extractJson(reply));
    } catch (e) {
      lastError = e instanceof z.ZodError ? z.prettifyError(e) : e instanceof Error ? e.message : String(e);
      messages.push({ role: "assistant", content: reply }, { role: "user", content: `That reply was invalid: ${lastError}\nReply again with corrected JSON only.` });
    }
  }
  throw new Error(`Model output did not match the expected format: ${lastError.slice(0, 300)} | reply started: ${JSON.stringify(lastReply.slice(0, 160))}`);
}
