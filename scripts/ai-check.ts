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
  try {
    const out = await chatJson(cfg, {
      system: "You are a connectivity check.",
      user: 'Return {"reply": "pong"}.',
      schema: z.object({ reply: z.string() }),
      maxTokens: 50,
    });
    console.log(`OK: the model replied ${JSON.stringify(out.reply)}. AI extraction will work.`);
  } catch (e) {
    console.log(`FAILED: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
})();
