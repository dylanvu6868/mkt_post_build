---
tags: [rag, embedding, vector-store, data, 03-rag-data]
created: 2026-06-27
---
# Embedding & Vector Store
**Day 7** · Data foundations for AI products

## 3 Data Types for AI
| Type | Examples | Storage | Retrieval |
|------|----------|---------|-----------|
| Knowledge | Policy, SOP, FAQ, docs | Vector store | Semantic search |
| Operational | DB rows, orders, tickets | SQL/API | Function calling |
| Contextual | Session, preferences, profile | Inject to prompt | Direct lookup |

## Embedding = Semantic Vector
- Text → dense vector (768-3072 dimensions)
- Cosine similarity measures meaning distance
- **Not** a fact-checker — garbage in = garbage out

## Cosine Similarity
```
cosine_sim(A,B) = A·B / (||A|| × ||B||)
```
- 1.0 = identical meaning
- 0.0 = unrelated
- -1.0 = opposite meaning

## Vector Store Anatomy
| Component | Purpose |
|-----------|---------|
| Original chunk | Text to inject into prompt |
| Embedding vector | Semantic search |
| Metadata | Source, date, category, ACL |
| Search result | Top-K chunks + scores + filters |

## Chunking Strategies
| Method | Best For | Downside |
|--------|----------|----------|
| Fixed-size | Simple, uniform text | Cut mid-sentence |
| Sentence-based | FAQ, prose | Sentence length varies |
| Section/heading | Structured docs | Needs document structure |
| Recursive | Mixed content | Complex setup |
| Semantic | High quality | Slow, needs embedding |

## 80% rule: Data quality > model choice
- Clean → chunk → enrich → embed
- PII mask BEFORE embedding
- Old data → bad retrieval → hallucination
