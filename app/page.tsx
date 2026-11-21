import Link from "next/link";
import { BANK, QUESTIONS, countBy } from "@/lib/bank";
import { CATEGORIES, ROLES, SOURCE_TYPES } from "@/lib/taxonomy";
import { LinkButton } from "@/components/ui";
import { MyProgress } from "@/components/MyProgress";

export default function Home() {
  const byCategory = countBy("category");
  const bySource = countBy("source_type");
  const roleCount = (r: string) => QUESTIONS.filter((q) => q.role === r || q.role === "both").length;
  const maxCat = Math.max(1, ...byCategory.map((c) => c.n));

  return (
    <div className="space-y-8">
      <section className="card p-6 sm:p-8">
        <p className="text-sm font-medium text-accent">Data Analyst · Data Engineer</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Practice with the questions real interviewers ask.</h1>
        <p className="mt-3 max-w-2xl text-muted">
          {QUESTIONS.length.toLocaleString()} questions collected from open-source question banks, public interview discussions and community write-ups,
          updated weekly. Answer them in a mock interview and track which topics need work.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href="/practice">Start a mock interview</LinkButton>
          <LinkButton href="/questions" ghost>
            Browse questions
          </LinkButton>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Questions" value={QUESTIONS.length} hint={BANK.updated_at ? `updated ${BANK.updated_at.slice(0, 10)}` : undefined} />
        <Stat label={`For ${ROLES.data_analyst}s`} value={roleCount("data_analyst")} />
        <Stat label={`For ${ROLES.data_engineer}s`} value={roleCount("data_engineer")} />
      </section>

      <MyProgress />

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold">Topics</h2>
          <ul className="mt-4 space-y-2.5">
            {byCategory.map((c) => (
              <li key={c.key}>
                <Link href={`/questions/?category=${c.key}`} className="group grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_3rem]">
                  <span className="truncate group-hover:text-accent">{CATEGORIES[c.key]}</span>
                  <span className="h-2 rounded-full bg-surface-2">
                    <span className="block h-2 rounded-full bg-accent" style={{ width: `${(c.n / maxCat) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-muted">{c.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Sources</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {bySource.map((x) => (
              <li key={x.key} className="flex justify-between">
                <Link href={`/questions/?source=${x.key}`} className="hover:text-accent">
                  {SOURCE_TYPES[x.key]}
                </Link>
                <span className="tabular-nums text-muted">{x.n}</span>
              </li>
            ))}
          </ul>
          <Link href="/submit" className="mt-4 block text-sm text-accent">
            Had an interview recently? Share your questions →
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
