---
title: "Prompt Template"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - template
  - prompt
---

# Prompt Template

```yaml
prompt_id: <agent>.v1
owner: ai-team
created_at: 2026-06-25
model_tier: fast|smart
input_schema: <Input>
output_schema: <Output>
eval_set: <eval_set_id>
```

## System prompt

...

## Developer constraints

- Output must match schema.
- Do not invent facts.
- Follow brand voice.
- Respect guardrails.

## User payload format

```json
{}
```

## Output schema

```json
{}
```

## Eval cases

- [ ] Happy path.
- [ ] Missing context.
- [ ] Unsafe input.
- [ ] Long input.
- [ ] Brand constraints conflict.
