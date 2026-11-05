# Báo cáo hoàn thiện và kiểm thử Sprint 3

> Historical report from 4 November. For the current checkout, project and
> acceptance boundaries, see [5 November execution evidence](SPRINT3_EXECUTION_REPORT.md).

Ngày kiểm tra: **04/11/2026**. Dự án: EventFlow AI.

## Kết quả triển khai

Đã hoàn thiện code và triển khai backend thật lên project Supabase mới **epmgcyiuloxtblzdrwsw**, theo lựa chọn của người dùng. Frontend cục bộ đã chuyển sang project mới và đang chạy tại **http://localhost:5173/**.

- Áp dụng đầy đủ 5 migration Sprint 2–3; lịch sử migration đã được ghi nhận.
- Deploy hai Edge Function **workspace** và **planning**.
- Lưu Gemini key trong Edge Function secrets; model cấu hình là **gemini-3.5-flash**.
- Hai function xác minh bearer token bằng Supabase Auth getUser. Dữ liệu tiếp tục được bảo vệ bằng membership, RLS và RPC có kiểm tra quyền.
- Hoàn thành luồng thật: đăng nhập → lưu brief → tạo concept bằng Gemini → chọn concept → tạo proposal → sửa/lưu phiên bản → xuất file → tải lại → đăng xuất.

[Dashboard project](https://supabase.com/dashboard/project/epmgcyiuloxtblzdrwsw/functions) · [Yêu cầu Sprint 2–3](https://docs.google.com/document/d/1irYp_DkbgPj6lJ2FU0WXk0ySDDemt37Oig_87RbJ9dc/edit)

## Phạm vi hoàn thành

| Hạng mục   | Kết quả                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-04      | Tạo 2–3 concept qua Gemini thật trong Supabase Edge Function; kiểm tra JSON bằng Zod, timeout/retry và lỗi có kiểm soát                                 |
| US-05      | So sánh theme, activities, assumptions; chọn và lưu concept                                                                                             |
| US-06      | Tạo/sửa 6 phần proposal; giữ lịch sử tác giả/thời gian; xác nhận trước khi tạo lại; chặn ghi phiên bản cũ; cảnh báo rời trang khi có chỉnh sửa chưa lưu |
| S3-T01     | Kiểm thử cục bộ và live, lỗi API/JSON, RLS giữa agency, thu hồi membership và bí mật máy chủ                                                            |
| US-07 (P1) | Xuất TXT từ phiên bản đã lưu mới nhất; có title, content, version, status, tác giả và nguồn brief; lỗi xuất không đổi trạng thái                        |

Proposal mới hoặc chỉnh sửa có trạng thái **Draft**. Sprint 3 không bổ sung quy trình phê duyệt.

## Kết quả kiểm thử

| Kiểm tra                                       | Kết quả                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| npm test                                       | **42/42 đạt**, gồm hồi quy Sprint 2, Sprint 3 và PostgreSQL/HTTP integration                          |
| npm run test:e2e                               | **5/5 đạt** trên Chromium; gồm mobile, nội dung Gemini thật và bảo vệ chỉnh sửa chưa lưu              |
| Kiểm thử backend live                          | **12/12 kiểm tra đạt** trên project mới, sử dụng Gemini thật                                          |
| npm run test:e2e:live                          | **1/1 đạt**: đăng nhập thật, sửa/lưu proposal, đọc file tải xuống, reload và logout                   |
| tests/live-anonymous.mjs                       | **10/10 kiểm tra đạt** trên project mới                                                               |
| tests/database-security.sql trên Supabase thật | **PASS**: cách ly agency, lịch sử, phân quyền, thu hồi membership và anonymous; fixture được rollback |
| npm run verify:edge                            | Đạt: bundle hai function và xác minh bootstrap nguyên tử, 5 migration và RLS trên PostgreSQL          |
| npm run check:functions                        | Đạt                                                                                                   |
| npm run lint                                   | Đạt, **0 lỗi, 0 cảnh báo**                                                                            |
| npm run build                                  | Đạt; còn cảnh báo kích thước bundle khoảng 591 kB trước gzip                                          |

Kiểm thử backend live xác nhận: không ghi đè bản sửa thủ công khi chưa xác nhận; không chấp nhận revision cũ; agency khác không đọc/ghi được brief hoặc planning; membership bị xóa mất quyền ngay ở yêu cầu tiếp theo. Proposal hiện còn lưu đầy đủ các phiên bản **v1–v4** sau kiểm thử trình duyệt.

## Lỗi phát hiện và đã sửa

- Model Gemini 2.5 Flash không còn phục vụ tài khoản mới; đã xác minh model đang hoạt động và cấu hình lại phía server.
- Lần gọi AI ban đầu trong Edge Function chạm giới hạn 30 giây mỗi lần thử. Đã điều chỉnh thành tối đa **2 lần × 60 giây**, giảm mức suy luận phù hợp model và yêu cầu đầu ra ngắn gọn. Kiểm thử live sau bản sửa đã đạt toàn bộ luồng.
- Bổ sung log chỉ chứa loại lỗi, lần thử và HTTP status; không ghi key, prompt hoặc nội dung khách hàng.
- Sửa tràn ngang mobile do dropdown lịch sử; bố cục hỗ trợ cả 2 và 3 concept.
- Bổ sung cảnh báo khi rời trang/đóng tab có proposal chưa lưu.

## Dữ liệu và tài khoản bàn giao

Giữ lại một agency, một tài khoản quản trị kiểm thử và một brief/proposal mẫu tạo bằng Gemini thật để người dùng mở xem. Email/mật khẩu của tài khoản xem thử ở **.env.acceptance.local** trên máy; file này bị Git bỏ qua. Tài khoản dùng miền mẫu, không gửi email đăng ký/xác nhận.

Các tài khoản/agency tạm dùng cho kiểm thử cách ly và brief kiểm thử thất bại đã được dọn. Server key phục vụ kiểm thử chỉ giữ trong bộ nhớ của phiên làm việc; không được ghi vào repository hoặc frontend.

Theo yêu cầu người dùng, **giữ nguyên sự cố email rate limit**, không thay đổi cấu hình gửi email và không đánh dấu vấn đề đã giải quyết. Chưa có nghiệm thu PO; các kết quả ở trên là bằng chứng kỹ thuật.

## Bằng chứng

- [Kết quả Gemini thật](previews/sprint3-live-gemini.json)
- [12 kiểm tra backend live](previews/sprint3-live-supabase.json)
- [Trạng thái lưu sau E2E live](previews/sprint3-live-ui.json)
- [Giao diện live tổng quan](previews/sprint3-live-overview.png)
- [Giao diện proposal live đầy đủ](previews/sprint3-live-workspace.png)
- [Hai Edge Function đã deploy](previews/sprint3-supabase-functions.jpg)
- [SQL security trên Supabase thật](previews/sprint3-supabase-security.jpg)

Xem [hướng dẫn cấu hình và chạy lại](SPRINT3_SETUP.md).
