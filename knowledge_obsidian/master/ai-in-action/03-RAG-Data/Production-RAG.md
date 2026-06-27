---
tags: [rag, data, grounding, 03-rag-data]
created: 2026-06-27
---
# Production RAG (Deep Dive)
**Day 18 · Track 3** · From 60% demo → 85% production

## Error Tree: Diagnose RAG Failures
```
Pre-RAG → Retrieve → Rerank → Augment → Generate → Post-RAG
```
Each box can fail. First diagnose *where*, then *fix*.

## Offline (Indexing) — 80% of quality
### Chunking Strategies
| Strategy | Best For |
|----------|----------|
| Hierarchical (parent 2048/child 256) | Structured docs (default) |
| Late chunking | Long docs with cross-references |
| RAPTOR | Summary/thematic questions |
| Structure-aware | Markdown, tables, PDFs |

### Enrichment (one-time index cost)
- **Contextual embeddings** (Anthropic): LLM prepends 1-sentence context per chunk
- **Hypothetical Q&A**: LLM generates questions the chunk answers → bridge user vocab
  with document language
- **Metadata extraction**: entities, dates, topics for filtering

## Online (Query-time)
### Beyond Basic Hybrid
| Technique | Precision Gain | Latency |
|-----------|---------------|---------|
| ColBERT (token-level match) | +8-12% | 50ms |
| SPLADE (learned sparse) | +6-10% | 40ms |
| Weighted Fusion (trained) | +10-15% | 25ms+ |
| ColPali (visual parsing) | Bypasses parse errors | High |

### Control Flow
- **CRAG**: Corrective RAG — if retrieval confidence low → web search
- **Self-RAG**: Generate → reflect → refine
- **Adaptive**: route query to best retriever based on intent

## Measurement
- RAGAS metrics: Faithfulness (>0.8), Answer Relevancy (>0.75), Context Precision (>0.7), Context Recall (>0.8)
- Diagnose by metric: low recall = chunking/retrieval, low precision = reranking
