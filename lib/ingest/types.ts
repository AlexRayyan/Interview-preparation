export interface Candidate {
  text: string;
  answer?: string | null;
  url?: string | null;
  difficulty?: "easy" | "medium" | "hard" | null;
}

export interface RawPostInput {
  source: "reddit" | "hackernews" | "stackexchange" | "github" | "user";
  external_id: string;
  url?: string | null;
  title?: string | null;
  body: string;
  author?: string | null;
  license?: string | null;
  /** Pre-parsed questions, for structured sources such as curated GitHub lists. */
  candidates?: Candidate[] | null;
  hint_category?: string | null;
  hint_role?: string | null;
  company?: string | null;
  posted_at?: string | null;
}

export interface Connector {
  name: RawPostInput["source"];
  /** Returns null when the connector is not configured (e.g. missing credentials). */
  isConfigured(): { ok: true } | { ok: false; reason: string };
  fetch(opts: { limit: number }): Promise<RawPostInput[]>;
}

export const USER_AGENT = process.env.SCRAPER_USER_AGENT ?? "interview-prep-bot/0.1 (+local prototype)";

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
