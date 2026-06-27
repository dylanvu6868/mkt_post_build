---
tags: [data, devops, 03-rag-data]
created: 2026-06-27
---
# Data Lakehouse Architecture
**Day 18 · Track 2** · ACID + cheap storage + AI workloads

## 3 Eras of Data
| Era | Workload | Format |
|-----|----------|--------|
| Traditional (1990-2012) | OLTP, BI | Star schema, 3NF |
| ML (2012-2022) | Feature eng, batch train | Semi-structured (JSON) |
| LLM (2022+) | Pretraining, RAG, trace logs | Text + multimodal + embeddings |

## Delta Lake Capabilities
- **ACID transactions** on S3 via JSON transaction log
- **Time Travel**: `versionAsOf`, `timestampAsOf`, `DESCRIBE HISTORY`
- **Deletion Vectors**: bitmap soft-delete (no Parquet rewrite) — 10-100× faster DELETE/UPDATE
- **Change Data Feed (CDF)**: stream changes downstream without full snapshot

## Delta vs Iceberg vs Hudi
| Feature | Delta | Iceberg | Hudi |
|---------|-------|---------|------|
| Hidden partitioning | — | ✅ (game changer) | — |
| Multi-engine native | Via UniForm | Default | — |
| Row-level updates | MERGE + DV | MERGE + DV | MOR (fastest) |
| Origin | Databricks (2017) | Netflix/Apple (2018) | Uber (2016) |

## Iceberg Hidden Partitioning
Users filter by natural column (`ts`), Iceberg auto-prunes. No duplicate partition columns. Partition evolution without rewriting data.

## Query Engines
| Engine | Scale | Sweet Spot |
|--------|-------|------------|
| DuckDB | MB-100GB | Single-node analytics (dev) |
| Spark SQL | TB-PB | ETL, batch ML |
| Trino | GB-PB | Federated BI, multi-source |

## Medallion for LLM Observability
- **Bronze**: raw LLM outputs JSON, user inputs
- **Silver**: deduplicated, validated, PII-removed — one row per call
- **Gold**: aggregated metrics by date+model — p50/p95 latency, cost, error rate
- Lakehouse = system-of-record for LLM traces
