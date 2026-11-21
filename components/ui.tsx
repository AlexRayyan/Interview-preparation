import Link from "next/link";
import { CATEGORIES, DIFFICULTIES, ROLES, SOURCE_TYPES, type Category, type Difficulty, type Role, type SourceType } from "@/lib/taxonomy";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "good" | "warn" | "bad" }) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    accent: "bg-accent-soft text-accent",
    good: "bg-good/10 text-good",
    warn: "bg-warn/10 text-warn",
    bad: "bg-bad/10 text-bad",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function DifficultyBadge({ d }: { d: Difficulty }) {
  return <Badge tone={d === "easy" ? "good" : d === "medium" ? "warn" : "bad"}>{DIFFICULTIES[d]}</Badge>;
}

export function QuestionMeta({ role, category, difficulty, company, source }: { role: Role; category: Category; difficulty: Difficulty; company?: string | null; source?: SourceType }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <DifficultyBadge d={difficulty} />
      <Badge tone="accent">{CATEGORIES[category]}</Badge>
      <Badge>{ROLES[role]}</Badge>
      {company && <Badge>{company}</Badge>}
      {source && <Badge>{SOURCE_TYPES[source]}</Badge>}
    </div>
  );
}

export function ScorePill({ score }: { score: number | null }) {
  if (score == null) return <Badge>Not scored</Badge>;
  return <Badge tone={score >= 7 ? "good" : score >= 5 ? "warn" : "bad"}>{score}/10</Badge>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AiNotice() {
  return (
    <div className="card border-warn/40 bg-warn/5 p-4 text-sm">
      <strong className="font-medium">AI grading is off.</strong>{" "}
      <span className="text-muted">
        You&apos;ll compare against model answers and rate yourself. To get AI feedback on every answer, add your own Anthropic API key in{" "}
        <Link href="/settings" className="text-accent underline">
          Settings
        </Link>
        .
      </span>
    </div>
  );
}

export function LinkButton({ href, children, ghost }: { href: string; children: React.ReactNode; ghost?: boolean }) {
  return (
    <Link href={href} className={ghost ? "btn-ghost" : "btn"}>
      {children}
    </Link>
  );
}

export function SourceLine({ url, title, attribution }: { url: string | null; title: string | null; attribution: string | null }) {
  if (!url && !attribution) return null;
  const link = url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-fg">
      {title ?? url}
    </a>
  ) : title;
  return (
    <p className="mt-3 text-xs text-muted">
      Source: {link}
      {link && attribution ? " · " : ""}
      {attribution}
    </p>
  );
}
