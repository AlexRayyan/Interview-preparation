import fs from "node:fs";
import path from "node:path";
import type { Question } from "../lib/types";
import { CATEGORIES, ROLES } from "../lib/taxonomy";

/** Writes a Markdown summary (used as the PR body / issue comment by the workflows). */
export function writeSummary(title: string, lines: string[], added: Question[]) {
  const out = [`## ${title}`, "", ...lines, ""];
  if (added.length) {
    out.push(`### ${added.length} new question${added.length === 1 ? "" : "s"}`, "");
    for (const q of added.slice(0, 150)) {
      out.push(`- [ ] **${CATEGORIES[q.category]}** · ${ROLES[q.role]} · ${q.difficulty}${q.company ? ` · ${q.company}` : ""}${q.extracted_by === "heuristic" && q.source_type !== "github" ? " · _heuristic, check wording_" : ""}  \n  ${q.text.replace(/\n/g, " ")}`);
    }
    if (added.length > 150) out.push(`- …and ${added.length - 150} more (see the diff of data/questions.json)`);
  } else {
    out.push("No new questions.");
  }
  const file = process.env.SUMMARY_FILE ?? path.join(process.cwd(), ".tmp", "summary.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${out.join("\n")}\n`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `added=${added.length}\n`);
  console.log(out.join("\n"));
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
