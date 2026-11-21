"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { pickPractice } from "@/lib/bank";
import { bestScores, createSession, getAiSettings } from "@/lib/progress";
import { CATEGORIES, DIFFICULTIES, isCategory, isDifficulty, type Category, type Role } from "@/lib/taxonomy";
import { AiNotice, PageHeader } from "@/components/ui";

export function PracticeSetup() {
  const router = useRouter();
  const sp = useSearchParams();
  const [hasKey, setHasKey] = useState(false);
  const [empty, setEmpty] = useState(false);
  useEffect(() => setHasKey(Boolean(getAiSettings())), []);

  const start = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const role = (fd.get("role") as Role) ?? "data_analyst";
    const categories = fd.getAll("categories").filter(isCategory) as Category[];
    const difficulty = fd.get("difficulty");
    const count = Number(fd.get("count") ?? 5);
    const mode = fd.get("mode") === "ai" && hasKey ? "ai" : "self";
    const best = bestScores();
    const ids = pickPractice({
      role,
      categories,
      difficulty: isDifficulty(difficulty) ? difficulty : undefined,
      count,
      weakOnly: fd.get("weak") === "on",
      best: (id) => best.get(id) ?? null,
    });
    if (!ids.length) return setEmpty(true);
    const s = createSession({ role, mode, questionIds: ids });
    router.push(`/practice/session/?id=${s.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Mock interview" subtitle="Pick a role and topics. You'll get one question at a time; questions you scored low on come back more often." />
      {empty && <p className="card mb-4 border-warn/40 p-3 text-sm text-warn">No questions match that combination. Try more topics or any difficulty.</p>}
      {!hasKey && (
        <div className="mb-4">
          <AiNotice />
        </div>
      )}
      <form onSubmit={start} className="card space-y-6 p-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Role</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["data_analyst", "Data Analyst", "SQL, statistics, BI, product cases"],
              ["data_engineer", "Data Engineer", "SQL, pipelines, modeling, Spark, design"],
            ].map(([v, label, hint], i) => (
              <label key={v} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name="role" value={v} defaultChecked={i === 0} className="mt-1 accent-[var(--accent)]" />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Topics <span className="font-normal text-muted">(leave empty for a mix)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <label key={k} className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent">
                <input type="checkbox" name="categories" value={k} className="sr-only" />
                {v}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Difficulty</span>
            <select name="difficulty" className="input">
              <option value="">Mixed</option>
              {Object.entries(DIFFICULTIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Questions</span>
            <select name="count" defaultValue="5" className="input">
              {[3, 5, 8, 10, 15].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Grading</span>
            <select name="mode" key={String(hasKey)} defaultValue={hasKey ? "ai" : "self"} className="input">
              <option value="ai" disabled={!hasKey}>
                AI interviewer{hasKey ? "" : " (add key in Settings)"}
              </option>
              <option value="self">Self-graded</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="weak" defaultChecked={sp.get("weak") === "1"} className="accent-[var(--accent)]" />
          Only questions I&apos;ve scored below 6 on
        </label>

        <button className="btn w-full sm:w-auto">Start interview</button>
      </form>
    </div>
  );
}
