// Collects questions from every configured source and updates data/questions.json.
// Usage: npm run update-bank -- [--sources github,hackernews,stackexchange,reddit] [--limit 100] [--answers 60]
// AI: GitHub Models by default (free in Actions via GITHUB_TOKEN); any OpenAI-compatible API via AI_BASE_URL / AI_API_KEY / AI_MODEL.
import { aiEnabled, writeModelAnswers } from "../lib/ai";
import { fetchSources, CONNECTORS } from "../lib/ingest";
import { postKey, processBatchAi, processPost } from "../lib/ingest/extract";
import type { RawPostInput } from "../lib/ingest/types";
import { envConfig, RateLimitError } from "../lib/llm";
import { Store } from "../lib/store";
import { SEED_QUESTIONS } from "../data/seed-questions";
import { arg, writeSummary } from "./lib";

const POSTS_PER_REQUEST = 3;
const ANSWERS_PER_REQUEST = 5;
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

(async () => {
  const store = new Store();
  const sources = (arg("sources") ?? Object.keys(CONNECTORS).join(",")).split(",").map((s) => s.trim()).filter(Boolean);
  const limit = Number(arg("limit") ?? 100);
  const answerBudget = Number(arg("answers") ?? 60);
  const maxAiPosts = Number(process.env.AI_MAX_POSTS || 150);
  const cfg = envConfig();
  process.env.AI_MIN_INTERVAL_MS ||= "4500"; // ~13 requests/minute, under free-tier limits
  const log: string[] = [`Extraction: ${cfg ? `AI (${cfg.model} via ${new URL(cfg.baseUrl).host})` : "heuristic (no AI provider configured)"}`, ""];
  let rateLimited = false;

  // 1. curated starter set (idempotent)
  let seeded = 0;
  for (const q of SEED_QUESTIONS) if (store.insert({ ...q, source_type: "seed", attribution: "Curated starter set", extracted_by: "manual" })) seeded++;
  if (seeded) log.push(`- Curated starter set: ${seeded} added`);

  // 2. sources
  for (const r of await fetchSources(sources, limit)) {
    if (r.skipped) { log.push(`- ${r.source}: skipped (${r.skipped})`); continue; }
    if (r.error) { log.push(`- ${r.source}: **error** ${r.error}`); continue; }
    let added = 0, processed = 0, deferred = 0;
    const freeText: RawPostInput[] = [];
    for (const p of r.posts) {
      if (p.candidates?.length) {
        added += (await processPost(store, p)).added; // curated lists: re-read every run, no AI needed
        processed++;
      } else if (!store.hasSeen(postKey(p))) freeText.push(p);
    }
    if (aiEnabled()) {
      for (let i = 0; i < freeText.length; i += POSTS_PER_REQUEST) {
        const batch = freeText.slice(i, i + POSTS_PER_REQUEST);
        if (rateLimited || processed >= maxAiPosts) { deferred += batch.length; continue; }
        try {
          added += await processBatchAi(store, batch);
          processed += batch.length;
          batch.forEach((p) => store.markSeen(postKey(p)));
        } catch (e) {
          if (e instanceof RateLimitError) rateLimited = true;
          deferred += batch.length;
          console.error(`  ${r.source} batch ${i / POSTS_PER_REQUEST}: ${errMsg(e)}`);
        }
      }
    } else {
      for (const p of freeText) {
        added += (await processPost(store, p, { useAi: false })).added;
        processed++;
        store.markSeen(postKey(p));
      }
    }
    log.push(`- ${r.source}: ${r.posts.length} fetched, ${processed} processed, ${added} new questions${deferred ? `, ${deferred} left for the next run` : ""}`);
  }

  // 3. model answers for questions that don't have one yet
  if (aiEnabled() && answerBudget > 0 && !rateLimited) {
    const todo = store.bank.questions.filter((q) => !q.answer).slice(0, answerBudget);
    let written = 0;
    for (let i = 0; i < todo.length; i += ANSWERS_PER_REQUEST) {
      const batch = todo.slice(i, i + ANSWERS_PER_REQUEST);
      try {
        const answers = await writeModelAnswers(batch.map((q) => ({ question: q.text, category: q.category, role: q.role })));
        batch.forEach((q, j) => {
          const a = answers.get(j);
          if (a) { q.answer = a; q.answer_by_ai = true; written++; }
        });
      } catch (e) {
        console.error(`  answers batch ${i / ANSWERS_PER_REQUEST}: ${errMsg(e)}`);
        if (e instanceof RateLimitError) { rateLimited = true; break; }
      }
    }
    log.push(`- Model answers: ${written} written, ${store.bank.questions.filter((q) => !q.answer).length} questions still without one`);
  }
  if (rateLimited) log.push("", "_The AI provider's free-tier rate limit was reached; remaining work continues on the next run._");

  store.save();
  writeSummary("Question bank update", log, store.added);
})();
