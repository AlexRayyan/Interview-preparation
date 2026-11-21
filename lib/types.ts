import type { Category, Difficulty, Role, SourceType } from "./taxonomy";

export interface Question {
  id: number;
  text: string;
  hash: string;
  role: Role;
  category: Category;
  difficulty: Difficulty;
  company: string | null;
  round: string | null;
  answer: string | null;
  answer_by_ai: boolean;
  source_type: SourceType;
  source_url: string | null;
  source_title: string | null;
  attribution: string | null;
  extracted_by: "ai" | "heuristic" | "manual";
  added_at: string; // YYYY-MM-DD
}

export interface QuestionBank {
  updated_at: string;
  questions: Question[];
}
