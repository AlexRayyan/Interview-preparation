"use client";

import { useEffect, useState } from "react";
import { getApiKey } from "@/lib/progress";
import type { Question } from "@/lib/types";
import { AnswerPanel } from "./AnswerPanel";
import { AiNotice } from "./ui";

/** Answer box for a single question: AI-graded when the visitor has saved an API key. */
export function AnswerPanelAuto({ question }: { question: Question }) {
  const [mode, setMode] = useState<"ai" | "self" | null>(null);
  useEffect(() => setMode(getApiKey() ? "ai" : "self"), []);
  if (!mode) return null;
  return (
    <div className="space-y-3">
      {mode === "self" && <AiNotice />}
      <AnswerPanel question={question} sessionId={null} mode={mode} />
    </div>
  );
}
