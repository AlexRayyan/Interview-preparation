"use client";

import { useState, useTransition } from "react";
import { gradeAnswer, type Feedback } from "@/lib/ai";
import { addAttempt, getApiKey, setAttemptScore } from "@/lib/progress";
import type { Question } from "@/lib/types";
import { Markdown } from "./Markdown";

interface Props {
  question: Question;
  sessionId: string | null;
  mode: "ai" | "self";
  onGraded?: (score: number | null) => void;
}

export function AnswerPanel({ question, sessionId, mode, onGraded }: Props) {
  const [answer, setAnswer] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ index: number; feedback: Feedback | null } | null>(null);
  const [selfScore, setSelfScore] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const submit = () =>
    start(async () => {
      setError(null);
      const text = answer.trim();
      if (!text) return;
      const apiKey = getApiKey();
      if (mode === "ai" && apiKey) {
        try {
          const feedback = await gradeAnswer({
            question: question.text,
            category: question.category,
            role: question.role,
            difficulty: question.difficulty,
            referenceAnswer: question.answer,
            answer: text,
            apiKey,
          });
          const index = addAttempt({ questionId: question.id, sessionId, answer: text, score: feedback.score, feedback, gradedBy: "ai" });
          setResult({ index, feedback });
          onGraded?.(feedback.score);
        } catch (e) {
          setError(`AI grading failed: ${e instanceof Error ? e.message : String(e)}. You can switch to self-grading below.`);
        }
        return;
      }
      const index = addAttempt({ questionId: question.id, sessionId, answer: text, score: null, feedback: null, gradedBy: "self" });
      setResult({ index, feedback: null });
    });

  const selfGrade = () => {
    const text = answer.trim();
    if (!text) return;
    const index = addAttempt({ questionId: question.id, sessionId, answer: text, score: null, feedback: null, gradedBy: "self" });
    setError(null);
    setResult({ index, feedback: null });
  };

  const rate = (n: number) => {
    setAttemptScore(result!.index, n);
    setSelfScore(n);
    onGraded?.(n);
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="card p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Your answer</div>
          <p className="whitespace-pre-wrap text-sm">{answer}</p>
        </div>
        {result.feedback ? (
          <FeedbackView f={result.feedback} />
        ) : (
          <div className="card space-y-4 p-4">
            {question.answer ? (
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                  Model answer / key points{question.answer_by_ai ? " (written by AI)" : ""}
                </div>
                <Markdown>{question.answer}</Markdown>
              </div>
            ) : (
              <p className="text-sm text-muted">No model answer for this question yet. Compare with the source link above.</p>
            )}
            <div>
              <div className="mb-2 text-sm font-medium">How did you do? Rate yourself</div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => rate(n)}
                    className={`h-9 w-9 rounded-md border text-sm tabular-nums ${selfScore === n ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface hover:bg-surface-2"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {selfScore != null && <p className="mt-2 text-xs text-muted">Saved in this browser. Low scores come back more often in practice.</p>}
            </div>
          </div>
        )}
        {!sessionId && (
          <button
            className="btn-ghost"
            onClick={() => {
              setResult(null);
              setAnswer("");
              setSelfScore(null);
            }}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={9}
        placeholder="Answer as you would out loud in the interview. For SQL/Python, write the code and explain your reasoning."
        className="input font-mono text-sm leading-relaxed"
      />
      {error && (
        <div className="space-y-2">
          <p className="text-sm text-bad">{error}</p>
          <button className="btn-ghost text-sm" onClick={selfGrade}>
            Self-grade instead
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending || !answer.trim()} onClick={submit}>
          {pending ? "Grading…" : mode === "ai" ? "Submit for AI feedback" : "Submit & compare"}
        </button>
        <button className="text-sm text-muted underline-offset-2 hover:text-fg hover:underline" onClick={() => setShowAnswer(true)}>
          Skip & show answer
        </button>
      </div>
      {showAnswer && (
        <div className="card p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Model answer</div>
          {question.answer ? <Markdown>{question.answer}</Markdown> : <p className="text-sm text-muted">No model answer yet for this question.</p>}
        </div>
      )}
    </div>
  );
}

export function FeedbackView({ f }: { f: Feedback }) {
  const tone = f.score >= 7 ? "text-good" : f.score >= 5 ? "text-warn" : "text-bad";
  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-start gap-4">
        <div className={`text-3xl font-semibold tabular-nums ${tone}`}>
          {f.score}
          <span className="text-base text-muted">/10</span>
        </div>
        <p className="text-sm">{f.verdict}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <List title="What worked" items={f.strengths} tone="text-good" />
        <List title="What to improve" items={f.gaps} tone="text-bad" />
      </div>
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Stronger answer</div>
        <Markdown>{f.improved_answer}</Markdown>
      </div>
      <div className="rounded-lg bg-accent-soft p-3 text-sm">
        <span className="font-medium text-accent">Likely follow-up: </span>
        {f.follow_up_question}
      </div>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div>
      <div className={`mb-1 text-xs font-medium uppercase tracking-wide ${tone}`}>{title}</div>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
