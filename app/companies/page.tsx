import Link from "next/link";
import { QUESTIONS } from "@/lib/bank";
import { CATEGORIES, ROLES, type Category, type Role } from "@/lib/taxonomy";
import { PageHeader } from "@/components/ui";

export default function CompaniesPage() {
  const byCompany = new Map<string, { n: number; roles: Set<Role>; cats: Map<Category, number> }>();
  for (const q of QUESTIONS) {
    if (!q.company) continue;
    const e = byCompany.get(q.company) ?? { n: 0, roles: new Set<Role>(), cats: new Map<Category, number>() };
    e.n++;
    e.roles.add(q.role);
    e.cats.set(q.category, (e.cats.get(q.category) ?? 0) + 1);
    byCompany.set(q.company, e);
  }
  const companies = [...byCompany.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Questions candidates reported from specific companies' interviews. Pick a company to see what they ask."
      />
      {companies.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No company-tagged questions yet. They appear as interview experiences are collected and shared.{" "}
          <Link href="/submit/" className="text-accent underline">
            Share yours
          </Link>
          .
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map(([name, e]) => (
            <li key={name}>
              <Link href={`/questions/?company=${encodeURIComponent(name)}`} className="card block h-full p-4 transition hover:border-accent">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{name}</span>
                  <span className="text-sm tabular-nums text-muted">
                    {e.n} question{e.n === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{[...e.roles].map((r) => ROLES[r]).join(" · ")}</p>
                <p className="mt-2 text-xs text-muted">
                  {[...e.cats.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([c]) => CATEGORIES[c])
                    .join(", ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
