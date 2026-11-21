"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getQuestion } from "@/lib/bank";
import { getAttempts, getSessions, type Session } from "@/lib/progress";
import { CATEGORIES, ROLES, type Category } from "@/lib/taxonomy";
import { ScorePill } from "./ui";

export function MyProgress() {
  const [data, setData] = useState<{ answered: number; avg: number | null; weak: { c: Category; avg: number }[]; sessions: (Session & { avg: number | null; done: number })[] } | null>(null);

  useEffect(() => {
    const attempts = getAttempts();
    const scored = attempts.filter((a) => a.score != null);
    const byCat = new Map<Category, number[]>();
    for (const a of scored) {
      const q = getQuestion(a.questionId);
      if (q) byCat.set(q.category, [...(byCat.get(q.category) ?? []), a.score!]);
    }
    const mean = (xs: number[]) => Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10;
    const sessions = getSessions()
      .slice(-5)
      .reverse()
      .map((s) => {
        const sa = attempts.filter((a) => a.sessionId === s.id);
        const sc = sa.filter((a) => a.score != null).map((a) => a.score!);
        return { ...s, done: sa.length, avg: sc.length ? mean(sc) : null };
      });
    setData({
      answered: attempts.length,
      avg: scored.length ? mean(scored.map((a) => a.score!)) : null,
      weak: [...byCat.entries()].map(([c, xs]) => ({ c, avg: mean(xs) })).sort((a, b) => a.avg - b.avg).slice(0, 5),
      sessions,
    });
  }, []);

  if (!data || data.answered === 0) return null;

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <div className="card p-5">
        <h2 className="font-semibold">Your progress</h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{data.answered}</p>
        <p className="text-sm text-muted">answers practiced{data.avg != null ? ` · average ${data.avg}/10` : ""}</p>
        {data.weak.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-medium">Weakest topics</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {data.weak.map((w) => (
                <li key={w.c} className="flex items-center justify-between">
                  {CATEGORIES[w.c]} <ScorePill score={Math.round(w.avg)} />
                </li>
              ))}
            </ul>
            <Link href="/practice/?weak=1" className="mt-3 block text-xs text-accent">
              Practice weak areas →
            </Link>
          </>
        )}
      </div>
      {data.sessions.length > 0 && (
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold">Recent sessions</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <Link href={`/practice/session/?id=${s.id}`} className="hover:text-accent">
                  {ROLES[s.role]} · {s.mode === "ai" ? "AI-graded" : "self-graded"} · {new Date(s.createdAt).toLocaleString()}
                </Link>
                <span className="flex items-center gap-2 text-muted">
                  {s.done}/{s.questionIds.length} answered <ScorePill score={s.avg != null ? Math.round(s.avg) : null} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
