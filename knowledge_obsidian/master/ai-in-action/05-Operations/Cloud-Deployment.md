---
tags: [devops, cloud, 05-operations]
created: 2026-06-27
---
# Cloud Deployment & Infrastructure
**Day 12** · From localhost to production

## The Gap: dev vs production
| Dev | Production |
|-----|------------|
| localhost:8000 | Public URL |
| API keys in .env | Secrets management |
| 1 user (you) | 100+ concurrent users |
| No health check | Health + readiness endpoints |
| Laptop off = agent dead | Always on, scalable |

## 12-Factor for AI (4 essentials for MVP)
1. **Config in env** — not hardcoded
2. **Stateless processes** — no local session
3. **Port binding** — `PORT` from env var
4. **Dev/prod parity** — minimal gap between environments

## Docker
- Multi-stage build → target < 500 MB
- Non-root user for security
- HEALTHCHECK instruction
- `.dockerignore` — exclude `__pycache__`, `.env`, `venv/`

## Deployment Tiers
| Tier | Platform | Best For |
|------|----------|----------|
| 1 | Railway / Render | MVP, demo (< 10 min deploy) |
| 2 | AWS ECS / Cloud Run | Production, auto-scaling |
| 3 | Kubernetes | Full control, large scale |

## API Gateway — Basic Security
- `X-API-Key` header authentication
- Rate limiting (per user or per IP)
- Cost protection (spending cap per user/day)
- Health endpoint: `GET /health` → status + uptime + version

## Pre-Production Checklist
- Secrets in env vars (not code)
- Health check endpoint
- Structured logging (JSON)
- Graceful shutdown (SIGTERM handler)
