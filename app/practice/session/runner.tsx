"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getQuestion } from "@/lib/bank";
import { completeSession, getAttempts, getSession, type Attempt, type Session } from "@/lib/progress";
import { CATEGORIES, type Category } from "@/lib/taxonomy";
import type { Question } from "@/lib/types";
import { AnswerPanel, FeedbackView } from "@/components/AnswerPanel";
import { QuestionMeta, ScorePill, SourceLine } from "@/components/ui";

export function SessionRunner() {
  const id = useSearchParams().get("id") ?? "";
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<number, number | null>>({});
  const [graded, setGraded] = useState(false);

  useEffect(() => {
    const s = getSession(id) ?? null;
    setSession(s);
    if (!s) return;
    const done = getAttempts().filter((a) => a.sessionId === s.id);
    setScores(Object.fromEntries(done.map((a) => [a.questionId, a.score])));
    const answered = new Set(done.map((a) => a.questionId));
    const firstOpen = s.questionIds.findIndex((q) => !answered.has(q));
    setIndex(s.completedAt || firstOpen === -1 ? s.questionIds.length : firstOpen);
  }, [id]);

  if (session === undefined) return null;
  if (session === null)
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p>This session isn&apos;t saved in this browser.</p>
        <Link href="/practice/" className="btn mt-4">
          Start a new session
        </Link>
      </div>
    );

  const questions = session.questionIds.map((q) => getQuestion(q)).filter((q): q is Question => Boolean(q));
  const total = questions.length;
  const finish = () => {
    completeSession(session.id);
    setIndex(total);
  };
  if (index >= total) return <Summary session={session} questions={questions} scores={scores} />;

  const q = questions[index];
  const next = () => {
    setGraded(false);
    if (index + 1 >= total) finish();
    else setIndex(index + 1);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Question {index + 1} of {total} · {session.mode === "ai" ? "AI interviewer" : "Self-graded"}
        </span>
        <button className="hover:text-fg" onClick={finish}>
          End session
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2">
        <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${(index / total) * 100}%` }} />
      </div>
      <div className="card p-6">
        <QuestionMeta role={q.role} category={q.category} difficulty={q.difficulty} company={q.company} source={q.source_type} />
        <h1 className="mt-4 text-xl font-semibold leading-snug">{q.text}</h1>
        <SourceLine url={q.source_url} title={q.source_title} attribution={q.attribution} />
      </div>
      <AnswerPanel
        key={q.id}
        question={q}
        sessionId={session.id}
        mode={session.mode}
        onGraded={(s) => {
          setScores((m) => ({ ...m, [q.id]: s }));
          setGraded(true);
        }}
      />
      <div className="flex justify-end gap-3">
        {graded ? (
          <button className="btn" onClick={next}>
            {index + 1 >= total ? "Finish & see summary" : "Next question →"}
          </button>
        ) : (
          <button className="btn-ghost" onClick={next}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

function Summary({ session, questions, scores }: { session: Session; questions: Question[]; scores: Record<number, number | null> }) {
  const [attempts, setAttempts] = useState<Map<number, Attempt>>(new Map());
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => setAttempts(new Map(getAttempts().filter((a) => a.sessionId === session.id).map((a) => [a.questionId, a]))), [session.id]);

  const scored = Object.values(scores).filter((s): s is number => s != null);
  const avg = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null;
  const byCat = new Map<Category, number[]>();
  for (const q of questions) {
    const s = scores[q.id];
    if (s != null) byCat.set(q.category, [...(byCat.get(q.category) ?? []), s]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card p-6 text-center">
        <p className="text-sm text-muted">Session complete</p>
        <p className="mt-2 text-4xl font-semibold tabular-nums" data-testid="session-score">
          {avg != null ? `${avg}/10` : "-"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {scored.length} of {questions.length} questions scored
        </p>
        {byCat.size > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            {[...byCat.entries()].map(([c, s]) => (
              <span key={c} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1">
                {CATEGORIES[c]} <ScorePill score={Math.round(s.reduce((a, b) => a + b, 0) / s.length)} />
              </span>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/practice/" className="btn">
            New session
          </Link>
          <Link href="/practice/?weak=1" className="btn-ghost">
            Practice weak areas
          </Link>
        </div>
      </div>
      <ul className="space-y-3">
        {questions.map((q) => {
          const a = attempts.get(q.id);
          return (
            <li key={q.id} className="card p-4">
              <button className="flex w-full items-start justify-between gap-4 text-left" onClick={() => setOpen(open === q.id ? null : q.id)}>
                <span className="text-sm font-medium">{q.text}</span>
                <ScorePill score={scores[q.id] ?? null} />
              </button>
              {open === q.id && (
                <div className="mt-3 space-y-3">
                  {a ? <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-sm">{a.answer}</p> : <p className="text-sm text-muted">Skipped.</p>}
                  {a?.feedback && <FeedbackView f={a.feedback} />}
                  <Link href={`/questions/${q.id}/`} className="text-sm text-accent">
                    Retry this question →
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
