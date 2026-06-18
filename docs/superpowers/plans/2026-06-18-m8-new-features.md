# M8 — New Features (Copy, Dashboard Stats, Re-generate)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add copy-to-clipboard for generated content, enhance the dashboard with per-type stats breakdown, add a re-generate button, and fix the score display on the dashboard.

**Architecture:** Frontend-only changes. Copy button uses `navigator.clipboard.writeText()`. Dashboard computes stats from existing history data. Re-generate passes the same brief back through `useGenerate()`. No backend changes needed.

**Tech Stack:** Next.js 14, React 18, TypeScript, shadcn/ui, TanStack Query.

## Global Constraints

- Next.js 14 App Router, `@/*` path alias, shadcn/ui v2.3.0, Zustand, TanStack Query
- No new npm dependencies
- Frontend `npm run build` must succeed
- All existing backend tests must still pass (76)
