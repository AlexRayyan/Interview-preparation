import type { Category, Difficulty, Role } from "../lib/taxonomy";

export interface SeedQuestion {
  text: string;
  role: Role;
  category: Category;
  difficulty: Difficulty;
  answer: string;
  round?: string;
}

/** Original starter set written for this project, so the app is useful before any scraping runs. */
export const SEED_QUESTIONS: SeedQuestion[] = [
  // ------------------------------------------------------------------ SQL
  {
    text: "What is the difference between WHERE and HAVING?",
    role: "both", category: "sql", difficulty: "easy",
    answer: "- `WHERE` filters **rows before** grouping/aggregation; it can't reference aggregates.\n- `HAVING` filters **groups after** `GROUP BY`, so it can use aggregates like `COUNT(*) > 5`.\n- Filter in `WHERE` whenever possible: fewer rows reach the aggregation, so it's cheaper.",
  },
  {
    text: "Explain the difference between INNER, LEFT, RIGHT and FULL OUTER joins. When would a LEFT JOIN return more rows than the left table has?",
    role: "both", category: "sql", difficulty: "easy",
    answer: "- INNER: only matching rows. LEFT: all left rows + matches (NULLs when none). RIGHT: mirror of LEFT. FULL: all rows from both sides.\n- A LEFT JOIN returns **more** rows than the left table when the join key is **not unique on the right** side: each left row is repeated once per match (fan-out). Check uniqueness or pre-aggregate the right table first.",
  },
  {
    text: "Given employees(id, name, department_id, salary), write a query to find the second-highest salary in each department. How do you handle ties?",
    role: "both", category: "sql", difficulty: "medium",
    answer: "```sql\nSELECT department_id, salary\nFROM (\n  SELECT department_id, salary,\n         DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk\n  FROM employees\n) t\nWHERE rnk = 2\nGROUP BY department_id, salary;\n```\n- `DENSE_RANK` treats tied top salaries as one rank, so rank 2 is the true second-highest *value*.\n- `ROW_NUMBER` would pick an arbitrary row among ties; `RANK` would skip rank 2 if two people tie for first.\n- Departments with one distinct salary return nothing; mention that and ask if NULL is expected instead.",
  },
  {
    text: "What's the difference between ROW_NUMBER, RANK and DENSE_RANK? Give an example where each produces a different result.",
    role: "both", category: "sql", difficulty: "easy",
    answer: "For scores 100, 100, 90:\n- `ROW_NUMBER`: 1, 2, 3 (unique, arbitrary order among ties)\n- `RANK`: 1, 1, 3 (ties share, then gaps)\n- `DENSE_RANK`: 1, 1, 2 (ties share, no gaps)\nUse ROW_NUMBER for dedup / picking one row, DENSE_RANK for \"Nth highest value\".",
  },
  {
    text: "Table logins(user_id, login_date). Write a query that returns users who logged in on at least 3 consecutive days.",
    role: "both", category: "sql", difficulty: "hard",
    answer: "Gaps-and-islands: subtract a row number from the date; consecutive dates share the same anchor.\n```sql\nWITH d AS (\n  SELECT DISTINCT user_id, login_date FROM logins\n), g AS (\n  SELECT user_id, login_date,\n         login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date)) * INTERVAL '1 day' AS grp\n  FROM d\n)\nSELECT DISTINCT user_id\nFROM g\nGROUP BY user_id, grp\nHAVING COUNT(*) >= 3;\n```\n- `DISTINCT` first: multiple logins per day would break the streak logic.\n- Alternative: `LAG(login_date, 2)` and check it equals `login_date - 2`.",
  },
  {
    text: "Given orders(order_id, customer_id, order_date, amount), compute a 7-day rolling average of daily revenue. What changes if some days have no orders?",
    role: "data_analyst", category: "sql", difficulty: "medium",
    answer: "```sql\nWITH daily AS (\n  SELECT order_date::date AS d, SUM(amount) AS revenue\n  FROM orders GROUP BY 1\n)\nSELECT d, AVG(revenue) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rev_7d\nFROM daily;\n```\n- With missing days, `ROWS` looks back 7 *rows*, not 7 *days*. Fix: join to a calendar/date-spine table and `COALESCE(revenue, 0)`, or use `RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW` where supported.\n- First 6 days average fewer than 7 points; flag or filter them.",
  },
  {
    text: "How would you remove duplicate rows from a table that has no primary key, keeping one copy of each?",
    role: "data_engineer", category: "sql", difficulty: "medium",
    answer: "- Identify duplicates with `ROW_NUMBER() OVER (PARTITION BY <all business columns> ORDER BY <tie-breaker, e.g. loaded_at DESC>)` and keep `rn = 1`.\n- Safest at scale: `CREATE TABLE clean AS SELECT ... WHERE rn = 1`, validate counts, then swap tables, rather than deleting in place.\n- In Postgres you can delete using `ctid`; in warehouses use `QUALIFY ROW_NUMBER() ... = 1` (Snowflake/BigQuery).\n- Then add a uniqueness check or a natural key so it doesn't recur.",
  },
  {
    text: "What is an index, how does a B-tree index speed up a query, and when can adding an index make things worse?",
    role: "both", category: "sql", difficulty: "medium",
    answer: "- An index is a sorted structure (usually a B-tree) of column values pointing to rows, so lookups/range scans are O(log n) instead of a full scan.\n- Helps: selective `WHERE`, join keys, `ORDER BY` matching the index; composite indexes follow the leftmost-prefix rule.\n- Hurts: slower writes (every insert/update maintains the index), extra storage, and low-selectivity columns (e.g. boolean) where the planner scans anyway.\n- Columnar warehouses rely more on partitioning/clustering than B-tree indexes.",
  },
  {
    text: "COUNT(*), COUNT(column) and COUNT(DISTINCT column): what does each count, and how do NULLs affect them?",
    role: "both", category: "sql", difficulty: "easy",
    answer: "- `COUNT(*)`: all rows, NULLs included.\n- `COUNT(col)`: rows where `col` is not NULL.\n- `COUNT(DISTINCT col)`: distinct non-NULL values.\nCommon bug: `AVG(col)` also ignores NULLs, so it's the average of known values, not of all rows.",
  },
  {
    text: "Table events(user_id, event_name, event_time) contains 'signup', 'activate' and 'purchase' events. Write a query for the funnel conversion rate from signup to purchase within 7 days of signup.",
    role: "data_analyst", category: "sql", difficulty: "hard",
    answer: "```sql\nWITH s AS (\n  SELECT user_id, MIN(event_time) AS signup_at\n  FROM events WHERE event_name = 'signup' GROUP BY user_id\n), p AS (\n  SELECT DISTINCT s.user_id\n  FROM s JOIN events e ON e.user_id = s.user_id\n   AND e.event_name = 'purchase'\n   AND e.event_time >= s.signup_at\n   AND e.event_time <  s.signup_at + INTERVAL '7 days'\n)\nSELECT COUNT(p.user_id)::numeric / NULLIF(COUNT(s.user_id), 0) AS conversion_7d\nFROM s LEFT JOIN p USING (user_id);\n```\n- Anchor on each user's *first* signup; count distinct users, not events.\n- Exclude users who signed up less than 7 days ago (incomplete window), or the rate is biased down.",
  },
  {
    text: "What's the difference between UNION and UNION ALL, and which one should you default to?",
    role: "both", category: "sql", difficulty: "easy",
    answer: "`UNION` removes duplicates (requires a sort/hash, more expensive); `UNION ALL` keeps every row. Default to `UNION ALL` unless you specifically need dedup, which also makes your intent explicit.",
  },
  {
    text: "A dashboard query that joins a 2-billion-row fact table to three dimension tables has gone from 30 seconds to 10 minutes. How do you investigate?",
    role: "data_engineer", category: "sql", difficulty: "hard",
    answer: "1. Read the query plan (`EXPLAIN ANALYZE` / query profile): find the slowest step, rows scanned vs returned, spills to disk.\n2. Check what changed: data volume, a new join causing fan-out, stats out of date, a dimension that lost uniqueness, warehouse size/concurrency.\n3. Partition pruning: is the date filter applied on the partition/cluster column, without wrapping it in a function?\n4. Fixes: pre-aggregate into a summary table or materialized view, filter before joining, fix join key types, re-cluster, broadcast small dims.\n5. Verify with before/after timing and add monitoring on query duration.",
  },
  // ------------------------------------------------------------------ Python
  {
    text: "In pandas, what's the difference between merge, join and concat?",
    role: "both", category: "python", difficulty: "easy",
    answer: "- `pd.merge(a, b, on=..., how=...)`: SQL-style join on columns.\n- `a.join(b)`: convenience join on the **index** by default.\n- `pd.concat([a, b])`: stacks frames along an axis (rows by default) with no key matching.\nAlways check row counts after a merge (`validate='one_to_one'` catches unexpected duplicates).",
  },
  {
    text: "Write a Python function that takes a list of (start, end) intervals and merges overlapping ones.",
    role: "data_engineer", category: "python", difficulty: "medium",
    answer: "```python\ndef merge_intervals(intervals):\n    out = []\n    for start, end in sorted(intervals):\n        if out and start <= out[-1][1]:\n            out[-1][1] = max(out[-1][1], end)\n        else:\n            out.append([start, end])\n    return [tuple(i) for i in out]\n```\n- O(n log n) for the sort. Clarify whether touching intervals (end == next start) should merge, and handle empty input.",
  },
  {
    text: "You need to process a 50 GB CSV file on a laptop with 16 GB of RAM using Python. How do you do it?",
    role: "data_engineer", category: "python", difficulty: "medium",
    answer: "- Stream it: `pd.read_csv(..., chunksize=1_000_000)` or the `csv` module, aggregating per chunk and combining results.\n- Read only needed columns (`usecols`) with compact dtypes (`category`, `int32`).\n- Or use tools built for this: DuckDB / Polars lazy scanning (out-of-core), or convert to Parquet once and query that.\n- Avoid operations that need everything in memory at once (global sorts) unless done externally.",
  },
  {
    text: "What is a generator in Python and why is it useful in data pipelines?",
    role: "data_engineer", category: "python", difficulty: "easy",
    answer: "A generator (`yield`) produces values lazily, one at a time, keeping only its current state in memory. In pipelines it lets you stream records (read → transform → write) without materializing the whole dataset, and compose steps like Unix pipes. Caveat: it can be iterated only once.",
  },
  {
    text: "Given a pandas DataFrame of transactions (user_id, ts, amount), compute for each user the time since their previous transaction.",
    role: "data_analyst", category: "python", difficulty: "medium",
    answer: "```python\ndf = df.sort_values(['user_id', 'ts'])\ndf['since_prev'] = df.groupby('user_id')['ts'].diff()\n```\n- Make sure `ts` is datetime (`pd.to_datetime`). First transaction per user is `NaT`.\n- Equivalent to SQL `ts - LAG(ts) OVER (PARTITION BY user_id ORDER BY ts)`.",
  },
  {
    text: "How do you handle missing values in a dataset before analysis? Walk through your decision process.",
    role: "data_analyst", category: "python", difficulty: "easy",
    answer: "- First understand *why* it's missing (not collected, not applicable, pipeline bug). Missing-not-at-random can bias results.\n- Quantify: % missing per column and by segment.\n- Options: drop rows/columns (if few/irrelevant), impute (median, mode, forward-fill for time series, model-based), or keep an explicit 'unknown' flag.\n- Document the choice and check that results are robust to it.",
  },
  // ------------------------------------------------------------------ Statistics
  {
    text: "Explain a p-value to a non-technical product manager.",
    role: "data_analyst", category: "statistics", difficulty: "easy",
    answer: "\"If the change actually did nothing, the p-value is how often we'd see a difference at least this large just from random noise. A p-value of 0.03 means that would happen about 3% of the time, so the result is unlikely to be pure chance.\" It is **not** the probability that the change works, and doesn't say how big the effect is.",
  },
  {
    text: "You ran an A/B test on a new checkout page and conversion went from 4.0% to 4.3%. How do you decide whether to ship it?",
    role: "data_analyst", category: "statistics", difficulty: "medium",
    answer: "- Check the test was valid: pre-registered metric and sample size, random assignment, sample ratio mismatch (SRM) check, ran full weeks.\n- Statistical significance and confidence interval of the lift (is the CI's lower bound still worth it?).\n- Practical significance: revenue impact vs cost/risk.\n- Guardrail metrics (refunds, latency, AOV) didn't degrade; look at key segments but beware of p-hacking.\n- Novelty effects: did the lift decay over time?",
  },
  {
    text: "What is the difference between Type I and Type II errors, and how does sample size relate to them?",
    role: "data_analyst", category: "statistics", difficulty: "easy",
    answer: "- Type I (false positive, α): concluding there's an effect when there isn't.\n- Type II (false negative, β): missing a real effect. Power = 1 − β.\n- For fixed α, a larger sample size increases power (lower β). Sample size is chosen up front from α, desired power (often 80%), baseline rate and minimum detectable effect.",
  },
  {
    text: "Mean or median: which would you report for 'typical' customer order value, and why?",
    role: "data_analyst", category: "statistics", difficulty: "easy",
    answer: "Order values are usually right-skewed (a few huge orders), which pulls the mean up. The median better represents a 'typical' order. Report the mean when you care about totals (revenue = mean × orders), and show the distribution or percentiles when possible.",
  },
  {
    text: "What is Simpson's paradox? Give an example of how it could mislead a business decision.",
    role: "data_analyst", category: "statistics", difficulty: "medium",
    answer: "A trend that appears in every subgroup reverses when the groups are combined, because group sizes differ. Example: version B converts better on both mobile and desktop, but worse overall because B's traffic was mostly mobile (which converts lower). Fix: compare within segments or use a weighted/stratified analysis, and check the mix of traffic.",
  },
  {
    text: "You run 20 A/B test metrics at α = 0.05 and one shows a significant result. Should you trust it?",
    role: "data_analyst", category: "statistics", difficulty: "medium",
    answer: "Not on its own: with 20 independent tests at 5%, you expect about one false positive by chance (P(at least one) ≈ 64%). Correct for multiple comparisons (Bonferroni, Benjamini–Hochberg), treat it as a hypothesis for a follow-up test, and decide the primary metric before running the experiment.",
  },
  // ------------------------------------------------------------------ Data modeling
  {
    text: "Explain the difference between a star schema and a snowflake schema. Which would you choose for a BI warehouse?",
    role: "data_engineer", category: "data_modeling", difficulty: "easy",
    answer: "- Star: a central fact table joined directly to denormalized dimension tables.\n- Snowflake: dimensions are normalized into sub-dimensions (more joins, less redundancy).\n- For BI, prefer star: simpler queries, fewer joins, faster in columnar warehouses where storage is cheap. Snowflake only for very large or shared hierarchies.",
  },
  {
    text: "What is a slowly changing dimension? Compare SCD Type 1 and Type 2 and when you'd use each.",
    role: "data_engineer", category: "data_modeling", difficulty: "medium",
    answer: "- A dimension whose attributes change over time (e.g. customer address).\n- Type 1: overwrite the value; no history. Use for corrections or attributes where history doesn't matter.\n- Type 2: insert a new row with `valid_from`, `valid_to`, `is_current` and a new surrogate key. Facts join to the version valid at event time, so historical reports stay correct.\n- Mention Type 3 (previous-value column) as a limited alternative.",
  },
  {
    text: "Design a data model for a ride-sharing app's analytics warehouse. What are your fact tables and what is their grain?",
    role: "data_engineer", category: "data_modeling", difficulty: "hard",
    answer: "- `fact_trip`: one row per completed/cancelled trip (grain = trip). Measures: fare, distance, duration, surge, tip. FKs: rider, driver, vehicle, pickup/dropoff location, date/time, payment method.\n- `fact_trip_event` (grain = status change) for funnel/latency analysis: requested → accepted → arrived → started → completed.\n- `fact_driver_session` (grain = driver online session) for supply/utilization.\n- Dimensions: `dim_rider`, `dim_driver` (SCD2 for rating tier/city), `dim_location` (zone, city), `dim_date`, `dim_time`.\n- Discuss: declaring grain first, late-arriving tips, currency normalization, PII separation.",
  },
  {
    text: "What does 'grain' of a fact table mean, and what goes wrong if you get it wrong?",
    role: "data_engineer", category: "data_modeling", difficulty: "easy",
    answer: "Grain is what exactly one row represents (e.g. 'one line item per order'). It must be declared before choosing dimensions and measures. Mixed or wrong grain causes double counting when joining or summing (e.g. order-level shipping cost repeated on every line item), and makes some questions impossible to answer if too coarse.",
  },
  {
    text: "Normalization vs denormalization: when do you want each in a data platform?",
    role: "both", category: "data_modeling", difficulty: "medium",
    answer: "- Normalized (3NF): OLTP/source systems; avoids update anomalies, many small writes.\n- Denormalized: analytics; fewer joins, faster reads, easier for analysts. Columnar compression makes redundancy cheap.\n- Common pattern: normalized staging → modeled star schema → wide denormalized marts for specific dashboards.",
  },
  // ------------------------------------------------------------------ Pipelines
  {
    text: "What does it mean for a data pipeline to be idempotent, and how do you make a daily batch job idempotent?",
    role: "data_engineer", category: "pipelines", difficulty: "medium",
    answer: "Running it once or several times for the same input gives the same result: no duplicates, no missing data.\n- Overwrite partitions instead of appending: `INSERT OVERWRITE ... PARTITION (dt='2026-01-01')` or delete-then-insert in one transaction.\n- Use `MERGE`/upsert on a natural key.\n- Parameterize by logical date, not `now()`, so reruns/backfills process the right window.\n- Deterministic transformations, and write to a staging location then atomically swap.",
  },
  {
    text: "ETL vs ELT: what's the difference and why has ELT become popular?",
    role: "data_engineer", category: "pipelines", difficulty: "easy",
    answer: "- ETL transforms data before loading it into the target; ELT loads raw data first and transforms inside the warehouse.\n- ELT is popular because cloud warehouses provide cheap, scalable compute and storage, raw data is kept for reprocessing, and SQL-based tools (dbt) make transformations versioned and testable.\n- ETL still fits when you must mask PII before it lands or the target can't transform.",
  },
  {
    text: "How do you handle late-arriving data in a daily aggregated pipeline?",
    role: "data_engineer", category: "pipelines", difficulty: "hard",
    answer: "- Partition by event time but track ingestion time too.\n- Reprocess a trailing window each run (e.g. last 3 days), which requires idempotent writes.\n- In streaming: watermarks + allowed lateness, with a side output for very late events.\n- Decide and communicate when numbers are 'final'; monitor the late-data rate.\n- For dimensions arriving after facts: inferred/placeholder dimension members updated later.",
  },
  {
    text: "What data quality checks would you add to a pipeline that loads daily sales data, and what happens when one fails?",
    role: "data_engineer", category: "pipelines", difficulty: "medium",
    answer: "- Schema: expected columns/types. Freshness: data for the expected date arrived.\n- Volume: row count within a band vs historical (catch partial loads).\n- Validity: not-null keys, uniqueness of order_id, amounts ≥ 0, valid foreign keys.\n- Reconciliation: totals match the source system.\n- On failure: block downstream publication (circuit breaker) for critical checks, warn for soft ones, alert the owner, and quarantine bad rows. Tools: dbt tests, Great Expectations, Soda.",
  },
  {
    text: "Explain what Apache Airflow is and the difference between a DAG, a task and an operator.",
    role: "data_engineer", category: "pipelines", difficulty: "easy",
    answer: "- Airflow is a workflow orchestrator: it schedules and monitors pipelines defined in Python.\n- DAG: the workflow, a directed acyclic graph of tasks with a schedule.\n- Operator: a template for a kind of work (BashOperator, PythonOperator, a Snowflake operator).\n- Task: an instance of an operator inside a DAG; a task instance is one run of it for a logical date.\n- Airflow orchestrates; heavy processing should run in the warehouse/Spark, not on Airflow workers.",
  },
  {
    text: "What is Change Data Capture (CDC) and why would you use it instead of daily full extracts?",
    role: "data_engineer", category: "pipelines", difficulty: "medium",
    answer: "CDC captures row-level inserts/updates/deletes from a source database, usually by reading its transaction log (e.g. Debezium on the Postgres WAL / MySQL binlog). Compared to full extracts: far less load on the source, near-real-time freshness, deletes are captured, and history of changes is available. Costs: more infrastructure (Kafka/connectors), handling schema changes and ordering.",
  },
  // ------------------------------------------------------------------ Big data
  {
    text: "What is data skew in Spark, how do you detect it, and how do you fix it?",
    role: "data_engineer", category: "big_data", difficulty: "hard",
    answer: "- Skew: a few keys hold most of the data, so a few tasks run far longer than the rest (stragglers) or spill/OOM.\n- Detect: Spark UI stage view, where max task duration/shuffle read is far above the median.\n- Fixes: broadcast join if one side is small; salting the hot key (add a random suffix, aggregate in two stages); enable AQE skew-join handling (`spark.sql.adaptive.skewJoin.enabled`); filter or handle null/default keys separately.",
  },
  {
    text: "What's the difference between a narrow and a wide transformation in Spark? Why does it matter?",
    role: "data_engineer", category: "big_data", difficulty: "medium",
    answer: "- Narrow (map, filter): each output partition depends on one input partition; no data movement.\n- Wide (groupBy, join, distinct, repartition): requires a shuffle across the network, creating a new stage.\n- Shuffles are the main cost in Spark jobs (network, disk, serialization), so minimize them: filter early, broadcast small tables, avoid unnecessary repartitions.",
  },
  {
    text: "Why are columnar file formats like Parquet preferred for analytics over CSV or JSON?",
    role: "data_engineer", category: "big_data", difficulty: "easy",
    answer: "- Column pruning: read only the columns a query needs.\n- Much better compression (similar values stored together) and encodings (dictionary, RLE).\n- Embedded schema and types.\n- Row-group statistics (min/max) enable predicate pushdown to skip data.\nCSV/JSON must be fully parsed row by row and have no types.",
  },
  {
    text: "What is partitioning in a data lake, and how do you choose a partition key? What happens if you over-partition?",
    role: "data_engineer", category: "big_data", difficulty: "medium",
    answer: "- Partitioning splits data into directories by a column (e.g. `dt=2026-01-01`) so queries filtering on it skip irrelevant files.\n- Choose a column that is commonly filtered on with low-to-moderate cardinality: usually event date.\n- Over-partitioning (e.g. by user_id) creates millions of tiny files: slow listing, metadata overhead, poor compression. Aim for files of ~128 MB–1 GB; use clustering/Z-ordering for high-cardinality columns.",
  },
  {
    text: "Batch vs stream processing: how do you decide which one a use case needs?",
    role: "data_engineer", category: "big_data", difficulty: "medium",
    answer: "Ask what latency the business actually needs and what action happens on the data.\n- Streaming (Kafka + Flink/Spark Structured Streaming): fraud detection, real-time alerts, live operational metrics.\n- Batch: reporting, finance, ML training: simpler, cheaper, easier to backfill and debug.\n- Streaming adds complexity: state, late/out-of-order data, exactly-once semantics. Micro-batch every few minutes is often a good middle ground.",
  },
  // ------------------------------------------------------------------ Warehousing
  {
    text: "What's the difference between a data warehouse, a data lake and a lakehouse?",
    role: "data_engineer", category: "warehousing", difficulty: "easy",
    answer: "- Warehouse: structured, modeled data with schema-on-write, SQL-first (Snowflake, BigQuery, Redshift).\n- Lake: cheap object storage (S3/GCS) holding raw files of any type, schema-on-read.\n- Lakehouse: lake storage plus table formats (Delta, Iceberg, Hudi) adding ACID transactions, schema enforcement and time travel, so warehouse-like workloads run directly on the lake.",
  },
  {
    text: "Your company's Snowflake (or BigQuery) bill doubled last month. How do you find the cause and reduce it?",
    role: "data_engineer", category: "warehousing", difficulty: "hard",
    answer: "- Break down cost by warehouse/project, user/service account, and query (query history / INFORMATION_SCHEMA.JOBS).\n- Look for: new scheduled jobs, full-table scans missing partition filters, dashboards refreshing too often, `SELECT *` on wide tables, warehouses not auto-suspending, oversized warehouses.\n- Fixes: incremental models instead of full rebuilds, clustering/partition filters, materialized aggregates, auto-suspend, resource monitors/budgets, right-sizing.\n- Set up ongoing cost attribution and alerts.",
  },
  {
    text: "What are the advantages of columnar storage in a cloud data warehouse like BigQuery or Redshift?",
    role: "both", category: "warehousing", difficulty: "easy",
    answer: "Analytical queries typically scan a few columns across many rows. Columnar storage reads only those columns, compresses very well, and enables vectorized execution, so aggregates over billions of rows are fast and, in BigQuery's pricing model, cheaper because you pay per bytes scanned.",
  },
  // ------------------------------------------------------------------ System design
  {
    text: "Design a pipeline that ingests clickstream events from a website and powers both a real-time dashboard and daily reporting.",
    role: "data_engineer", category: "system_design", difficulty: "hard",
    answer: "- Clarify: events/sec, latency target for the dashboard, retention, who consumes it.\n- Collection: tracking SDK → collector API → Kafka/Kinesis (partition by user/session).\n- Real-time path: Flink/Spark Streaming aggregates over windows with watermarks → low-latency store (Druid/ClickHouse/Pinot) → dashboard.\n- Batch path: raw events land in object storage as Parquet (partitioned by date) → warehouse models (dbt) → sessionization, daily metrics.\n- Cross-cutting: schema registry/contracts, dedup by event_id, bot filtering, late data, PII handling, monitoring of lag and volume, backfills from the raw zone.",
  },
  {
    text: "How would you design a system to backfill two years of historical data into a new table without impacting production pipelines?",
    role: "data_engineer", category: "system_design", difficulty: "hard",
    answer: "- Make the job idempotent and parameterized by date range; process in chunks (e.g. one month at a time).\n- Run on separate compute or a lower-priority queue/warehouse; throttle concurrency.\n- Write to a new table/partitions, validate (row counts, totals vs source, sample checks), then swap or union in.\n- Track progress per chunk so failures resume rather than restart.\n- Communicate with downstream consumers and freeze schema changes during the backfill.",
  },
  // ------------------------------------------------------------------ BI & visualization
  {
    text: "How do you decide which chart type to use for a given piece of data?",
    role: "data_analyst", category: "bi_visualization", difficulty: "easy",
    answer: "Start from the question:\n- Trend over time → line chart.\n- Compare categories → bar chart (sorted), horizontal for long labels.\n- Part-to-whole → stacked bar; pie only for 2–3 parts.\n- Distribution → histogram / box plot.\n- Relationship → scatter plot.\nAvoid 3D, dual axes that mislead, and truncated y-axes on bar charts. Lead with the takeaway in the title.",
  },
  {
    text: "A stakeholder says the numbers in your dashboard don't match the numbers in the finance report. What do you do?",
    role: "data_analyst", category: "bi_visualization", difficulty: "medium",
    answer: "- Get both numbers and their exact definitions: metric definition, filters, date range, timezone, currency, refunds/cancellations, data refresh time.\n- Reconcile step by step from a shared base (e.g. order list) until the difference is explained.\n- Common causes: gross vs net revenue, booking date vs payment date, test accounts, late data.\n- Fix the bug if it's yours; otherwise document the definition difference, align on a single source of truth, and add the definition to the dashboard.",
  },
  {
    text: "What makes a good dashboard? Describe how you would design one for a sales leadership team.",
    role: "data_analyst", category: "bi_visualization", difficulty: "medium",
    answer: "- Start with their decisions and questions, not the available data; agree on 3–5 KPIs (revenue vs target, pipeline, win rate, cycle length).\n- Top: KPI tiles with comparison (vs target, vs last period). Middle: trends. Bottom: breakdowns (region, rep, segment) with drill-down.\n- Consistent definitions documented, refresh time visible, fast load, minimal clutter.\n- Iterate with users and track usage.",
  },
  {
    text: "In Excel, what is the difference between VLOOKUP and INDEX/MATCH (or XLOOKUP)? Why do many analysts avoid VLOOKUP?",
    role: "data_analyst", category: "bi_visualization", difficulty: "easy",
    answer: "- `VLOOKUP` only looks to the right of the lookup column, uses a hard-coded column number (breaks when columns are inserted), and defaults to approximate match if you forget `FALSE`.\n- `INDEX/MATCH` can look left, references the return column directly, and is more robust.\n- `XLOOKUP` (modern Excel) combines both, with exact match by default and a built-in 'not found' value.",
  },
  // ------------------------------------------------------------------ Business case
  {
    text: "Daily active users dropped 10% yesterday. How would you investigate?",
    role: "data_analyst", category: "business_case", difficulty: "medium",
    answer: "1. Confirm it's real: data pipeline delays, tracking/logging changes, definition changes, bot filtering.\n2. Context: day of week, holidays, seasonality, comparable past drops.\n3. Segment: platform/app version, country, new vs returning, acquisition channel. Is it concentrated?\n4. Internal changes: releases, experiments, outages, marketing campaigns ending.\n5. External: competitor launches, news, app store issues.\n6. Quantify impact, share findings with confidence level and next steps.",
  },
  {
    text: "How would you define and measure customer churn for a subscription business?",
    role: "data_analyst", category: "business_case", difficulty: "medium",
    answer: "- Definition: a customer who cancels or doesn't renew within the period. Decide voluntary vs involuntary (failed payment) churn.\n- Rate: churned in period ÷ customers at start of period (exclude new customers acquired in the period from the denominator).\n- Track by cohort (signup month), plan, channel; complement with revenue churn and net revenue retention.\n- For non-subscription products, define inactivity (e.g. no purchase in 90 days) based on the usage cycle.",
  },
  {
    text: "What metrics would you use to measure the success of a new 'save for later' feature in an e-commerce app?",
    role: "data_analyst", category: "business_case", difficulty: "medium",
    answer: "- Adoption: % of active users who use it, saves per user.\n- Engagement: % of saved items later viewed/purchased, time to purchase.\n- Business impact (primary, via A/B test): conversion rate, revenue per user, return visits.\n- Guardrails: cart abandonment, checkout conversion (does it cannibalize immediate purchases?), app performance.\nState the hypothesis the feature is built on and choose one primary metric.",
  },
  {
    text: "Estimate how many data engineers are employed in your country. Walk me through your approach.",
    role: "both", category: "business_case", difficulty: "medium", round: "case",
    answer: "Structure the estimate top-down and state assumptions clearly, e.g.:\n- Working population → % in tech-intensive companies → number of such companies by size → data team size per company → share of data engineers.\n- Sanity-check with a bottom-up angle (job postings × turnover) and give a range rather than one number.\nInterviewers grade the structure, assumptions and sanity checks more than the final number.",
  },
  // ------------------------------------------------------------------ Behavioral
  {
    text: "Tell me about a time you found an error in your own analysis after sharing it. What did you do?",
    role: "both", category: "behavioral", difficulty: "medium",
    answer: "Use STAR (Situation, Task, Action, Result).\n- Show ownership: you flagged it quickly yourself, explained the impact, and sent a correction.\n- Show learning: the process change you made (peer review, automated checks, reconciliations).\n- Avoid blaming others or minimizing the error.",
  },
  {
    text: "Describe a time you had to explain a complex technical finding to a non-technical audience.",
    role: "both", category: "behavioral", difficulty: "easy",
    answer: "STAR answer that highlights: knowing the audience's goal, leading with the recommendation and business impact, using one clear visual or analogy instead of methodology, anticipating questions, and the decision that resulted.",
  },
  {
    text: "Tell me about a time you disagreed with a stakeholder about a metric or data request. How did you handle it?",
    role: "both", category: "behavioral", difficulty: "medium",
    answer: "Show that you: understood the underlying business question behind the request; brought data and options rather than opinions; were willing to be wrong; reached an agreement (or escalated respectfully); and kept the relationship strong. End with the outcome and what you'd do again.",
  },
  {
    text: "Tell me about a data pipeline or project that failed in production. What happened and what did you change afterwards?",
    role: "data_engineer", category: "behavioral", difficulty: "medium",
    answer: "Pick a real incident. Cover: detection (how you found out, ideally from monitoring not users), mitigation (stopped the bleeding, communicated), root cause, and the lasting fix (tests, alerts, idempotency, runbooks). Blameless framing; quantify impact and time to recovery.",
  },
  {
    text: "Why do you want to be a data engineer rather than a data analyst or data scientist?",
    role: "data_engineer", category: "behavioral", difficulty: "easy",
    answer: "Be specific and genuine: e.g. you enjoy building reliable systems others depend on, care about data quality at the source, like software engineering practices applied to data. Back it with an example of something you built, and connect it to what this team does.",
  },
];
