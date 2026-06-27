---
title: "Agent Card Template"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - template
---

# {{Agent Name}}

## Purpose

...

## Runtime profile

| Field | Value |
|---|---|
| Mode | `structured|raw|react|tool_only` |
| Model tier | `fast|smart|none` |
| Harness | [[Vitba Agent Harness]] |

## Inputs

```json
{}
```

## Outputs

```json
{}
```

## Tools

- ...

## Skills

- ...

## Guardrails

- ...

## Audit actions

```text
agent.start
agent.success
agent.error
```

## Failure modes

- ...

## Implementation checklist

- [ ] Input schema.
- [ ] Output schema/raw contract.
- [ ] Prompt version.
- [ ] Quota key.
- [ ] Guard profile.
- [ ] Trace metadata.
- [ ] Audit actions.
- [ ] Tests.
