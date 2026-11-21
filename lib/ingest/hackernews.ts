import { getJson, sleep, type Connector, type RawPostInput } from "./types";

// Hacker News via the official Algolia search API (https://hn.algolia.com/api). No key needed.
const QUERIES = [
  "data engineer interview questions",
  "data analyst interview",
  "data engineering interview",
  "SQL interview question",
];

interface Hit {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  story_text?: string | null;
  comment_text?: string | null;
  author: string;
  created_at: string;
  url?: string | null;
}

export const hackernews: Connector = {
  name: "hackernews",
  isConfigured: () => ({ ok: true }),
  async fetch({ limit }) {
    const out: RawPostInput[] = [];
    const perQuery = Math.max(10, Math.ceil(limit / QUERIES.length));
    for (const q of QUERIES) {
      const data = await getJson<{ hits: Hit[] }>(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=(story,comment)&hitsPerPage=${perQuery}`,
      );
      for (const h of data.hits) {
        const body = h.comment_text ?? h.story_text ?? "";
        if (body.length < 80) continue;
        out.push({
          source: "hackernews",
          external_id: h.objectID,
          url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          title: h.title ?? h.story_title ?? null,
          body,
          author: h.author,
          posted_at: h.created_at,
        });
      }
      await sleep(500);
    }
    return out.slice(0, limit);
  },
};
