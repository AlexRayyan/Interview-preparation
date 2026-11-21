"use client";

import { useEffect, useState } from "react";
import { getAttempts, type Attempt } from "@/lib/progress";
import { ScorePill } from "./ui";

export function PastAttempts({ questionId }: { questionId: number }) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  useEffect(() => setAttempts(getAttempts().filter((a) => a.questionId === questionId).reverse().slice(0, 10)), [questionId]);
  if (!attempts.length) return null;
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Your previous attempts</h2>
      <ul className="mt-3 divide-y divide-border text-sm">
        {attempts.map((a, i) => (
          <li key={i} className="flex items-start justify-between gap-4 py-2.5">
            <p className="line-clamp-2 text-muted">{a.answer}</p>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
              {a.at.slice(0, 10)} <ScorePill score={a.score} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
