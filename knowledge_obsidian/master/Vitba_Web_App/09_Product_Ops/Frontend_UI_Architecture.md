---
title: "Frontend UI Architecture"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - frontend
---

# Frontend UI Architecture

## Modules

```text
frontend/
  app/
    chat/
    generate/
    lab/
    calendar/
    landing/
    email/
    meta/
    analytics/
    admin/
  components/
    chat/
    generate/
    lab/
    calendar/
    feedback/
    common/
  lib/
    api.ts
    auth.ts
    sse.ts
    polling.ts
    validators.ts
  stores/
    authStore.ts
    projectStore.ts
    layoutStore.ts
  hooks/
    useGenerateJob.ts
    useChatStream.ts
    useQuota.ts
```

## Zustand localStorage

Chỉ lưu:

- auth token.
- active project.
- UI layout.
- sidebar width/collapsed.

Không lưu source of truth:

- messages.
- jobs.
- content history.
- lab history.

## Generate polling

```ts
async function pollJob(jobId: string) {
  while (true) {
    await sleepUntilVisible(800)
    const job = await api.getGenerateJob(jobId)
    updateUI(job)
    if (["success", "error", "cancelled"].includes(job.status)) return job
  }
}
```

## UI states bắt buộc

- Loading.
- Streaming.
- Current step.
- Quota exceeded.
- Guard rejected.
- Error with retry.
- Success renderer.
- Feedback form.

## Backlinks

- [[Chat_to_Generate_Flow]]
- [[User_Feedback_System]]
- [[Retention_and_Plan_Limits]]
