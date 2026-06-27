---
title: "User Feedback System"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - feedback
  - product
---

# User Feedback System

## Vấn đề hiện tại

Vitba có Reviewer score nhưng chưa có explicit user feedback. AI tự chấm không thay thế được đánh giá thật từ user.

## UI cần thêm

Mỗi output card:

```text
👍 Hữu ích
👎 Chưa tốt
[Textbox] Bạn muốn sửa gì?
Quick tags: sai giọng, quá dài, thiếu CTA, sai info, format lỗi
```

## API

```http
POST /feedback
```

```json
{
  "target_type": "generation_job",
  "target_id": "uuid",
  "rating": "up|down|neutral",
  "reason": "Nội dung chưa đúng giọng thương hiệu",
  "correction": "Viết gần gũi hơn và ngắn hơn",
  "tags": ["brand_voice", "too_long"]
}
```

## Data usage

- Admin analytics.
- Prompt improvement.
- Eval set creation.
- Product roadmap.
- Không auto fine-tune giai đoạn đầu.

## Backlinks

- [[Evaluation_and_Feedback_Loop]]
- [[Admin_Analytics]]
- [[PostgreSQL_Models]]
