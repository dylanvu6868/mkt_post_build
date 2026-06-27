---
tags: [llm, transformer, architecture, 01-foundation]
created: 2026-06-27
---
# LLM Foundation
**Day 1** · AI in Action Batch 02

## Core Concepts
- **Transformer**: Decoder-only architecture (GPT, Claude, Gemini) self-attention + feed-forward
- **Next-token prediction**: LLM predicts next token probabilistically, NOT "understanding"
- **Token economy**: 0.75 word/token (EN), 0.5 word/token (VI) — Vietnamese costs more

## Key Parameters
| Param | Effect | Default Use |
|-------|--------|-------------|
| Temperature | 0=deterministic, 1=creative | 0 for code/analysis |
| Top-p | nucleus sampling p% | 0.9-0.95 |
| Max tokens | output cap | per task budget |

## 3 Training Stages
1. **Pre-training**: Internet-scale self-supervised → language + knowledge
2. **SFT**: Follow examples → learn "correct" response style
3. **RLHF/DPO**: Align to human preference, safety

## Limitations
- Knowledge cutoff — can't know post-training events without tools
- Context window is bounded (128K-1M tokens)
- Hallucination: optimizes fluency, not truth

## References
- `[[Prompt Engineering]]` · `[[Token Economics]]`
- Anthropic API, OpenAI API, Gemini API
