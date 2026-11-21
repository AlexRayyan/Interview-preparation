import { getJson, sleep, USER_AGENT, type Connector, type RawPostInput } from "./types";

// Reddit Data API with app-only OAuth (https://www.reddit.com/dev/api). Requires a free "script" app.
// Reddit's terms require OAuth for API access, so this connector is skipped without credentials.
const SUBREDDITS: { name: string; hint_role?: string }[] = [
  { name: "dataengineering", hint_role: "data_engineer" },
  { name: "dataanalysis", hint_role: "data_analyst" },
  { name: "analytics", hint_role: "data_analyst" },
  { name: "datascience" },
  { name: "SQL" },
  { name: "BusinessIntelligence", hint_role: "data_analyst" },
];
const QUERY = 'interview (questions OR asked OR experience OR "technical round")';

interface Listing {
  data: { children: { data: { id: string; title: string; selftext: string; author: string; permalink: string; created_utc: number; score: number } }[] };
}

async function token(): Promise<string> {
  const id = process.env.REDDIT_CLIENT_ID!;
  const secret = process.env.REDDIT_CLIENT_SECRET!;
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": process.env.REDDIT_USER_AGENT ?? USER_AGENT,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export const reddit: Connector = {
  name: "reddit",
  isConfigured: () =>
    process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET
      ? { ok: true }
      : { ok: false, reason: "set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (see .env.example)" },
  async fetch({ limit }) {
    const auth = await token();
    const out: RawPostInput[] = [];
    const perSub = Math.min(100, Math.max(10, Math.ceil(limit / SUBREDDITS.length)));
    for (const sub of SUBREDDITS) {
      const data = await getJson<Listing>(
        `https://oauth.reddit.com/r/${sub.name}/search?q=${encodeURIComponent(QUERY)}&restrict_sr=1&sort=top&t=year&limit=${perSub}&raw_json=1`,
        { headers: { Authorization: `Bearer ${auth}`, "User-Agent": process.env.REDDIT_USER_AGENT ?? USER_AGENT } },
      );
      for (const { data: p } of data.data.children) {
        if (!p.selftext || p.selftext.length < 150 || p.selftext === "[removed]" || p.selftext === "[deleted]") continue;
        out.push({
          source: "reddit",
          external_id: p.id,
          url: `https://www.reddit.com${p.permalink}`,
          title: p.title,
          body: `${p.title}\n\n${p.selftext}`,
          author: null, // don't store usernames
          hint_role: sub.hint_role ?? null,
          posted_at: new Date(p.created_utc * 1000).toISOString(),
        });
      }
      await sleep(1100); // stay well under 100 requests/minute
    }
    return out.slice(0, limit);
  },
};
