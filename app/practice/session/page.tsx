import { Suspense } from "react";
import { SessionRunner } from "./runner";

export default function SessionPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <SessionRunner />
    </Suspense>
  );
}
