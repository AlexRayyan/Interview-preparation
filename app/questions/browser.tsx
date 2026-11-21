"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { filterQuestions, type Filters } from "@/lib/bank";
import { CATEGORIES, DIFFICULTIES, ROLES, SOURCE_TYPES, isCategory, isDifficulty, isRole, isSourceType } from "@/lib/taxonomy";
import { PageHeader, QuestionMeta } from "@/components/ui";

const PAGE_SIZE = 25;

export function QuestionBrowser() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const get = (k: string) => sp.get(k) ?? "";
  const filters: Filters = {
    q: get("q"),
    role: isRole(get("role")) ? (get("role") as Filters["role"]) : "",
    category: isCategory(get("category")) ? (get("category") as Filters["category"]) : "",
    difficulty: isDifficulty(get("difficulty")) ? (get("difficulty") as Filters["difficulty"]) : "",
    source: isSourceType(get("source")) ? (get("source") as Filters["source"]) : "",
    company: get("company"),
  };
  const page = Math.max(1, Number(get("page")) || 1);
  const rows = useMemo(() => filterQuestions(filters), [sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const update = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v === "" || v === 1 ? p.delete(k) : p.set(k, String(v)));
    if (!("page" in patch)) p.delete("page");
    router.replace(`${pathname}?${p.toString()}`, { scroll: "page" in patch });
  };

  return (
    <div>
      <PageHeader title="Question bank" subtitle={`${rows.length.toLocaleString()} questions match`} />
      <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input
          defaultValue={filters.q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Search questions or companies…"
          className="input lg:col-span-2"
        />
        <Select value={filters.role} options={ROLES} all="Any role" onChange={(v) => update({ role: v })} />
        <Select value={filters.category} options={CATEGORIES} all="Any topic" onChange={(v) => update({ category: v })} />
        <Select value={filters.difficulty} options={DIFFICULTIES} all="Any difficulty" onChange={(v) => update({ difficulty: v })} />
        <Select value={filters.source} options={SOURCE_TYPES} all="Any source" onChange={(v) => update({ source: v })} />
        {(filters.company || sp.toString()) && (
          <div className="flex items-center gap-3 text-sm sm:col-span-2 lg:col-span-6">
            {filters.company && <span className="text-muted">Company: {filters.company}</span>}
            <button className="text-accent" onClick={() => router.replace(pathname)}>
              Clear filters
            </button>
          </div>
        )}
      </div>

      <ul className="space-y-3">
        {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((q) => (
          <li key={q.id}>
            <Link href={`/questions/${q.id}/`} className="card block p-4 transition hover:border-accent">
              <p className="font-medium leading-snug">{q.text}</p>
              <div className="mt-2.5">
                <QuestionMeta role={q.role} category={q.category} difficulty={q.difficulty} company={q.company} source={q.source_type} />
              </div>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="card p-8 text-center text-muted">No questions match these filters.</li>}
      </ul>

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
            ← Previous
          </button>
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          <button className="btn-ghost" disabled={page >= pages} onClick={() => update({ page: page + 1 })}>
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}

function Select({ value, options, all, onChange }: { value?: string; options: Record<string, string>; all: string; onChange: (v: string) => void }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="input">
      <option value="">{all}</option>
      {Object.entries(options).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
}
