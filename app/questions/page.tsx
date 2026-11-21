import { Suspense } from "react";
import { QuestionBrowser } from "./browser";

export default function QuestionsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <QuestionBrowser />
    </Suspense>
  );
}
