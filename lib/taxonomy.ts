export const ROLES = {
  data_analyst: "Data Analyst",
  data_engineer: "Data Engineer",
  both: "Both roles",
} as const;
export type Role = keyof typeof ROLES;

export const CATEGORIES = {
  sql: "SQL",
  python: "Python / Pandas",
  statistics: "Statistics & A/B testing",
  data_modeling: "Data modeling",
  pipelines: "ETL & pipelines",
  big_data: "Spark & big data",
  warehousing: "Cloud & warehousing",
  system_design: "Data system design",
  bi_visualization: "BI & visualization",
  business_case: "Product & business case",
  behavioral: "Behavioral",
} as const;
export type Category = keyof typeof CATEGORIES;

export const DIFFICULTIES = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
} as const;
export type Difficulty = keyof typeof DIFFICULTIES;

export const SOURCE_TYPES = {
  seed: "Curated",
  github: "GitHub (open license)",
  reddit: "Reddit",
  hackernews: "Hacker News",
  stackexchange: "Stack Exchange",
  user: "Community submission",
  ai: "AI-generated",
} as const;
export type SourceType = keyof typeof SOURCE_TYPES;

export const ROLE_KEYS = Object.keys(ROLES) as Role[];
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES) as Difficulty[];
export const SOURCE_KEYS = Object.keys(SOURCE_TYPES) as SourceType[];

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && v in ROLES;
}
export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && v in CATEGORIES;
}
export function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === "string" && v in DIFFICULTIES;
}
export function isSourceType(v: unknown): v is SourceType {
  return typeof v === "string" && v in SOURCE_TYPES;
}
