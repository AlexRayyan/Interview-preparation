// Client-safe helpers over the static question bank.
import bankJson from "@/data/questions.json";
import type { Category, Difficulty, Role, SourceType } from "./taxonomy";
import type { Question, QuestionBank } from "./types";

export const BANK = bankJson as unknown as QuestionBank;
export const QUESTIONS: Question[] = BANK.questions;
const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: number): Question | undefined {
  return BY_ID.get(id);
}

export interface Filters {
  q?: string;
  role?: Role | "";
  category?: Category | "";
  difficulty?: Difficulty | "";
  source?: SourceType | "";
  company?: string;
}

export function filterQuestions(f: Filters): Question[] {
  const needle = f.q?.trim().toLowerCase();
  return QUESTIONS.filter(
    (q) =>
      (!f.role || f.role === "both" || q.role === f.role || q.role === "both") &&
      (!f.category || q.category === f.category) &&
      (!f.difficulty || q.difficulty === f.difficulty) &&
      (!f.source || q.source_type === f.source) &&
      (!f.company || q.company?.toLowerCase() === f.company.toLowerCase()) &&
      (!needle || q.text.toLowerCase().includes(needle) || q.company?.toLowerCase().includes(needle)),
  ).sort((a, b) => b.id - a.id);
}

export function countBy<K extends keyof Question>(key: K, list = QUESTIONS): { key: NonNullable<Question[K]>; n: number }[] {
  const m = new Map<NonNullable<Question[K]>, number>();
  for (const q of list) if (q[key] != null) m.set(q[key] as NonNullable<Question[K]>, (m.get(q[key] as NonNullable<Question[K]>) ?? 0) + 1);
  return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks questions for a session: balanced across topics so one big source can't swamp it,
 * favouring questions never attempted, then ones scored low.
 */
export function pickPractice(opts: {
  role: Role;
  categories: Category[];
  difficulty?: Difficulty;
  count: number;
  weakOnly?: boolean;
  best: (id: number) => number | null; // best score so far, null if never attempted
}): number[] {
  const eligible = QUESTIONS.filter(
    (q) =>
      (opts.role === "both" || q.role === opts.role || q.role === "both") &&
      (!opts.difficulty || q.difficulty === opts.difficulty) &&
      (!opts.categories.length || opts.categories.includes(q.category)) &&
      (!opts.weakOnly || ((opts.best(q.id) ?? 99) < 6)),
  );
  const byCat = new Map<Category, Question[]>();
  for (const q of shuffle(eligible)) byCat.set(q.category, [...(byCat.get(q.category) ?? []), q]);
  const rank = (q: Question) => {
    const b = opts.best(q.id);
    return b == null ? -1 : b;
  };
  const pools = shuffle([...byCat.values()]).map((list) => [...list].sort((a, b) => rank(a) - rank(b)));
  const ids: number[] = [];
  for (let round = 0; ids.length < opts.count && pools.some((p) => p.length > round); round++) {
    for (const pool of pools) if (pool[round] && ids.length < opts.count) ids.push(pool[round].id);
  }
  return shuffle(ids);
}
