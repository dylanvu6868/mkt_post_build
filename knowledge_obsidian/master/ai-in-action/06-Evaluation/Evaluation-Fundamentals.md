---
tags: [eval, benchmark, 06-evaluation]
created: 2026-06-27
---
# AI Evaluation & Benchmarking
**Day 14** · Measuring AI quality scientifically

## Paradigm Shift
| Traditional ML | Generative AI |
|----------------|---------------|
| Fixed output (right/wrong) | Probabilistic output distribution |
| Exact Match gold standard | Thousands of valid phrasings |
| Precision/Recall/F1 | Semantic eval, LLM-as-Judge |

## N-Gram Metrics Limitation
BLEU/ROUGE penalize paraphrasing. "Hà Nội là thủ đô" vs "Thủ đô của Việt Nam là Hà Nội" — same meaning, score 0.

## 3 Types of Eval
| Type | When | Tools |
|------|------|-------|
| Offline (batch) | Every release, every prompt change | RAGAS, DeepEval |
| Online (monitoring) | Continuous, real traffic | TruLens, Langfuse |
| Human (sampled) | Weekly, high-stakes | Annotation UI, spreadsheets |

## Golden Dataset Design
| Size | Use Case |
|------|----------|
| 20 questions | Lab only |
| 30-50 | Smoke test, rapid iteration |
| 100-200 | Statistical significance, production |

**Template**: 5 easy + 7 medium + 5 hard + 3 adversarial.
Start from real user traces, not synthetic.

## LLM-as-Judge
- Judge LLM receives: question + agent answer + reference answer + rubric
- Score 1-5 with rationale
- **Bias awareness**: positional bias, verbosity bias, self-enhancement bias
- **Calibration**: compare judge scores vs human on 50+ samples — aim for Cohen's kappa > 0.7

## RAGAS Metrics
| Metric | What | Target |
|--------|------|--------|
| Faithfulness | Answer grounded in context? | > 0.8 |
| Answer Relevancy | Answers the question? | > 0.75 |
| Context Precision | Retrieved chunks relevant? | > 0.7 |
| Context Recall | Retrieved all evidence? | > 0.8 |

## Evaluation Frameworks
| Framework | Best For |
|-----------|----------|
| RAGAS | Standardized RAG metrics |
| DeepEval | Pytest-style, CI/CD native |
| TruLens | Production monitoring + offline |

## Failure Analysis
- Low Faithfulness → Generation (grounding prompt)
- Low Answer Relevancy → Generation (prompt)
- Low Context Recall → Retrieval (chunk size/strategy)
- Low Context Precision → Retrieval (reranking/filter)
