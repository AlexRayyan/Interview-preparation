"use client";
// Per-visitor progress, stored in the browser (the site is static, so there is no shared database).
import type { Feedback } from "./ai";
import type { Role } from "./taxonomy";

export interface Attempt {
  questionId: number;
  sessionId: string | null;
  answer: string;
  score: number | null;
  feedback: Feedback | null;
  gradedBy: "ai" | "self";
  at: string;
}

export interface Session {
  id: string;
  role: Role;
  mode: "ai" | "self";
  questionIds: number[];
  createdAt: string;
  completedAt: string | null;
}

const KEY_ATTEMPTS = "dataprep.attempts.v1";
const KEY_SESSIONS = "dataprep.sessions.v1";
const KEY_API = "dataprep.anthropicKey";

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: progress just isn't saved */
  }
}

export const getAttempts = () => read<Attempt[]>(KEY_ATTEMPTS, []);
export const getSessions = () => read<Session[]>(KEY_SESSIONS, []);

export function addAttempt(a: Omit<Attempt, "at">): number {
  const all = getAttempts();
  all.push({ ...a, at: new Date().toISOString() });
  write(KEY_ATTEMPTS, all.slice(-2000));
  return all.length - 1;
}

export function setAttemptScore(index: number, score: number) {
  const all = getAttempts();
  if (all[index]) {
    all[index].score = score;
    write(KEY_ATTEMPTS, all);
  }
}

export function bestScores(): Map<number, number> {
  const m = new Map<number, number>();
  for (const a of getAttempts()) if (a.score != null) m.set(a.questionId, Math.max(a.score, m.get(a.questionId) ?? 0));
  return m;
}
/** Question ids attempted at least once (scored or not). */
export function attemptedIds(): Set<number> {
  return new Set(getAttempts().map((a) => a.questionId));
}

export function createSession(s: Omit<Session, "id" | "createdAt" | "completedAt">): Session {
  const session: Session = { ...s, id: Date.now().toString(36), createdAt: new Date().toISOString(), completedAt: null };
  write(KEY_SESSIONS, [...getSessions(), session].slice(-100));
  return session;
}

export function getSession(id: string): Session | undefined {
  return getSessions().find((s) => s.id === id);
}

export function completeSession(id: string) {
  write(
    KEY_SESSIONS,
    getSessions().map((s) => (s.id === id && !s.completedAt ? { ...s, completedAt: new Date().toISOString() } : s)),
  );
}

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(KEY_API);
  } catch {
    return null;
  }
}
export function setApiKey(key: string | null) {
  try {
    if (key) localStorage.setItem(KEY_API, key);
    else localStorage.removeItem(KEY_API);
  } catch {
    /* ignore */
  }
}

export function clearProgress() {
  write(KEY_ATTEMPTS, []);
  write(KEY_SESSIONS, []);
}
