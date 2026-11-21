import { USER_AGENT, type Candidate, type Connector, type RawPostInput } from "./types";

/**
 * Curated, openly licensed GitHub repositories. Only add repos whose license allows reuse,
 * and keep the attribution fields accurate: they are shown next to every question.
 */
export const GITHUB_SOURCES: {
  repo: string;
  branch: string;
  file: string;
  license: string;
  role: "data_analyst" | "data_engineer" | "both";
  defaultCategory?: string;
}[] = [
  {
    repo: "datadriven-io/data-engineering-interview-questions",
    branch: "main",
    file: "README.md",
    license: "CC BY-SA 4.0",
    role: "data_engineer",
  },
  {
    repo: "jaimin-bariya/Awesome-SQL-Interview",
    branch: "main",
    file: "README.md",
    license: "MIT",
    role: "both",
    defaultCategory: "sql",
  },
];

const SKIP_SECTION = /table of contents|introduction|prerequisite|repository structure|contribut|license|acknowledg|companion|how many|explanation of concepts|window functions drill/i;

function categoryFromHeading(h: string, fallback?: string): string | undefined {
  if (/schema|data model/i.test(h)) return "data_modeling";
  if (/pipeline|architecture|case stud/i.test(h)) return "system_design";
  if (/python/i.test(h)) return "python";
  if (/sql|query|index|transaction|normaliz/i.test(h)) return "sql";
  return fallback;
}

function difficultyFromText(s: string): Candidate["difficulty"] {
  if (/\b(L0|basic|easy)\b/i.test(s)) return "easy";
  if (/\b(L1|intermediate|medium)\b/i.test(s)) return "medium";
  if (/\b(L2|L3|advanced|expert|hard)\b/i.test(s)) return "hard";
  return null;
}

const stripMd = (s: string) =>
  s
    .replace(/\*\*|__/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

interface Section {
  heading: string; // full heading path, e.g. "Theory > Basic SQL Theory Questions"
  items: Candidate[];
}

/** Parses a markdown README into sections of numbered-list questions and linked table rows. */
export function parseMarkdownQuestions(md: string): Section[] {
  const sections: Section[] = [];
  const headings: string[] = [];
  let current: Section | null = null;
  let lastItem: Candidate | null = null;
  let table: { headers: string[] } | null = null;

  const lines = md.replace(/\r/g, "").split("\n");
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      headings.length = level - 1;
      headings[level - 1] = stripMd(h[2]).replace(/\s*-\s*SOLUTION$/i, "");
      const path = headings.filter(Boolean).join(" > ");
      current = SKIP_SECTION.test(path) ? null : { heading: path, items: [] };
      if (current) sections.push(current);
      lastItem = null;
      table = null;
      continue;
    }
    if (!current) continue;

    // tables: | [Title](url) | col | col |
    if (/^\|.*\|$/.test(line)) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue; // separator row
      if (!table) {
        table = { headers: cells.map(stripMd) };
        continue;
      }
      const link = cells[0].match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (!link) continue;
      const details: string[] = [];
      let difficulty: Candidate["difficulty"] = null;
      let trap: string | null = null;
      cells.slice(1).forEach((c, i) => {
        const hdr = table!.headers[i + 1] ?? "";
        if (/difficulty/i.test(hdr)) difficulty = difficultyFromText(c);
        else if (/trap/i.test(hdr)) trap = stripMd(c).replace(/`/g, "");
        else details.push(stripMd(c));
      });
      current.items.push({
        text: `Interview problem: "${link[1]}"${details.length ? ` (${details.join("; ")})` : ""}. Walk through your approach and solution.`,
        answer: trap ? `Common trap to watch for: ${trap}.` : null,
        url: link[2],
        difficulty,
      });
      lastItem = null;
      continue;
    }
    table = null;

    const num = line.match(/^\s{0,3}\d+\.\s+(.+)$/);
    if (num) {
      lastItem = { text: stripMd(num[1]), answer: null };
      current.items.push(lastItem);
      continue;
    }
    // indented continuation = answer text for the previous numbered item
    const cont = line.match(/^\s{2,}[-*]?\s*(.+)$/);
    if (cont && lastItem) {
      const piece = stripMd(cont[1]);
      lastItem.answer = lastItem.answer ? `${lastItem.answer}\n- ${piece}` : `- ${piece}`;
      continue;
    }
    if (line.trim() === "" || line.trim() === "---") continue;
    lastItem = null;
  }
  return sections.filter((s) => s.items.length > 0);
}

export const github: Connector = {
  name: "github",
  isConfigured: () => ({ ok: true }),
  async fetch({ limit }) {
    const out: RawPostInput[] = [];
    for (const src of GITHUB_SOURCES) {
      const url = `https://raw.githubusercontent.com/${src.repo}/${src.branch}/${src.file}`;
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
      const md = await res.text();
      for (const section of parseMarkdownQuestions(md)) {
        const difficulty = difficultyFromText(section.heading);
        out.push({
          source: "github",
          external_id: `${src.repo}#${section.heading}`,
          url: `https://github.com/${src.repo}`,
          title: `${src.repo}: ${section.heading}`,
          body: section.items.map((i) => i.text).join("\n"),
          author: src.repo.split("/")[0],
          license: src.license,
          candidates: section.items.map((i) => ({ ...i, difficulty: i.difficulty ?? difficulty })),
          hint_category: categoryFromHeading(section.heading, src.defaultCategory) ?? null,
          hint_role: src.role,
        });
      }
    }
    return out.slice(0, limit);
  },
};
