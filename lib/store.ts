// Node-only: reads and writes the committed JSON data files used by the GitHub Actions pipeline.
import fs from "node:fs";
import path from "node:path";
import { questionHash } from "./classify";
import type { Question, QuestionBank } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const BANK_FILE = path.join(DATA_DIR, "questions.json");
const SEEN_FILE = path.join(DATA_DIR, "seen-posts.json");

export type NewQuestion = Omit<Question, "id" | "hash" | "added_at" | "company" | "round" | "answer" | "answer_by_ai" | "source_url" | "source_title" | "attribution" | "extracted_by"> &
  Partial<Pick<Question, "company" | "round" | "answer" | "answer_by_ai" | "source_url" | "source_title" | "attribution" | "extracted_by">>;

export class Store {
  bank: QuestionBank;
  private hashes: Set<string>;
  private seen: Set<string>;
  private nextId: number;
  added: Question[] = [];

  constructor() {
    this.bank = fs.existsSync(BANK_FILE)
      ? (JSON.parse(fs.readFileSync(BANK_FILE, "utf8")) as QuestionBank)
      : { updated_at: "", questions: [] };
    this.hashes = new Set(this.bank.questions.map((q) => q.hash));
    this.seen = new Set(fs.existsSync(SEEN_FILE) ? (JSON.parse(fs.readFileSync(SEEN_FILE, "utf8")) as string[]) : []);
    this.nextId = Math.max(0, ...this.bank.questions.map((q) => q.id)) + 1;
  }

  /** Adds a question unless an equivalent one already exists. Returns it, or null for duplicates. */
  insert(q: NewQuestion): Question | null {
    const text = q.text.trim().replace(/\s+/g, " ");
    if (text.length < 10) return null;
    const hash = questionHash(text);
    if (this.hashes.has(hash)) return null;
    const question: Question = {
      id: this.nextId++,
      text,
      hash,
      role: q.role,
      category: q.category,
      difficulty: q.difficulty,
      company: q.company ?? null,
      round: q.round ?? null,
      answer: q.answer ?? null,
      answer_by_ai: q.answer_by_ai ?? false,
      source_type: q.source_type,
      source_url: q.source_url ?? null,
      source_title: q.source_title ?? null,
      attribution: q.attribution ?? null,
      extracted_by: q.extracted_by ?? "manual",
      added_at: new Date().toISOString().slice(0, 10),
    };
    this.hashes.add(hash);
    this.bank.questions.push(question);
    this.added.push(question);
    return question;
  }

  hasSeen(key: string) {
    return this.seen.has(key);
  }
  markSeen(key: string) {
    this.seen.add(key);
  }

  save() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this.bank.updated_at = new Date().toISOString();
    fs.writeFileSync(BANK_FILE, `${JSON.stringify(this.bank, null, 2)}\n`);
    fs.writeFileSync(SEEN_FILE, `${JSON.stringify([...this.seen].sort(), null, 2)}\n`);
  }
}
