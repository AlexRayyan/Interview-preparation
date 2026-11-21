// Turns an approved "Share your interview" GitHub issue into questions.
// The workflow passes the issue via ISSUE_BODY / ISSUE_NUMBER / ISSUE_URL environment variables.
import { aiEnabled } from "../lib/ai";
import { processPost } from "../lib/ingest/extract";
import { Store } from "../lib/store";
import { writeSummary } from "./lib";

/** Parses GitHub issue-form output ("### Label\n\nvalue") into a map. */
export function parseIssueForm(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = body.replace(/\r/g, "").split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const label = part.slice(0, nl).trim().toLowerCase();
    const value = part.slice(nl + 1).trim();
    out[label] = value === "_No response_" ? "" : value;
  }
  return out;
}

(async () => {
  const body = process.env.ISSUE_BODY ?? "";
  const number = process.env.ISSUE_NUMBER ?? "0";
  const form = parseIssueForm(body);
  const experience = form["interview experience"] ?? body;
  const role = /engineer/i.test(form["role"] ?? "") ? "data_engineer" : /analyst/i.test(form["role"] ?? "") ? "data_analyst" : null;
  const company = (form["company"] ?? "").slice(0, 80) || null;

  const store = new Store();
  const res = await processPost(store, {
    source: "user",
    external_id: `issue-${number}`,
    url: process.env.ISSUE_URL ?? null,
    title: company ? `Interview experience at ${company}` : "Interview experience",
    body: experience,
    company,
    hint_role: role,
  });
  store.markSeen(`user:issue-${number}`);
  store.save();
  writeSummary(`Questions from issue #${number}`, [`Extraction: ${aiEnabled() ? "AI" : "heuristic"} (${res.note})`], store.added);
})();
