---
tags: [devops, cloud, 05-operations]
created: 2026-06-27
---
# Cloud Infrastructure & GPU Serving
**Day 16,20 · Track 2** · From GPU instances to production serving

## GPU Pricing 2026
| GPU | VRAM | $/hr | Best For |
|-----|------|------|----------|
| T4 | 16GB | $0.35 | Small inference (7B) |
| L40S | 48GB | $0.40-0.86 | Inference medium — sleeper pick |
| A100 | 80GB | $1.79-4.31 | Fine-tuning, inference |
| H100 | 80GB | $2.99-4.31 | Pre-training, large inference |
| H200 | 141GB | $3.72-5.58 | LLM 70B single GPU |

## Serving Engines (2026)
| Engine | Best For | Key Feature |
|--------|----------|-------------|
| vLLM | General LLM production | PagedAttention, continuous batching |
| SGLang | Multi-turn, agents | RadixAttention (prefix caching +20%) |
| NVIDIA Dynamo | Disaggregated P/D | Multi-tenant orchestrator |
| LMDeploy | Max throughput | TurboMind (1.8× vLLM) |
| TensorRT-LLM | NVIDIA fleet | 30-50% faster for high concurrency |

## Quantization
| Format | Quality | VRAM (8B) |
|--------|---------|------------|
| FP16 | Baseline | 15.8 GB |
| FP8 | <1% drop | 7.9 GB |
| AWQ 4-bit | ~1pt MMLU | 4.5 GB |
| GGUF Q4_K_M | ~1pt MMLU | 4.8 GB |

## Key Optimization Concepts
- **PagedAttention** — KV cache as virtual memory pages (eliminates fragmentation)
- **Continuous batching** — requests join/leave mid-generation (no padding)
- **FlashAttention 3/4** — IO-aware, tile-based, FP8/FP4 support
- **Speculative decoding** — draft model predicts 4-8 tokens, target verifies (2-3× speed)
- **Disaggregated P/D** — separate prefill and decode pools for better resource utilization
