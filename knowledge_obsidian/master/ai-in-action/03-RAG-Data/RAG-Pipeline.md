---
tags: [rag, data, grounding, 03-rag-data]
created: 2026-06-27
---
# RAG Pipeline (Retrieval-Augmented Generation)
**Day 8** · R=Retrieve → A=Augment → G=Generate

## Why RAG ≠ Just "add context"
- **R** — find relevant evidence (dense + sparse + hybrid)
- **A** — package context with structure (ordering, dedup, citation)
- **G** — generate grounded answer (citation, abstention, self-check)

## Retrieval Methods
| Method | Strength | Weakness |
|--------|----------|----------|
| Dense (semantic) | Understands meaning, paraphrase | Misses exact keywords |
| Sparse (BM25) | Exact keyword match | No synonym understanding |
| Hybrid + RRF | Both strengths | Needs tuning (k=60?) |

## Reranking (Optional but Powerful)
Cross-encoder scores query+chunk pairs. Takes top-20, reranks to top-3.
More accurate than bi-encoder but slower — use for final selection.

## Augmentation Best Practices
1. **Document reordering**: most relevant first, second-best last (lost-in-middle)
2. **XML tags**: separate context vs question vs instruction
3. **Token budget**: context ≤ 60% window, leave room for reasoning + output
4. **Citation**: force model to cite [doc_id] per claim

## Generation
- **Strict grounding**: answer ONLY from provided context
- **Abstention**: "I don't have this information" instead of hallucinating
- **Self-correction loop**: generate → check against context → retry if needed

## Pre-RAG Techniques
| Technique | Problem Solved |
|-----------|---------------|
| Multi-Query | Query misses documents |
| HyDE | Short/ambiguous queries |
| Query Decomposition | Multi-hop questions |
| Step-Back | Overly specific questions |
| Pre-filtering | Large index slow/noisy |

## Failure Patterns
- Context conflict (2 docs contradict) → cite both
- Over-reasoning (inventing conditions) → "don't assume"
- Missing constraints → put critical rules at end of prompt
