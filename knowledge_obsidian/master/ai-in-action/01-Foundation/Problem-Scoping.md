---
tags: [product, architecture, 01-foundation]
created: 2026-06-27
---
# Problem Scoping & AI Decision Framework
**Day 2** · Choose right problem, right architecture, right gate

## AI-Fit Matrix
| Approach | Input | Output | When |
|----------|-------|--------|------|
| Rule/Script | Stable, deterministic | Predictable high | Compliance, fixed logic |
| LLM Feature | Variable but bounded | Flexible + guardrails | Summarize, extract, moderate |
| Agent | Multi-step, multi-tool | Dynamic, decisions | Planning, tool use, feedback loops |

**Order**: start left, move right only when value > complexity.

## 6-Gate Lifecycle
```
Problem Scoping → Data Readiness → Baseline/Model → Build & Eval → Deploy Controls → Monitor & Iterate
```
Each gate: GO if metric+baseline+eval clear, NO-GO if not.

## Problem Statement Template
| Field | Question |
|-------|----------|
| Actor | Who does this work daily? |
| Current Workflow | Steps + tools used now |
| Bottleneck | Which step is slow/wrong/costly? |
| Impact | $ time SLA conversion loss |
| Success Metric | What threshold = success? |
| Boundary | System can/cannot do, HITL points |

## 4 Anti-Patterns
1. **Trend-first**: chase "agent" before defining workflow
2. **No baseline**: build AI without comparing to manual
3. **No eval path**: demo works but no test set
4. **No owner of failure**: unclear who reviews/rolls back

## Feasibility Check
- Technical: baseline + data + latency acceptable?
- Operational: logging + HITL + rollback path?
- Business: ROI in pilot scope + risk clear?
