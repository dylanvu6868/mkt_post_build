---
tags: [agent, guardrails, safety, 04-agent]
created: 2026-06-27
---
# Guardrails & AI Safety
**Day 11** · Agent is powerful — who controls it?

## 6 Risk Types
| Risk | Description | Severity |
|------|-------------|----------|
| Hallucination | Confidently wrong | High — trust erosion |
| Prompt Injection | Input overrides system prompt | High — loss of control |
| PII Leakage | Exposes personal data | Very high — legal |
| Jailbreak | Bypasses safety filters | High — PR crisis |
| Bias | Discriminatory outputs | High — social harm |
| Over-autonomy | Agent acts beyond scope | Very high — real damage |

## Defense in Depth (3 Layers)
```
Input Rails → LLM Rails → Output Rails
```
1. **Input**: validation, injection detection, topic filter
2. **LLM**: system prompt hardening, safety instructions
3. **Output**: content filter, grounding check, format validation

## Input Guardrails
- Pattern matching for `ignor(e|ing) instructions`, `system prompt`, `DAN`
- LLM-as-classifier for complex variants
- Rate limiting + topic isolation

## Output Guardrails
- **Grounding check**: every claim cites a source
- **Toxicity/PII detection**: redact before user sees
- **Format validation**: valid JSON, expected schema
- **Human-in-the-Loop**: when confidence low → queue for human

## HITL Workflow
| Trigger | Action |
|---------|--------|
| Low confidence (< threshold) | Queue for human review |
| Sensitive topic | Require approval before execution |
| Tool with side effects | Confirm before calling |
| First-time user action | Ask confirmation |

## Red Teaming
- Proactively attack your own agent before deployment
- Build adversarial test suite: direct injection, indirect, roleplay, encoding bypass
- Update suite continuously — new techniques appear weekly

## Frameworks
- NeMo Guardrails (NVIDIA) — declarative dialog control
- Guardrails AI — structured output validation
- LLM-as-Judge — domain-specific content checking
