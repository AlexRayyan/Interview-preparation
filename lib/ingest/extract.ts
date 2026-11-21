import { aiEnabled, extractQuestions } from "../ai";
import { classifyCategory, classifyDifficulty, classifyRole, guessCompany, heuristicExtract } from "../classify";
import type { Store } from "../store";
import { isCategory, isRole, type SourceType } from "../taxonomy";
import type { RawPostInput } from "./types";

export const postKey = (p: RawPostInput) => `${p.source}:${p.external_id}`;

function attributionFor(p: RawPostInput): string | null {
  if (p.source === "github") return `From ${p.author ? `${p.author}'s ` : ""}repository${p.license ? `, licensed ${p.license}` : ""}`;
  if (p.source === "stackexchange") return `Stack Exchange post${p.author ? ` by ${p.author}` : ""}, CC BY-SA 4.0`;
  if (p.source === "hackernews") return "Hacker News discussion";
  if (p.source === "reddit") return "Reddit discussion";
  if (p.source === "user") return "Shared by a community member";
  return null;
}

export interface PostResult {
  added: number;
  method: "ai" | "heuristic" | "curated";
  note: string;
}

/** Turns one raw post into questions in the store. Throws on AI errors so the post is retried next run. */
export async function processPost(store: Store, p: RawPostInput, opts: { useAi?: boolean } = {}): Promise<PostResult> {
  const useAi = opts.useAi ?? aiEnabled();
  const base = {
    source_type: p.source as SourceType,
    source_url: p.url ?? null,
    source_title: p.title ?? null,
    attribution: attributionFor(p),
  };
  let added = 0;

  // Curated lists (GitHub): already clean questions; keep their answers.
  if (p.candidates?.length) {
    for (const c of p.candidates) {
      const category = classifyCategory(c.text, p.hint_category);
      if (
        store.insert({
          ...base,
          text: c.text,
          answer: c.answer ?? null,
          source_url: c.url ?? p.url ?? null,
          category,
          role: classifyRole(c.text, category, p.hint_role),
          difficulty: c.difficulty ?? classifyDifficulty(c.text),
          company: p.company ?? null,
          extracted_by: "heuristic",
        })
      )
        added++;
    }
    return { added, method: "curated", note: `${added} new curated questions` };
  }

  if (useAi) {
    const ex = await extractQuestions({ source: p.source, title: p.title, body: p.body });
    if (!ex.relevant) return { added: 0, method: "ai", note: "not relevant" };
    for (const q of ex.questions) {
      if (
        store.insert({
          ...base,
          text: q.text,
          category: q.category,
          difficulty: q.difficulty,
          role: isRole(p.hint_role) && q.role === "both" ? p.hint_role : q.role,
          company: p.company ?? ex.company,
          round: q.round,
          extracted_by: "ai",
        })
      )
        added++;
    }
    return { added, method: "ai", note: `${ex.questions.length} extracted, ${added} new` };
  }

  const company = p.company ?? guessCompany(`${p.title ?? ""}\n${p.body}`);
  // user submissions are explicitly about interviews, so domain keywords aren't required there
  for (const text of heuristicExtract(p.body, { requireDomainTerms: p.source !== "user", allowPersonal: p.source === "user" })) {
    const category = classifyCategory(text, isCategory(p.hint_category) ? p.hint_category : null);
    if (
      store.insert({
        ...base,
        text,
        category,
        difficulty: classifyDifficulty(text),
        role: classifyRole(text, category, p.hint_role),
        company,
        extracted_by: "heuristic",
      })
    )
      added++;
  }
  return { added, method: "heuristic", note: `${added} new (heuristic)` };
}
