# Design: Chi tiết khách hàng theo dự án Landing

**Ngày:** 2026-07-04 · **Phạm vi:** chỉ thu thập thông tin (không quản lý sản phẩm/giá/tồn kho/trạng thái đơn/thanh toán).

## Mục tiêu
Trong tab Danh sách của Vitba Landing, mỗi thẻ dự án cho xem nhanh khách đã gửi form về, với "khách mới" nổi bật.

## 1. Dữ liệu & tracking "khách mới"
- Thêm cột `landing_leads.is_read` (bool, default false).
- `GET /mcp/landing/pages` trả thêm mỗi trang: `lead_count` (tổng) và `new_count` (chưa đọc) qua aggregate 1 truy vấn.
- `GET /mcp/landing/pages/{id}/leads` (đã có): sau khi trả danh sách, đánh dấu `is_read=true` cho các lead của trang đó (mở chi tiết = đã xem → badge về 0).

## 2. Thẻ dự án 2 vùng
- Vùng chính (icon + tên + slug + badge cam "● N khách mới" khi `new_count>0`): bấm → mở modal chi tiết khách.
- Hàng nút dưới: "Sửa trang" + "Xóa" (stopPropagation, không mở chi tiết).
- Badge published/draft giữ nguyên.

## 3. Modal chi tiết khách
- Mỗi lead một thẻ: tên nổi bật + thời gian; nút gọi nhanh `tel:` (nếu có phone), gửi mail nhanh `mailto:` (nếu có email); liệt kê mọi field đã điền.
- Nút "Xuất CSV": `GET /mcp/landing/pages/{id}/leads.csv` trả file CSV (UTF-8 BOM để Excel mở đúng tiếng Việt).
- Empty state khi chưa có khách.

## Không làm (YAGNI)
Sản phẩm, giá, tồn kho, trạng thái đơn, thanh toán, tìm kiếm/lọc nâng cao.

## Test
- Aggregate lead_count/new_count đúng; mở leads → is_read set; CSV chứa header + dòng; cách ly theo chủ trang (đã có).
