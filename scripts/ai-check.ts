// Sends one tiny structured request to the configured AI provider and reports the result.
import { z } from "zod";
import { chatJson, envConfig } from "../lib/llm";

(async () => {
  const cfg = envConfig();
  if (!cfg) {
    console.log("No AI provider configured. Add a GROQ_API_KEY, GEMINI_API_KEY or OPENROUTER_API_KEY repository secret.");
    process.exit(1);
  }
  console.log(`Provider: ${cfg.baseUrl}\nModel:    ${cfg.model}`);
  // shape only, never the key itself
  const k = cfg.apiKey;
  console.log(`Key length: ${k.length} characters${k.length < 30 ? " (too short: real keys are about 40-60 characters, so only part of it was pasted)" : ""}`);
  try {
    const out = await chatJson(cfg, {
      system: "You are a connectivity check.",
      user: 'Return {"reply": "pong"}.',
      schema: z.object({ reply: z.string() }),
      maxTokens: 50,
    });
    console.log(`OK: ${cfg.model} replied ${JSON.stringify(out.reply)}. AI extraction will work.`);
  } catch (e) {
    console.log(`FAILED: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
})();
