---
tags: [llm, prompt, 01-foundation]
created: 2026-06-27
---
# Token Economics
**Day 1** · Cost model for LLM API calls

## Pricing Formula
```
Total Cost = (Input Tokens × Input Price) + (Output Tokens × Output Price)
```
- Output tokens cost **3-5×** input tokens
- Prices drop ~10× every year (GPT-4 level: $20/M → $2/M in 2 years)

## Model Tiers (2026)
| Tier | Model | In/1M | Out/1M | Best For |
|------|-------|-------|--------|----------|
| Cheap | Haiku 4.5, Gemini Flash | $0.80-1.25 | $4-5 | FAQ, classification, batch |
| Balanced | Sonnet 4, GPT-4o | $3-5 | $4-15 | Chat, code, analysis |
| Premium | Opus 4.6, Gemini Pro | $5-15 | $20-25 | Reasoning, planning |

## Cost Optimization
- **Prompt caching**: -90% input cost (Anthropic, DeepSeek)
- **Output compression**: shorter responses = less token cost
- **Model routing**: simple tasks → cheap model, complex → premium

## Rule of Thumb
Start with cheapest model that works. Upgrade only when quality *actually* blocks use case.
