import { github } from "./github";
import { hackernews } from "./hackernews";
import { reddit } from "./reddit";
import { stackexchange } from "./stackexchange";
import type { Connector, RawPostInput } from "./types";

export const CONNECTORS: Record<string, Connector> = { github, hackernews, stackexchange, reddit };

export interface FetchResult {
  source: string;
  posts: RawPostInput[];
  skipped?: string;
  error?: string;
}

export async function fetchSources(sources: string[], limit = 100): Promise<FetchResult[]> {
  const results: FetchResult[] = [];
  for (const name of sources) {
    const c = CONNECTORS[name];
    if (!c) {
      results.push({ source: name, posts: [], error: "unknown source" });
      continue;
    }
    const cfg = c.isConfigured();
    if (!cfg.ok) {
      results.push({ source: name, posts: [], skipped: cfg.reason });
      continue;
    }
    try {
      results.push({ source: name, posts: await c.fetch({ limit }) });
    } catch (e) {
      const msg = e instanceof Error ? `${e.message}${e.cause ? ` (${String((e.cause as Error).message ?? e.cause)})` : ""}` : String(e);
      results.push({ source: name, posts: [], error: msg });
    }
  }
  return results;
}
