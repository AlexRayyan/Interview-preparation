# DataPrep: interview practice for Data Analysts & Data Engineers

A free website for practicing real interview questions, collected from open sources and updated weekly. It runs entirely on GitHub: **GitHub Pages** hosts the site and **GitHub Actions** builds it and keeps the question bank fresh.

**Live site:** https://alexrayyan.github.io/Interview-preparation/ (after the one-time setup below)

See the [design document](docs/DESIGN.md) for a short overview of how everything fits together.

## Features

- **Question bank**: search and filter by role, topic, difficulty, source and company. Every question links to its source with attribution.
- **Mock interviews**: one question at a time, balanced across topics; questions you've never tried or scored low on come first.
- **Grading**: compare against a model answer and rate yourself, or connect a free AI provider in Settings (OpenRouter free models, Groq or Google Gemini) for an AI interviewer that scores 1–10 with strengths, gaps, a stronger answer and the likely follow-up.
- **Progress tracking**: weakest topics and recent sessions, saved in your browser.
- **Community submissions**: anyone can share an interview through a GitHub issue form; approved submissions are added automatically.

## How it works

```
 GitHub repos ──┐
 Hacker News ───┼─► update-questions.yml (weekly / manual) ─► data/questions.json ─► pull request ─► review & merge ─┐
 Stack Exchange ┤      AI extracts questions + writes model answers                                                │
 Reddit ────────┘                                                                                                   ▼
 "Share your interview" issue ─► add label `approved` ─► submission.yml ─► commit to main ─────────► deploy.yml ─► GitHub Pages
 Actions ▸ "Generate questions with AI" ─► generate.yml ─► pull request
```

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy.yml` | push to `main`, manual | Typechecks, builds the static site, publishes to Pages (PRs are build-checked only) |
| `update-questions.yml` | Mondays 03:17 UTC, manual | Collects from all sources, extracts and classifies questions, writes missing model answers, opens a PR |
| `submission.yml` | `approved` label on an issue | Extracts questions from a "Share your interview" issue, commits them, comments, closes the issue, redeploys |
| `ai-check.yml` | manual | Sends one test request to the configured AI provider and reports whether it works |
| `generate.yml` | manual | AI writes new questions for a chosen topic / difficulty / company style and opens a PR |

The question bank is a readable JSON file (`data/questions.json`), so every change is a normal diff you can review.

## One-time setup (repository owner)

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Actions → General → Workflow permissions:** choose *Read and write permissions* and tick *Allow GitHub Actions to create and approve pull requests*.
3. **Free AI (recommended):** create a free key at one of these and add it under **Settings → Secrets and variables → Actions → New repository secret**:
   - `GROQ_API_KEY` from https://console.groq.com/keys (open-source Llama models, no credit card), **or**
   - `GEMINI_API_KEY` from https://aistudio.google.com/apikey, **or**
   - `OPENROUTER_API_KEY` from https://openrouter.ai/keys (free `:free` models).

   Then run **Actions → Check AI connection** to confirm it works. Optional: variable `AI_MODEL` picks a different model; secret `AI_API_KEY` plus variables `AI_BASE_URL` / `AI_MODEL` use any other OpenAI-compatible provider (e.g. a self-hosted Ollama). With no key, the pipeline tries GitHub Models through the built-in token, and falls back to keyword heuristics if that's unavailable.

   Free tiers have daily limits, so the pipeline sends several posts per request, spaces calls out, and leaves anything over the limit for the next run.

   Also optional: secrets `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` enable the Reddit source (free "script" app at reddit.com/prefs/apps); `STACKEXCHANGE_KEY` raises the Stack Exchange quota.
4. **Issues → Labels:** create `approved` (`interview-submission` and `question-bank` are created automatically when first used, or create them too).
5. **Actions → Deploy site → Run workflow** for the first deploy, then **Update question bank → Run workflow** to collect from every source right away.

## Data sources

| Source | How | Notes |
|---|---|---|
| GitHub | Raw READMEs of repos listed in `lib/ingest/github.ts` | Only openly licensed repos (currently CC BY-SA 4.0 and MIT) |
| Hacker News | Official Algolia search API | No key needed |
| Stack Exchange | API v2.3 | CC BY-SA; author + link kept |
| Reddit | Data API, app-only OAuth | Needs credentials; usernames not stored. Commercial use needs Reddit's agreement |
| Community | GitHub issue form | Moderated with the `approved` label |

LinkedIn, Glassdoor and LeetCode Discuss are **not** scraped: their terms prohibit it.

## Developing locally (optional)

```bash
npm install
npm run dev                                   # http://localhost:3000
npm run update-bank -- --sources github       # refresh data/questions.json
AI_API_KEY=<github token or provider key> npm run generate -- --role data_engineer --category pipelines --difficulty medium --count 5
```

Stack: Next.js 15 (static export), React 19, Tailwind 4, TypeScript, any OpenAI-compatible AI API (Groq, Gemini, OpenRouter, GitHub Models, Ollama…).

## Privacy

The site has no backend. Practice history and an optional AI provider key are stored in your browser's local storage and are never sent anywhere except, for AI grading, directly to the provider you chose.
