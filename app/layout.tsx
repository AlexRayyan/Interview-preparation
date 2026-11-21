import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "DataPrep: interview practice for data analysts & engineers",
  description: "Real interview questions collected from open sources, with AI mock interviews.",
};

const NAV = [
  { href: "/questions", label: "Questions" },
  { href: "/practice", label: "Practice" },
  { href: "/companies", label: "Companies" },
  { href: "/submit", label: "Share an interview" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm text-accent-fg">D</span>
              DataPrep
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-fg">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted">
          Questions come from openly licensed repositories, public APIs (Hacker News, Stack Exchange, Reddit) and community
          submissions. Each question links to its source. Progress is saved only in your browser.{" "}
          <a href={REPO_URL} className="underline hover:text-fg">
            Source on GitHub
          </a>
        </footer>
      </body>
    </html>
  );
}
