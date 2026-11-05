# EventFlow AI Sprint 2 Backlog cập nhật

Ngày cập nhật: **05/11/2026**. Đối chiếu với code đến commit [8305ac5](https://github.com/Lamky2006mujoh-commits/EventFlowAI/commit/8305ac5).

Sprint 2 cung cấp tài khoản, phân quyền theo agency và quản lý brief có lịch sử phiên bản. Bản cập nhật ghi nhận các cải tiến xác thực, thông báo lỗi, cấu hình Supabase, bảo vệ phiên, kiểm thử cách ly dữ liệu và hiển thị thay đổi của brief.

**Kết luận:** “Hoàn thành kỹ thuật” nghĩa là đã có code và bằng chứng kiểm thử. Luồng đăng ký qua email chưa đóng toàn bộ vì sự cố gửi email xác nhận còn để lại theo yêu cầu. Chưa có xác nhận nghiệm thu PO trong hồ sơ hiện có.

## Danh sách backlog

| Mã        | Hạng mục                                       | Trạng thái cập nhật                                                   |
| --------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| US-20     | Đăng ký, đăng nhập, đăng xuất và quản lý phiên | Hoàn thành code; chờ xác minh gửi email để đóng toàn bộ luồng đăng ký |
| US-21     | Cách ly dữ liệu và phân quyền theo agency      | Hoàn thành kỹ thuật                                                   |
| US-01     | Tạo và lưu client brief có kiểm tra dữ liệu    | Hoàn thành kỹ thuật                                                   |
| US-02     | Sửa brief và bảo toàn lịch sử phiên bản        | Hoàn thành kỹ thuật                                                   |
| S2-T01    | Hợp đồng dữ liệu, kiểm thử hồi quy và CI       | Hoàn thành kỹ thuật; kết quả CI từ xa cần xem theo từng commit        |
| S2-P1-01  | Quản lý thành viên và vai trò                  | Hoàn thành kỹ thuật                                                   |
| S2-P1-02  | Độ đầy đủ của brief và hỗ trợ giao diện        | Hoàn thành kỹ thuật                                                   |
| S2-BUG-01 | Giới hạn hoặc không gửi được email xác nhận    | Chưa giải quyết; tạm hoãn theo yêu cầu                                |

S2-P1-01, S2-P1-02 và S2-BUG-01 là mã bổ sung của bản cập nhật này. Không bổ sung ước lượng, người phụ trách hoặc phê duyệt khi chưa được xác nhận.

## US-20 Quản lý tài khoản và phiên

**User story:** Là nhân viên agency, tôi muốn đăng nhập bằng tài khoản của mình và kết thúc phiên an toàn để sử dụng đúng workspace được cấp quyền.

**Tiêu chí nghiệm thu cập nhật**

1. Admin và member dùng cùng luồng email/mật khẩu. Vai trò và agency lấy từ membership phía server; người đăng ký không tự chọn quyền admin hoặc agency.
2. Đăng ký kiểm tra tên, email và mật khẩu từ 12 đến 128 ký tự; không tự cấp quyền workspace. Tài khoản phải được xác nhận và được admin thêm vào agency.
3. Sai thông tin đăng nhập không mở workspace. Tài khoản chưa xác nhận email hoặc chưa có membership nhận thông báo phù hợp.
4. Khôi phục phiên còn hiệu lực; đóng giao diện bảo vệ khi hết phiên hoặc đăng xuất. Phản hồi đang chạy không được mở lại dữ liệu sau logout.
5. Nếu logout thất bại, hiển thị lỗi thay vì báo thành công. Luồng hiện tại đăng xuất phiên của trình duyệt đang dùng.
6. Phân biệt lỗi giới hạn gửi email/yêu cầu, email chưa xác nhận, địa chỉ không được dịch vụ email cho phép, provider bị tắt, mật khẩu yếu, kết nối và cấu hình URL/key.
7. Đăng ký thất bại giữ mật khẩu trong bộ nhớ form để người dùng sửa hoặc thử lại sau khi nguyên nhân được xử lý; không ghi mật khẩu hoặc hiển thị lỗi thô của provider.
8. Cấu hình live không hợp lệ phải báo lỗi, không tự chuyển sang demo. Hỗ trợ publishable key và alias anon key cũ; URL/key phải cùng project.

**Đã cải tiến:** ánh xạ mã lỗi Auth thành hướng dẫn cụ thể; thêm kiểm tra cấu hình chỉ đọc bằng npm run check:auth; chặn phản hồi muộn sau logout; phân biệt mất phiên và mất membership.

**Còn chờ:** nghiệm thu đăng ký → nhận email → xác nhận → cấp membership → đăng nhập. Tài khoản review tạo sẵn không chứng minh gửi email đã hoạt động.

## US-21 Cách ly dữ liệu và phân quyền agency

**User story:** Là thành viên agency, tôi chỉ truy cập dữ liệu của agency mình và thực hiện thao tác đúng vai trò.

**Tiêu chí nghiệm thu cập nhật**

1. Backend xác minh Supabase Auth và membership trước khi đọc/ghi. Không tin agency hoặc role client gửi lên.
2. RLS/RPC chặn truy cập brief, membership và lịch sử của agency khác, kể cả gọi API/RPC trực tiếp.
3. Member được tạo, xem, sửa brief cùng agency. Chỉ admin quản lý membership/vai trò và xóa brief; xóa phải có xác nhận giao diện.
4. Không tự nâng quyền, quản lý thành viên agency khác hoặc xóa/hạ quyền admin cuối cùng.
5. Thu hồi membership làm mất quyền ở yêu cầu tiếp theo; không xóa tài khoản Auth khi chỉ gỡ membership.
6. Anonymous, token thiếu/sai/hết hạn và ghi trực tiếp vào bảng được bảo vệ đều bị từ chối theo quyền server.
7. Frontend không chứa service-role key/server secret; thông tin đăng nhập kiểm thử và môi trường riêng bị Git bỏ qua.

**Bằng chứng:** kiểm thử PostgreSQL với RLS/RPC; bộ SQL security đã chạy trên Supabase thật ngày 04/11/2026 với fixture rollback; collection Postman cho hai agency.

## US-01 Tạo và lưu client brief

**User story:** Là người lập kế hoạch, tôi muốn lưu thông tin sự kiện thành brief có mã định danh để nhóm cùng sử dụng.

**Tiêu chí nghiệm thu cập nhật**

1. Bắt buộc có tên sự kiện, khách hàng, loại sự kiện, ngày hợp lệ, địa điểm/khu vực, số khách, ngân sách và mục tiêu.
2. Tên sự kiện 3–160 ký tự; khách hàng 2–160; địa điểm 2–300; mục tiêu 10–5.000. Loại sự kiện thuộc danh sách hỗ trợ.
3. Số khách nguyên từ 1 đến 100.000; ngân sách hữu hạn, lớn hơn 0, tối đa 1.000.000.000.000 VND. Code hiện tại kiểm tra ngày hợp lệ, không bắt buộc ngày tương lai.
4. Audience/constraints được để trống nhưng có giới hạn độ dài và gợi ý bổ sung thông tin.
5. Lưu thành công trả brief ID, đúng agency/tác giả. Dữ liệu không hợp lệ hoặc lỗi lưu không được báo thành công hay tạo lịch sử giả.
6. Địa điểm có thể là venue, thành phố, vùng hoặc quốc gia; chức năng tìm địa điểm từ trường này thuộc Sprint 3.

**Bằng chứng:** Zod contracts dùng chung frontend/backend; kiểm thử dữ liệu, ngày, giới hạn khách/ngân sách, lỗi lưu và quyền truy cập.

## US-02 Chỉnh sửa và lịch sử brief

**User story:** Là thành viên agency, tôi muốn cập nhật brief và xem các bản trước để truy vết quyết định của nhóm.

**Tiêu chí nghiệm thu cập nhật**

1. Mỗi lần lưu cập nhật tạo snapshot mới có phiên bản, tác giả và thời gian; không ghi đè bản cũ.
2. Thành viên cùng agency có thể sửa theo quyền. Server xác định tác giả, không nhận tác giả giả từ client.
3. Bảng thay đổi hiển thị giá trị trước/sau của trường đã sửa; bản đầu ghi nhận tạo mới.
4. Yêu cầu dùng version cũ bị từ chối nếu đã có người lưu mới; phải tải lại trước khi lưu tiếp.
5. Brief thay đổi đánh dấu đầu ra phụ thuộc cần rà soát. Readiness luôn đánh giá bản hiện tại, kể cả khi xem lịch sử.
6. Chỉ admin được xóa brief cùng lịch sử sau xác nhận; không ảnh hưởng brief khác.

**Bằng chứng:** kiểm thử snapshot, tác giả/thời gian, thay đổi trước/sau, sửa cùng agency, xung đột và quyền xóa.

## S2-T01 Hợp đồng dữ liệu và kiểm thử

Đã dùng chung Zod cho request/data/response; bổ sung unit/integration test, PostgreSQL với migration thật, SQL security, Postman và GitHub Actions cho test, lint, kiểm tra kiểu, build và Chromium E2E.

| Thời điểm  | Kiểm tra                       | Kết quả và giới hạn                                                                   |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| 05/11/2026 | Xác thực và xử lý lỗi          | 14/14 đạt; không gửi email                                                            |
| 05/11/2026 | Hồi quy brief Sprint 2         | 11/11 đạt                                                                             |
| 05/11/2026 | PostgreSQL tích hợp            | 4/4 đạt; gồm security Sprint 2 và hồi quy Sprint 3 trên toàn bộ migration             |
| 04/11/2026 | Toàn bộ unit/integration       | 51/51 đạt; tổng dự án, không phải 51 ca riêng Sprint 2                                |
| 04/11/2026 | Trình duyệt                    | 8/8 demo E2E và 1/1 live E2E đạt; chủ yếu luồng Sprint 3, không thay nghiệm thu email |
| 04/11/2026 | Anonymous và SQL security live | 10/10 anonymous checks và SQL security đạt theo báo cáo đã lưu                        |

Lệnh chạy nhóm hồi quy ngày 05/11/2026:

```powershell
node --test tests/auth.test.mjs tests/sprint2.test.mjs tests/database.test.mjs
```

npm run check:auth không tạo tài khoản, không gửi email và không chứng minh thư đã đến hộp thư. Có cấu hình CI không đồng nghĩa mọi lần chạy từ xa đều thành công.

## Các hạng mục bổ sung P1

**S2-P1-01 Quản lý thành viên:** admin thêm tài khoản đã xác nhận, chưa thuộc agency khác; thành viên mới bắt đầu với quyền member, nâng quyền là thao tác riêng. Hỗ trợ đổi vai trò/gỡ membership, giữ ít nhất một admin. Chuyển agency, email invitation và khôi phục mật khẩu chưa thuộc increment này.

**S2-P1-02 Hỗ trợ người dùng:** readiness theo độ đầy đủ, gợi ý audience/constraints còn thiếu, xem thay đổi phiên bản và bố cục màn hình nhỏ. “Ready for planning” không khẳng định sự kiện khả thi hoặc được phê duyệt.

## S2-BUG-01 Email xác nhận còn mở

**Hiện tượng:** có thể gặp over_email_send_rate_limit, HTTP 429 hoặc giới hạn địa chỉ gửi của dịch vụ. Các máy dùng cùng Supabase project cùng chịu giới hạn; clone Git không tạo dịch vụ Auth riêng.

**Đã làm:** phân biệt mã lỗi, hướng dẫn xử lý, giữ dữ liệu form khi lỗi, không tự gửi lại email; bổ sung tài liệu và kiểm tra kết nối.

**Chưa giải quyết:** khả năng gửi thư của provider, nhận thư thật và xác nhận email trọn luồng. Không thay đổi SMTP, quota hoặc tắt xác nhận email để coi lỗi đã hết. Giữ tạm hoãn theo yêu cầu người dùng.

**Điều kiện đóng:** phối hợp một lượt thử với tài khoản thống nhất; ghi project, thời điểm, phản hồi provider, thời điểm nhận thư và kết quả xác nhận/đăng nhập. Không đăng ký hoặc resend liên tục. Sau nghiệm thu, cập nhật S2-BUG-01 và phần còn chờ của US-20.

## Ranh giới Sprint 3 và tham chiếu

Concept, lựa chọn concept, proposal, xuất TXT, ngân sách chi tiết và tìm/chọn địa điểm có giá/điều kiện thuộc Sprint 3. Quota Gemini không phải lỗi email Auth Sprint 2.

- [Mã nguồn](https://github.com/Lamky2006mujoh-commits/EventFlowAI)
- [Hướng dẫn Supabase và xử lý đăng ký](SUPABASE_SETUP.md)
- [Báo cáo triển khai và kiểm thử đã lưu](SPRINT3_TEST_REPORT.md)
- [Kết quả phần ngân sách và địa điểm](BUDGET_VENUES_TEST_REPORT.md)
- Kiểm thử: tests/auth.test.mjs, tests/sprint2.test.mjs, tests/database.test.mjs và tests/database-security.sql.
- API cách ly agency: api-tests/postman/sprint2-agency-isolation.postman_collection.json.
