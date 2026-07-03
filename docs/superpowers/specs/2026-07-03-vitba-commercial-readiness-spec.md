# SPEC: Đánh giá sẵn sàng thương mại hóa — Vitba

**Ngày:** 2026-07-03 · **Phạm vi:** toàn hệ thống (backend FastAPI, frontend Next.js, Railway, SePay, 4 gói free/lite/pro/max)
**Kết luận:** Nền tảng vững (rate-limit, idempotency thanh toán, plan enforcement, legal pages tiếng Việt, healthcheck). **7 mục P0 chặn ra mắt** — ước tính ~1 ngày công sau khi xoay secret.

## P0 — Chặn ra mắt

| # | Vấn đề | Vị trí | Fix | Trạng thái |
|---|---|---|---|---|
| 1 | ~~`backend/.env` đã commit vào git~~ — **XÁC MINH LẠI: SAI.** `git log -- backend/.env` rỗng, file chưa từng được commit và đang được gitignore đúng | `backend/.env` | Không cần làm gì — finding của audit agent là false positive | ✅ đã xác minh an toàn |
| 2 | Key Beeknoee hardcode trong `config.py:63` (còn trong git history) | commits cũ | Chuyển sang env `BEEKNOEE_API_KEY` + thu hồi key phía Beeknoee | ✅ code + env đã chuyển — ⚠️ USER PHẢI ROTATE KEY |
| 3 | Admin mặc định `admin@mktplatform.com`/`Admin@123456` seed tự động | `config.py:27-28`, `main.py` | Fail-fast ở production nếu còn default | ✅ startup guard (2026-07-03) |
| 4 | JWT secret default `change-me` chỉ warning rồi vẫn chạy | `config.py:22` | Fail-fast ở production | ✅ startup guard (2026-07-03) |
| 5 | Webhook SePay không auth nếu cả `sepay_webhook_secret` lẫn `sepay_api_key` rỗng → nâng gói miễn phí giả mạo | `payments.py:156-171` | Fail-fast ở production khi thiếu cả hai | ✅ startup guard (2026-07-03) |
| 6 | Link unsubscribe trong email hẹn giờ là URL **tương đối** → chết trong mail client | `mcp/email/scheduler.py:83-85` | Prepend public API URL | ⬜ TODO |
| 7 | Bulk email không tự chèn unsubscribe (chỉ thay placeholder nếu có) → vi phạm CAN-SPAM/GDPR | `mcp/email/tools.py` | Tự append footer unsubscribe mọi bulk send | ⬜ TODO |

## P1 — Tuần đầu sau ra mắt

1. **Sentry** cho backend + frontend (hiện lỗi prod chỉ nằm trong Railway logs, không alert).
2. **DB pool**: `pool_pre_ping=True, pool_recycle=300` cho Supabase pooler (`core/db.py:17`).
3. **LLM call**: thêm retry + timeout cho nhánh non-deepseek (`llm/factory.py:31-45` — hiện treo vô hạn).
4. **Header `List-Unsubscribe`** cho bulk email (chính sách Gmail/Yahoo 2024+, thiếu là vào spam).
5. **Alembic gãy chuỗi** (~20 heads rời): squash về 1 baseline; tắt `create_all` ở production (`main.py:85-90`).
6. **error.tsx / not-found.tsx** toàn app — hiện lỗi runtime rơi vào trang trắng Next mặc định.
7. **Tiền tệ**: bỏ float trong so sánh amount (`payments.py:220`), dùng int VND; dò `transfer_code` bằng regex thay vì từ đầu tiên (`payments.py:190` — bank hay chèn prefix).
8. **JWT 7 ngày** không revocation → giảm 24h hoặc thêm refresh token.
9. Validate `MCP_ENCRYPTION_KEY`, `RESEND_API_KEY` lúc startup (hiện thiếu RESEND → scheduler email tắt **im lặng**).
10. Terms/Privacy: thay Gmail cá nhân bằng email domain + bổ sung pháp nhân/địa chỉ (bắt buộc trong footer email theo CAN-SPAM).

## P2 — Sau ra mắt

- Cron hạ gói hết hạn (hiện chỉ lazy-downgrade khi đọc + nút admin thủ công) → thêm vào `scheduler_loop`.
- `/health` ping DB thật (`SELECT 1` + timeout) thay vì JSON tĩnh.
- Trang xóa tài khoản tự phục vụ trong Settings (data-deletion hiện chỉ hướng dẫn gửi mail).
- Empty-state + onboarding checklist cho dashboard user mới.
- Lưu sent_count/failed vào ScheduledEmail (hiện fail một phần vẫn đánh dấu "sent").
- Xác nhận backup/PITR trên Supabase dashboard (free tier chỉ 7 ngày).
- QA responsive <380px cho hub.

## Việc USER phải tự làm (không code được)

1. **XOAY NGAY các secret đã lộ trong git**: DeepSeek key, Meta App Secret, Gmail App Password, SePay webhook secret, MCP encryption key (đổi key này cần re-encrypt dữ liệu đã mã hóa), Beeknoee key, và mật khẩu Supabase cũ (lộ từ commit 6ee62e0).
2. Verify domain `vitbaai.xyz` trong Resend + set `RESEND_FROM` (email hệ thống hiện chỉ gửi được cho chủ tài khoản Resend).
3. Submit Meta App Review cho `pages_manage_posts` (hiện chỉ admin/tester của app đăng được Facebook).
4. Quyết định pháp nhân + địa chỉ cho Terms/Privacy/footer email.

## Điểm đã vững (không cần đụng)

Rate-limit auth/payment (slowapi) · idempotency webhook theo `sepay_transaction_id` + unique `transfer_code` · admin router auth toàn cục · plan enforcement lazy đúng · legal pages nội dung thật tiếng Việt · loading states + responsive hub · healthcheck path cả 2 service · CORS không wildcard.
