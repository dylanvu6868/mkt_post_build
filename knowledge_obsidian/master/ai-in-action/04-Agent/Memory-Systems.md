---
tags: [agent, memory, 04-agent]
created: 2026-06-27
---
# Memory Systems for Agents
**Day 17 · Track 3** · From stateless chatbots → persistent agents

## The Core Problem
- LLMs are **stateless by default**
- User expects agent to "remember" across sessions
- Context window = RAM (fast, limited, ~128K tokens)
- External store = disk (slower, unlimited, Redis/Vector DB)

## 4 Memory Types (Cognitive Model)
| Type | Storage | Use |
|------|---------|-----|
| **Short-term** (Working) | Context window buffer | Current conversation |
| **Long-term** (Factual) | Redis / PostgreSQL | User preferences, facts across sessions |
| **Episodic** | Log of past trajectories | "Last time I tried X, Y happened" |
| **Semantic** | Vector DB / embeddings | Domain knowledge, concepts |

## 7 Context Layers (Priority Order)
1. System Context (persona, constraints) — *never trimmed*
2. Task Context (objective, instructions)
3. User Context (preferences, history)
4. Memory Context (recalled facts, episodes)
5. Retrieval Context (RAG results)
6. Tool Context (function outputs)
7. Policy Context (guardrails, safety)

## Memory Management Flow
1. **Buffer** → conversation history
2. **Summarize** → when token limit approaches, LLM summarizes
3. **Extract** → key facts, decisions, tasks → persistent store
4. **Persist** → Redis (facts), Vector DB (semantic), Log (episodes)

## Compaction vs Full Transcript
Better to compact old conversation into summary + durable notes + recent turns,
rather than dragging full transcript across sessions.

## Cross-Session Identity Files
- `AGENTS.md` — working rules, workflow, boundaries
- `SOUL.md` — identity, tone, default behaviors
- `MEMORY.md` — durable notes, key decisions

## Frameworks
| Option | Setup | Control | Best For |
|--------|-------|---------|----------|
| Mem0/Zep | Fast (API) | Limited | MVP, go-to-market |
| Custom (Redis + Chroma) | Slow | Full control | Production, domain-specific |
