import crypto from "node:crypto";
import type { Category, Difficulty, Role } from "./taxonomy";

/** Normalized hash used to de-duplicate questions coming from different sources. */
export function questionHash(text: string): string {
  const norm = text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(the|a|an|you|your|please|can|could|would|how|do|what|is|are)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return crypto.createHash("sha1").update(norm).digest("hex");
}

const CATEGORY_KEYWORDS: Record<Category, RegExp> = {
  sql: /\b(sql|select|join|joins|duplicates?|dedupe?|rows|records|tables?|window function|cte|group by|having|rank\(|row_number|dense_rank|subquer|index(es|ing)?|query|queries|primary key|foreign key|union|null)\b/i,
  python: /\b(python|pandas|numpy|dataframe|list comprehension|dictionary|generator|decorator|pyspark udf|lambda|iterable)\b/i,
  statistics: /\b(statistic|p-value|p value|hypothesis|a\/b|ab test|experiment|confidence interval|regression|variance|distribution|bayes|sample size|significan|correlation|outlier|mean|median)\b/i,
  data_modeling: /\b(data model|schema design|star schema|snowflake schema|fact table|dimension table|scd|slowly changing|normaliz|denormaliz|grain|erd|kimball|data vault)\b/i,
  pipelines: /\b(etl|elt|pipeline|airflow|dag|orchestrat|idempoten|backfill|cdc|change data capture|dbt|ingest|data quality|late arriving|incremental load|batch job)\b/i,
  big_data: /\b(spark|hadoop|hive|kafka|flink|partition(ing)?|shuffle|skew|mapreduce|parquet|executor|broadcast join|streaming|rdd)\b/i,
  warehousing: /\b(warehouse|snowflake|bigquery|redshift|databricks|lakehouse|data lake|delta lake|iceberg|columnar|aws|gcp|azure|s3|glue)\b/i,
  system_design: /\b(design (a|an|the) (system|platform|pipeline)|architecture|scal(e|able|ability)|real-time|throughput|latency|high level design)\b/i,
  bi_visualization: /\b(dashboard|tableau|power bi|looker|visuali[sz]|chart|excel|pivot|vlookup|xlookup|kpi report|dax)\b/i,
  business_case: /\b(metric|kpi|churn|retention|conversion|funnel|revenue|dau|mau|engagement|north star|business case|product sense|root cause|dropped by|decline in)\b/i,
  behavioral: /\b(tell me about a time|describe a time|conflict|stakeholder|weakness|strength|why (do you|this company)|disagree|failure|mistake|proud|challenge you faced|walk me through your resume)\b/i,
};

const DE_HINTS = /\b(etl|elt|pipeline|airflow|spark|kafka|data engineer|warehouse|dbt|orchestrat|partition|schema design|lakehouse|streaming|idempoten|cdc|hadoop|flink|scd)\b/i;
const DA_HINTS = /\b(dashboard|tableau|power bi|looker|excel|data analyst|a\/b|metric|kpi|churn|funnel|stakeholder|business|visuali[sz]|statistic|pivot)\b/i;

export function classifyCategory(text: string, hint?: string | null): Category {
  if (hint && hint in CATEGORY_KEYWORDS) return hint as Category;
  let best: Category = "sql";
  let bestScore = 0;
  for (const [cat, re] of Object.entries(CATEGORY_KEYWORDS) as [Category, RegExp][]) {
    const matches = text.match(new RegExp(re.source, "gi"));
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return bestScore === 0 ? "behavioral" : best;
}

export function classifyRole(text: string, category: Category, hint?: string | null): Role {
  if (hint === "data_analyst" || hint === "data_engineer" || hint === "both") return hint;
  const de = DE_HINTS.test(text);
  const da = DA_HINTS.test(text);
  if (de && !da) return "data_engineer";
  if (da && !de) return "data_analyst";
  if (["pipelines", "big_data", "warehousing", "system_design", "data_modeling"].includes(category)) return "data_engineer";
  if (["bi_visualization", "business_case", "statistics"].includes(category)) return "data_analyst";
  return "both";
}

export function classifyDifficulty(text: string): Difficulty {
  if (/\b(design|architect|scale|optimi[sz]e|trade-?off|skew|exactly-once|gaps and islands|recursive|petabyte|billions?)\b/i.test(text)) return "hard";
  if (/\b(window|rank|cte|partition|incremental|scd|experiment|cohort|retention|rolling|dedup|idempoten)\b/i.test(text)) return "medium";
  if (text.length > 220) return "medium";
  return "easy";
}

const QUESTION_START =
  /^(what|why|how|when|which|who|where|explain|describe|design|write|find|given|calculate|compute|compare|walk|tell|implement|build|suppose|imagine|if you|list|define|can you|could you|would you|do you|is it|are there|difference between|return|identify|create|model)\b/i;

const IMPERATIVE = /^(design|write|explain|implement|describe|walk me through|tell me about|model|calculate|compute)\b/i;

const META_QUESTION =
  /\b(any (advice|tips|suggestions)|what should i|should i|am i|anyone else|has anyone|thoughts\?|is it worth|how do i prepare|what do you think|wish me luck|any ideas|help me|what are my chances|does anyone|did anyone|is this normal|resources)\b/i;

const DOMAIN_TERMS = new RegExp(
  Object.values(CATEGORY_KEYWORDS)
    .map((r) => r.source)
    .join("|"),
  "i",
);

/**
 * Heuristic extraction of interview questions from free text (Reddit/HN/Stack Exchange posts,
 * user submissions). Used when no Claude API key is configured. Output goes to the review queue.
 */
export function heuristicExtract(body: string, opts: { requireDomainTerms?: boolean } = {}): string[] {
  const requireDomain = opts.requireDomainTerms ?? true;
  const text = body
    .replace(/\r/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");

  const pieces: string[] = [];
  for (const line of text.split("\n")) {
    const cleaned = line.replace(/^\s*([-*•>]|\d+[.)])\s+/, "").trim();
    if (!cleaned) continue;
    const listItem = /^\s*([-*•]|\d+[.)])\s+/.test(line);
    // split long lines into sentences
    const sentences = cleaned.match(/[^.?!]+[.?!]?/g) ?? [cleaned];
    for (const s of sentences) {
      const t = s
        .trim()
        .replace(/^["“]|["”]$/g, "")
        .replace(/^(round \d+|[A-Z][A-Za-z /()]{0,24}|q\d*)\s*:\s*/i, "") // "Round 2:", "Behavioral:", "Q3:"
        .trim();
      if (t.length < 20 || t.length > 320) continue;
      const looksLikeQuestion =
        t.endsWith("?") ||
        (listItem && QUESTION_START.test(t)) ||
        IMPERATIVE.test(t) ||
        /^(they asked|asked me|i was asked|question:)/i.test(t);
      if (!looksLikeQuestion) continue;
      if (META_QUESTION.test(t)) continue;
      if (requireDomain && !DOMAIN_TERMS.test(t)) continue;
      const q = t.replace(/^(they asked( me)?|asked me|i was asked|question:)\s*(to\s+)?/i, "").trim();
      pieces.push(q.charAt(0).toUpperCase() + q.slice(1));
    }
  }
  return Array.from(new Set(pieces)).slice(0, 25);
}

const COMPANIES = [
  "Amazon", "Google", "Meta", "Facebook", "Microsoft", "Apple", "Netflix", "Uber", "Lyft", "Airbnb",
  "Stripe", "Spotify", "LinkedIn", "Twitter", "Salesforce", "Oracle", "IBM", "Deloitte", "Accenture",
  "Walmart", "Target", "Capital One", "JPMorgan", "Goldman Sachs", "Shopify", "Snowflake", "Databricks",
  "DoorDash", "Instacart", "Grab", "Shopee", "Atlassian", "Adobe", "Intuit", "PayPal", "TikTok", "ByteDance",
];

export function guessCompany(text: string): string | null {
  for (const c of COMPANIES) {
    if (new RegExp(`\\b${c}\\b`, "i").test(text)) return c === "Facebook" ? "Meta" : c;
  }
  return null;
}
