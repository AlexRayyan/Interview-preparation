"use client";

import { useEffect, useState } from "react";
import { clearProgress, getApiKey, getAttempts, setApiKey } from "@/lib/progress";

export function SettingsForm() {
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    setSaved(getApiKey());
    setAnswers(getAttempts().length);
  }, []);

  return (
    <div className="space-y-6">
      <section className="card space-y-3 p-6">
        <h2 className="font-semibold">AI interviewer (optional)</h2>
        <p className="text-sm text-muted">
          This site has no server, so AI grading uses your own Anthropic API key. The key is stored only in this browser and sent only to
          api.anthropic.com. Each graded answer costs a few cents. Get a key at{" "}
          <a className="text-accent underline" href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
            console.anthropic.com
          </a>
          . Don&apos;t save a key on a shared computer.
        </p>
        {saved ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              Key saved: <code className="rounded bg-surface-2 px-1">{saved.slice(0, 10)}…{saved.slice(-4)}</code>
            </span>
            <button
              className="btn-ghost"
              onClick={() => {
                setApiKey(null);
                setSaved(null);
                setMsg("Key removed.");
              }}
            >
              Remove key
            </button>
          </div>
        ) : (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const k = draft.trim();
              if (!k.startsWith("sk-ant-")) return setMsg("That doesn't look like an Anthropic API key (it should start with sk-ant-).");
              setApiKey(k);
              setSaved(k);
              setDraft("");
              setMsg("Saved. Mock interviews will now offer AI grading.");
            }}
          >
            <input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="sk-ant-…" className="input max-w-sm flex-1" autoComplete="off" />
            <button className="btn">Save key</button>
          </form>
        )}
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-semibold">Your progress</h2>
        <p className="text-sm text-muted">{answers} answers saved in this browser. Clearing your browser data also clears them.</p>
        <button
          className="btn-ghost"
          onClick={() => {
            if (!confirm("Delete all practice history saved in this browser?")) return;
            clearProgress();
            setAnswers(0);
            setMsg("Progress cleared.");
          }}
        >
          Clear practice history
        </button>
      </section>
    </div>
  );
}
