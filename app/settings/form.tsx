"use client";

import { useEffect, useState } from "react";
import { AI_PRESETS, clearProgress, getAiSettings, getAttempts, setAiSettings, type AiSettings } from "@/lib/progress";

export function SettingsForm() {
  const [saved, setSaved] = useState<AiSettings | null>(null);
  const [provider, setProvider] = useState<string>(AI_PRESETS[0].id);
  const [baseUrl, setBaseUrl] = useState<string>(AI_PRESETS[0].baseUrl);
  const [model, setModel] = useState<string>(AI_PRESETS[0].model);
  const [apiKey, setApiKey] = useState("");
  const [answers, setAnswers] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setSaved(getAiSettings());
    setAnswers(getAttempts().length);
  }, []);

  const preset = AI_PRESETS.find((p) => p.id === provider);
  const choose = (id: string) => {
    setProvider(id);
    const p = AI_PRESETS.find((x) => x.id === id);
    if (p) {
      setBaseUrl(p.baseUrl);
      setModel(p.model);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">AI interviewer (optional, free)</h2>
        <p className="text-sm text-muted">
          This site has no server, so AI grading runs with your own key from a free AI provider. The key is stored only in this browser and sent only to
          the provider you choose. Free tiers have daily limits. Don&apos;t save a key on a shared computer.
        </p>

        {saved ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              Connected: <strong>{AI_PRESETS.find((p) => p.id === saved.provider)?.name ?? new URL(saved.baseUrl).host}</strong> ·{" "}
              <code className="rounded bg-surface-2 px-1">{saved.model}</code>
            </span>
            <button
              className="btn-ghost"
              onClick={() => {
                setAiSettings(null);
                setSaved(null);
                setMsg("Disconnected and key removed.");
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!apiKey.trim()) return setMsg("Paste your API key first.");
              try {
                new URL(baseUrl);
              } catch {
                return setMsg("The API URL isn't valid.");
              }
              const s = { provider, baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim() };
              setAiSettings(s);
              setSaved(s);
              setApiKey("");
              setMsg("Saved. Mock interviews will now offer AI grading.");
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Provider</span>
                <select value={provider} onChange={(e) => choose(e.target.value)} className="input">
                  {AI_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="custom">Other (OpenAI-compatible)</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Model</span>
                <input value={model} onChange={(e) => setModel(e.target.value)} className="input font-mono text-xs" />
              </label>
              {provider === "custom" && (
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">API base URL</span>
                  <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…/v1" className="input font-mono text-xs" />
                </label>
              )}
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block font-medium">API key</span>
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="input" autoComplete="off" />
                {preset && (
                  <span className="mt-1 block text-xs text-muted">
                    Get a free key at{" "}
                    <a className="text-accent underline" href={preset.keyUrl} target="_blank" rel="noopener noreferrer">
                      {new URL(preset.keyUrl).host}
                    </a>
                    .
                  </span>
                )}
              </label>
            </div>
            <button className="btn">Save</button>
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
