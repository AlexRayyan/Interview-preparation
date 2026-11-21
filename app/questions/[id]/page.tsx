import Link from "next/link";
import { notFound } from "next/navigation";
import { QUESTIONS, getQuestion } from "@/lib/bank";
import { AnswerPanelAuto } from "@/components/AnswerPanelAuto";
import { PastAttempts } from "@/components/PastAttempts";
import { QuestionMeta, SourceLine } from "@/components/ui";

export const dynamicParams = false;

export function generateStaticParams() {
  return QUESTIONS.map((q) => ({ id: String(q.id) }));
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = getQuestion(Number(id));
  if (!q) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/questions/" className="text-sm text-muted hover:text-fg">
        ← All questions
      </Link>
      <div className="card p-6">
        <QuestionMeta role={q.role} category={q.category} difficulty={q.difficulty} company={q.company} source={q.source_type} />
        <h1 className="mt-4 text-xl font-semibold leading-snug">{q.text}</h1>
        {q.round && <p className="mt-2 text-sm text-muted">Round: {q.round}</p>}
        <SourceLine url={q.source_url} title={q.source_title} attribution={q.attribution} />
      </div>
      <section>
        <h2 className="mb-3 font-semibold">Your answer</h2>
        <AnswerPanelAuto question={q} />
      </section>
      <PastAttempts questionId={q.id} />
    </div>
  );
}
