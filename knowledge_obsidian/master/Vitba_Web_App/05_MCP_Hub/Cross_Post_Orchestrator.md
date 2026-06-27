---
title: "Cross Post Orchestrator"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - mcp
---

# Cross Post Orchestrator

## Purpose

Cross-post Orchestrator điều phối publish cùng một content sang nhiều target: Meta pages, email lists và future channels.

## Functions

- Loop qua publish targets.
- Call Meta create_post.
- Call Email send.
- Sync Calendar status.
- Return per-target result.

## Endpoints / operations

```python
async def cross_post(content, targets):
    results = []
    for target in targets:
        result = await publish_one_target(content, target)
        results.append(result)
    return results
```

## Guardrails

- Không để một target fail làm mất toàn bộ log.
- Idempotency key theo `content_item_id + target_id`.
- Validate ownership từng target.
- Policy publish rõ: all_success, partial_success, manual_review.
- Audit từng target.

## Audit actions

```text
orchestrator.cross_post.start
orchestrator.target.publish.start
orchestrator.target.publish.success
orchestrator.target.publish.failed
orchestrator.cross_post.success
orchestrator.cross_post.partial_failed
```

## Data models

`ContentPublishResult` nên lưu target, provider_result_id, status, error, idempotency_key.

## Failure handling

- Dùng normalized error format.
- Retry lỗi transient theo [[Error_Handling_Retry]].
- Không retry lỗi auth/permission/policy.
- Lưu status và error message an toàn.



## Backlinks

- [[MCP_Hub_MOC]]
- [[MCP_Mutation_Safety]]
- [[AuditLog_Action_Taxonomy]]
