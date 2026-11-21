// Collects questions from every configured source and updates data/questions.json.
// Usage: npm run update-bank -- [--sources github,hackernews,stackexchange,reddit] [--limit 100] [--answers 40]
import { aiEnabled, writeModelAnswer } from "../lib/ai";
import { fetchSources, CONNECTORS } from "../lib/ingest";
import { postKey, processPost } from "../lib/ingest/extract";
import { Store } from "../lib/store";
import { SEED_QUESTIONS } from "../data/seed-questions";
import { arg, writeSummary } from "./lib";

(async () => {
  const store = new Store();
  const sources = (arg("sources") ?? Object.keys(CONNECTORS).join(",")).split(",").map((s) => s.trim()).filter(Boolean);
  const limit = Number(arg("limit") ?? 100);
  const answerBudget = Number(arg("answers") ?? 40);
  const log: string[] = [`Extraction: ${aiEnabled() ? "Claude" : "heuristic (no ANTHROPIC_API_KEY secret)"}`, ""];

  // 1. curated starter set (idempotent)
  let seeded = 0;
  for (const q of SEED_QUESTIONS) if (store.insert({ ...q, source_type: "seed", attribution: "Curated starter set", extracted_by: "manual" })) seeded++;
  if (seeded) log.push(`- Curated starter set: ${seeded} added`);

  // 2. sources
  for (const r of await fetchSources(sources, limit)) {
    if (r.skipped) { log.push(`- ${r.source}: skipped (${r.skipped})`); continue; }
    if (r.error) { log.push(`- ${r.source}: **error** ${r.error}`); continue; }
    let added = 0, processed = 0, failed = 0;
    for (const p of r.posts) {
      const key = postKey(p);
      // curated GitHub lists are re-read every run (they change); other posts only once
      if (p.source !== "github" && store.hasSeen(key)) continue;
      try {
        const res = await processPost(store, p);
        added += res.added;
        processed++;
        store.markSeen(key);
      } catch (e) {
        failed++;
        console.error(`  ${key}: ${e instanceof Error ? e.message : e}`);
      }
    }
    log.push(`- ${r.source}: ${r.posts.length} fetched, ${processed} processed, ${added} new questions${failed ? `, ${failed} failed (retried next run)` : ""}`);
  }

  // 3. model answers for questions that don't have one yet
  if (aiEnabled() && answerBudget > 0) {
    const todo = store.bank.questions.filter((q) => !q.answer).slice(0, answerBudget);
    let written = 0;
    for (const q of todo) {
      try {
        q.answer = await writeModelAnswer({ question: q.text, category: q.category, role: q.role });
        q.answer_by_ai = true;
        written++;
      } catch (e) {
        console.error(`  answer for #${q.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    const left = store.bank.questions.filter((q) => !q.answer).length;
    log.push(`- Model answers: ${written} written by Claude, ${left} questions still without one`);
  }

  store.save();
  writeSummary("Question bank update", log, store.added);
})();
