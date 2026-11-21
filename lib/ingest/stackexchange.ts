import { getJson, sleep, type Connector, type RawPostInput } from "./types";

// Stack Exchange API v2.3 (https://api.stackexchange.com/docs). Content is CC BY-SA; we keep author + link.
const SEARCHES: { site: string; q: string; hint_role?: string }[] = [
  { site: "datascience", q: "interview" },
  { site: "stackoverflow", q: "interview question sql" },
  { site: "dba", q: "interview" },
  { site: "stats", q: "interview question", hint_role: "data_analyst" },
];

interface Item {
  question_id: number;
  title: string;
  body?: string;
  link: string;
  owner?: { display_name?: string };
  creation_date: number;
  score: number;
  tags: string[];
}

export const stackexchange: Connector = {
  name: "stackexchange",
  isConfigured: () => ({ ok: true }),
  async fetch({ limit }) {
    const out: RawPostInput[] = [];
    const key = process.env.STACKEXCHANGE_KEY ? `&key=${process.env.STACKEXCHANGE_KEY}` : "";
    const perSite = Math.max(10, Math.ceil(limit / SEARCHES.length));
    for (const s of SEARCHES) {
      const data = await getJson<{ items: Item[]; backoff?: number }>(
        `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&q=${encodeURIComponent(s.q)}&site=${s.site}&pagesize=${Math.min(perSite, 100)}&filter=withbody${key}`,
      );
      for (const it of data.items) {
        if (it.score < 0 || !it.body) continue;
        out.push({
          source: "stackexchange",
          external_id: `${s.site}:${it.question_id}`,
          url: it.link,
          title: decode(it.title),
          body: `${decode(it.title)}\n\n${it.body}`,
          author: it.owner?.display_name ?? null,
          license: "CC BY-SA 4.0",
          hint_role: s.hint_role ?? null,
          posted_at: new Date(it.creation_date * 1000).toISOString(),
        });
      }
      // honour the API's backoff field
      await sleep(((data.backoff ?? 0) + 1) * 1000);
    }
    return out.slice(0, limit);
  },
};

function decode(s: string) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
