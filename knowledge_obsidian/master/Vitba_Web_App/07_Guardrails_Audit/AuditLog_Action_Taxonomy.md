---
title: "AuditLog Action Taxonomy"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - audit-log
---

# AuditLog Action Taxonomy

AuditLog ghi mọi mutation và sự kiện quan trọng để phục vụ quota counting, admin analytics, debug và compliance.

## Schema

```python
class AuditLog(Base):
    id: UUID
    user_id: UUID | None
    project_id: UUID | None
    action: str
    entity_type: str | None
    entity_id: str | None
    metadata: dict
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
```

## Action groups

### Chat/generate

```text
chat.send
chat.stream.start
chat.stream.done
generate.start
generate.step
generate.success
generate.error
generate.cancel
```

### LangGraph nodes

```text
generate.planner.start
generate.planner.success
generate.research.start
generate.research.success
generate.seo.start
generate.seo.success
generate.brand.load
generate.fusion.success
generate.copywriter.success
generate.reviewer.success
generate.reviewer.skipped
generate.formatter.success
```

### Lab

```text
lab.shield.run
lab.hexbreaker.run
lab.blindspot.run
lab.psycho.run
lab.persona.run
lab.reverse.run
lab.hook.run
lab.dna.run
lab.simulator.run
lab.trendjack.run
lab.evergreen.run
lab.abtest.run
lab.cinematic.run
lab.audiohook.run
lab.repurposer.run
lab.report.run
lab.competitorspy.run
lab.influencer.run
lab.hashtag.run
lab.dialect_adapter.run
lab.zalo_oa_publish.run
lab.seo_analysis.run
```

### MCP

```text
email.send
email.schedule
meta.post
landing.deploy
seo.html_analyze
analytics.ga4.read
calendar.item.create
calendar.item.approve
calendar.item.publish
orchestrator.cross_post
```

### Guard/quota/feedback

```text
guard.reject
quota.consume
quota.reject
feedback.create
feedback.update
```

## Metadata guidelines

Nên lưu:

- `request_id`
- `trace_id`
- `model_tier`
- `content_type`
- `tool_name`
- `status`
- `latency_ms`
- `usage_summary`

Không lưu:

- API keys.
- OAuth tokens.
- Password.
- Full sensitive prompt nếu không cần.

## Admin usage

AuditLog feed vào:

- Tool usage top 20.
- Quota counting.
- Activities feed.
- Error feed.
- Security investigation.

## Backlinks

- [[Langfuse_Tracing]]
- [[Admin_Analytics]]
- [[Vitba Agent Harness]]
