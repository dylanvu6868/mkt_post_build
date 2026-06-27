---
title: "API Endpoint Template"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - template
  - api
---

# API Endpoint Template

## Endpoint

```http
POST /path
```

## Purpose

...

## Request

```json
{}
```

## Response

```json
{}
```

## Auth

- JWT required.
- Project access check.

## Quota

`feature.key`

## Audit

```text
module.action
```

## Errors

| Code | Meaning |
|---|---|
| `PLAN_LIMIT_EXCEEDED` | quota hết |
| `GUARD_REJECTED` | guard chặn |
| `VALIDATION_ERROR` | input sai |

## Tests

- [ ] Auth required.
- [ ] Ownership check.
- [ ] Happy path.
- [ ] Error path.
