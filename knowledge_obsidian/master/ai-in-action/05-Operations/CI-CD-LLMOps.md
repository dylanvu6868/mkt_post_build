---
tags: [devops, cicd, llmops, 05-operations]
created: 2026-06-27
---
# CI/CD & LLMOps
**Day 21-22 · Track 2** · Automate AI lifecycle

## CI/CD is Different for AI
| Aspect | Traditional | AI |
|--------|-------------|----|
| Artifact | Binary / Docker image | Model weights + metadata |
| Test | Unit + integration | + Model eval, data validation |
| Versioning | Git (code) | Git (code) + DVC (data) |
| Determinism | Same code = same result | Non-deterministic — eval gate needed |
| Build time | Minutes | Minutes → hours (training) |

## MLflow — Experiment Tracking
- **Tracking**: log params, metrics, artifacts per run
- **Registry**: version models through None → Staging → Production → Archived
- **LLM Autolog**: auto-capture prompts, outputs, token usage, latency

## DVC — Data Version Control
- Git-style versioning for datasets + models
- `dvc add` creates .dvc pointer file (hash)
- `dvc repro` runs pipeline stages only when dependencies change
- `dvc exp run --set-param lr=0.001,0.01` parallel experiments

## GitHub Actions CI Pipeline
```
git push → Data Validation → Train → Eval Gate → Deploy
```
- **Eval Gate**: compare new model vs production baseline — block if accuracy drops > 2%
- **Path filter**: train only when `src/` or `data/` changes
- **Secrets**: OIDC federation > long-lived keys

## LLMOps Stack
| Layer | Tools |
|-------|-------|
| Cost & Observability | Helicone, OpenMeter, Prometheus |
| Prompt Management | LangSmith Hub, YAML in Git |
| Tracing | LangSmith, W&B Weave, Phoenix |
| Evaluation | RAGAS, Promptfoo, DeepEval, LLM-as-Judge |
| Guardrails | Guardrails AI, Llama Guard, NeMo |

## Prompt Versioning
- **LangSmith Hub**: pull/push with commit hash — pin exact version in production
- **YAML in Git**: dev-centric, monorepo, CI/CD tight integration
- A/B test: traffic split → two prompt versions → compare on faithfulness/cost/latency

## Key LLMOps Metrics
- Cost per query: < $0.002 target
- Hallucination rate: < 5%
- Faithfulness score: > 0.8 (RAGAS)
- Latency P95: < 3s
