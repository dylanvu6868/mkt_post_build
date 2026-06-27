---
tags: [monitoring, devops, 05-operations]
created: 2026-06-27
---
# Monitoring, Logging & Observability
**Day 13** · Know how your agent runs *before* users complain

## 3+1 Pillars
| Pillar | Answers | Tool Examples |
|--------|---------|---------------|
| Metrics | How many? How long? | Prometheus, Grafana |
| Logs | What happened? | Loki, JSON logs |
| Traces | Why did it happen? | Langfuse, LangSmith, Tempo |
| Continuous Eval | Is answer still correct? | LLM-judge, RAGAS (4th pillar) |

## AI-Specific Metrics
| Category | Metrics |
|----------|---------|
| Performance | Latency P50/P95/P99, TTFT, TPOT, throughput |
| Cost | Tokens/request, $/request, $/day, cache hit rate |
| Quality | Hallucination rate, task completion, thumbs up/down |
| Reliability | Error rate, tool-call success, retry rate, loop rate |

## Structured Logging
```json
{
  "correlation_id": "req-abc123",
  "level": "INFO",
  "event": "agent_response",
  "model": "claude-sonnet-4-6",
  "latency_ms": 1250,
  "input_tokens": 640,
  "output_tokens": 250,
  "cost_usd": 0.0057
}
```

## RED vs USE
- **RED** (request-centric): Rate, Errors, Duration — user perspective
- **USE** (resource-centric): Utilization, Saturation, Errors — resource perspective

## PII Redaction
- Mask BEFORE logging: regex for email/phone/ID → `[REDACTED]`
- Tools: Microsoft Presidio, custom regex
- DO NOT log: raw prompts with sensitive data, API keys

## SLO & Error Budget
| Metric | SLO | Error Budget |
|--------|-----|--------------|
| Latency P95 | < 2s | 0.1% of month |
| Error rate | < 1% | — |
| Hallucination rate | < 3% | — |

## 4-Layer Quality Metrics
- L1: Automated heuristics (format, length, toxicity) — realtime, cheap
- L2: LLM-as-Judge (relevance, faithfulness) — sampled
- L3: User signals (thumbs, CSAT) — weekly
- L4: Outcome (revenue, retention) — ground truth, lags
