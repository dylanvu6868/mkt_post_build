---
tags: [rag, graphrag, data, 03-rag-data]
created: 2026-06-27
---
# GraphRAG & Knowledge Graphs
**Day 19 · Track 3** · When relations matter more than text similarity

## When Flat RAG Fails
1. **Multi-hop relational**: "Who co-founded companies with ex-Googlers?"
2. **Global thematic**: "What are the main themes in this corpus?"
3. **Cross-document**: "Compare policy A vs B"

## Knowledge Graph Basics
| Component | Example |
|-----------|---------|
| Node (entity) | Sam Altman, OpenAI, GPT-4 |
| Edge (relation) | CO_FOUNDED, DEVELOPED, INVESTED_IN |
| Triple | (Sam Altman) — [CEO_OF] — (OpenAI) |

## GraphRAG Pipeline
1. **Query Processing**: Extract entities from question
2. **Seed Matching**: Find matching nodes in graph DB
3. **Graph Traversal**: BFS from seed (depth=2 default)
4. **Textualization**: Convert subgraph triples to text
5. **Generation**: LLM answers with subgraph context

## Traversal Depth
| Depth | Effect |
|-------|--------|
| 1 | Too shallow — misses context |
| 2 (default) | Good balance |
| 3+ | Too noisy, blows context window |

## Hybrid Architecture
```
Query → Vector DB (semantic seed) → Graph DB (relational traversal) → LLM
```
Vector finds related chunks *and* seed entities; graph finds relationships.

## Best Practices
- Always maintain pointer from graph node back to source chunk
- Limit traversal: max 2 hops, max 50 edges
- Use **Temporal KG** when answers change over time (who was CEO in 2018 vs 2024)
- Tools: Neo4j (production), NetworkX (prototype), Cypher query language

## Microsoft GraphRAG vs LightRAG
- **MS GraphRAG**: heavy, comprehensive, global summarization
- **LightRAG**: lightweight, fast, local-first
- Choose based on corpus size and query complexity
