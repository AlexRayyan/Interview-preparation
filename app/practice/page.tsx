import { Suspense } from "react";
import { PracticeSetup } from "./setup";

export default function PracticePage() {
  return (
    <Suspense>
      <PracticeSetup />
    </Suspense>
  );
}
