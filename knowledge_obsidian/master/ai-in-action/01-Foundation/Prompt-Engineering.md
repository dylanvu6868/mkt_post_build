---
tags: [llm, prompt, architecture, 01-foundation]
created: 2026-06-27
---
# Prompt Engineering
**Day 4** · 4 layers of AI reliability

## 4 Layers Framework
1. **Prompt** — instructions, role, format, boundaries
2. **Context** — retrieved docs, history, tool outputs
3. **Tool** — function calling, API integration
4. **Control** — guardrails, eval, logging

## Prompt Structure (Scaffold)
```
<role> You are an X in Y context. </role>
<task> Complete Z based on provided info. </task>
<context> RAG documents, user profile </context>
<boundaries> Don't invent, ask if missing info </boundaries>
<output_format> JSON schema or markdown sections </output_format>
```

## Learning Ladder
| Step | Method | When |
|------|--------|------|
| Zero-shot | Instruction only | Simple task, clear output |
| One-shot | 1 example | Need format/tone exemplar |
| Few-shot | 3-5 examples | Many similar cases, different actions |
| CoT | Step-by-step reasoning | Multi-step logic, calculation |
| ToT | Multiple branches → evaluate | Complex decisions with trade-offs |

## XML Tags > Markdown Delimiters
- Separates instruction from data
- Prevents prompt injection via user content
- Consistent structure across models

## Anti-Patterns
- One giant prompt doing everything → chain smaller prompts
- Examples with different formats → confuse model
- Vague boundaries → model invents constraints
