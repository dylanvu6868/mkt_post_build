---
tags: [data, devops, 03-rag-data]
created: 2026-06-27
---
# Data Pipeline Engineering
**Day 10, 17** · Garbage in = Garbage out, fixed systematically

## ETL vs ELT
| ETL | ELT (default for cloud) |
|-----|------------------------|
| Transform before load | Load raw → transform in warehouse |
| Required for PII masking | Cloud compute is cheap |
| Target: legacy systems | Target: Snowflake/Databricks/BigQuery |

## Medallion Architecture (Bronze → Silver → Gold)
| Layer | Content | Properties |
|-------|---------|------------|
| Bronze | Raw, append-only, never modified | "Keep forever" — immutable audit |
| Silver | Cleaned, deduplicated, schema enforced | Dedup + validate |
| Gold | Aggregated, business-ready, ML features | Fast queries, feature store |

## Data Quality as Code (Great Expectations)
- **Completeness**: content not null
- **Accuracy**: policy date correct
- **Consistency**: same key, same format
- **Timeliness**: freshness by SLA
- **Validity**: schema + contract

## 5 Pillars of Data Observability
1. **Freshness** — data updated on schedule?
2. **Distribution** — values within expected range?
3. **Volume** — record count expected?
4. **Schema** — structure drifted?
5. **Lineage** — trace source → output?

## Ingestion Patterns
| Source | Method | Monitor |
|--------|--------|---------|
| PostgreSQL | CDC (Debezium) or watermark | Replication lag, schema drift |
| API | Poll + cursor + rate limit | 429 rate, checkpoint stall |
| PDF/HTML | Parse + hash + version | OCR confidence, encoding |
| Stream | Queue + consumer | Depth, DLQ count |

## Pipeline Reliability Stats
- 1/10 datasets has incident yearly
- Average cost: $3M/month from pipeline failures
- 53% of data engineering effort = pipeline maintenance
