# KẾ HOẠCH KIỂM THỬ - NÔNG SẢN XANH

| Thuộc tính | Nội dung |
|---|---|
| Sản phẩm | Website Nông Sản Xanh |
| Loại kiểm thử | Alpha Test |
| Phiên bản | 1.0 |
| Ngày lập | 16/07/2026 |
| Hạn hoàn thành | 30/08/2026 |
| Trạng thái | Chờ phê duyệt |

## 1. Tóm tắt

Nông Sản Xanh là website thương mại điện tử sử dụng Express, Sequelize, MySQL và AdminJS. Hệ thống gồm giao diện khách hàng, API backend và trang quản trị.

Đợt kiểm thử nhằm đánh giá chất lượng, độ ổn định, bảo mật cơ bản, hiệu năng và khả năng tương thích của hệ thống trước khi bàn giao hoặc phát hành.

Mục tiêu chính:

- Thực thi tối thiểu 80% tổng số test case được duyệt trước ngày 30/08/2026.
- Thực thi 100% test case Critical.
- Không còn lỗi Critical hoặc Major chưa được xử lý khi kết thúc kiểm thử.

## 2. Phạm vi

### 2.1. Trong phạm vi

| Nhóm | Chức năng |
|---|---|
| Xác thực | Đăng ký, đăng nhập, đăng xuất và quản lý phiên |
| Tài khoản | Hồ sơ cá nhân và địa chỉ giao hàng |
| Sản phẩm | Danh sách, chi tiết, tìm kiếm, lọc và phân trang |
| Nội dung | Danh mục, thương hiệu, banner, tin tức và khuyến mãi |
| Thương mại | Giỏ hàng, mã giảm giá, thanh toán và đơn hàng |
| Tương tác | Bình luận và đánh giá sản phẩm |
| Quản trị | Quản lý người dùng, sản phẩm và nội dung bằng AdminJS |
| Tồn kho | Lô hàng, số lượng tồn và giao dịch kho |
| API | Chức năng, hợp đồng dữ liệu, validation và phân quyền |
| Phi chức năng | Giao diện, bảo mật cơ bản, hiệu năng và tương thích trình duyệt |

Chi tiết các nội dung cần kiểm tra được quản lý trong [TEST_SCENARIOS.md](./TEST_SCENARIOS.md).

### 2.2. Ngoài phạm vi

- Penetration test chuyên sâu.
- Kiểm thử trên Safari và thiết bị Apple thật khi chưa có thiết bị.
- Kiểm thử giao dịch tài chính thật.
- Kiểm thử production hoặc sử dụng dữ liệu khách hàng thật.
- Chức năng chưa được triển khai hoặc chưa có yêu cầu được phê duyệt.

## 3. Phương pháp kiểm thử

Áp dụng kiểm thử dựa trên rủi ro. Các chức năng ảnh hưởng trực tiếp đến tài khoản, tiền, đơn hàng, quyền truy cập và tồn kho được ưu tiên cao nhất.

| Loại kiểm thử | Phương pháp | Công cụ dự kiến |
|---|---|---|
| Chức năng | Manual và automation | Playwright |
| API | Manual và automation | Playwright, Postman|
| Giao diện | Chủ yếu manual | Trình duyệt và DevTools |
| Bảo mật cơ bản | Manual và automation chọn lọc | DevTools, công cụ API |
| Hiệu năng | Automation | JMeter |
| Tương thích | Manual và automation | Playwright |
| Khám phá | Manual | Checklist và session notes |
| Hồi quy | Ưu tiên automation | Playwright |

Kỹ thuật thiết kế test case:

- Phân vùng tương đương.
- Phân tích giá trị biên.
- Bảng quyết định.
- Chuyển trạng thái.
- Kiểm thử positive và negative.
- Kiểm thử phân quyền theo vai trò.
- Error guessing và exploratory testing.

## 4. Chiến lược tự động hóa

Automation tập trung vào các luồng ổn định, quan trọng và được thực hiện lặp lại.

| Bộ kiểm thử | Mục tiêu tự động hóa | Cách thực hiện |
|---|---:|---|
| Smoke test | 100% | Chạy trên mỗi build đủ điều kiện |
| API regression | Tối thiểu 80% endpoint ổn định | Chạy trên Chromium/API context |
| Critical regression | Tối thiểu 80% test case phù hợp | Chạy trước khi phát hành |
| Cross-browser regression | Các luồng Critical | Chromium, Firefox và WebKit |
| Exploratory testing | 0% | Thực hiện thủ công |
| Kiểm tra giao diện chi tiết | Tự động hóa chọn lọc | Kết hợp assertion và manual review |
| Hiệu năng | 100% kịch bản tải đã xác định | Chạy theo lịch hoặc trước phát hành |

Ưu tiên tự động hóa:

1. Đăng nhập và phân quyền.
2. Danh sách và chi tiết sản phẩm.
3. API quan trọng.
4. Giỏ hàng và thanh toán khi backend ổn định.
5. Quản trị sản phẩm và tồn kho.

Không tự động hóa ngay chức năng thường xuyên thay đổi hoặc phụ thuộc dịch vụ bên thứ ba chưa ổn định.

## 5. Mức ưu tiên

| Mức | Ý nghĩa | Ví dụ |
|---|---|---|
| Critical | Lỗi có thể chặn phát hành hoặc gây sai dữ liệu quan trọng | Đăng nhập, thanh toán, đơn hàng, tồn kho, phân quyền |
| High | Chức năng quan trọng đối với phần lớn người dùng | Sản phẩm, tìm kiếm, giỏ hàng, quản trị sản phẩm |
| Medium | Ảnh hưởng một phần trải nghiệm hoặc có cách thay thế | Hồ sơ, địa chỉ, bình luận và nội dung |
| Low | Ảnh hưởng nhỏ, không làm gián đoạn nghiệp vụ | Chính tả và căn chỉnh giao diện nhỏ |

## 6. Phụ thuộc

| Chức năng | Phụ thuộc |
|---|---|
| Hồ sơ và địa chỉ | Đăng nhập, session và cơ sở dữ liệu người dùng |
| Bình luận | Đăng nhập, người dùng và sản phẩm |
| Giỏ hàng | Sản phẩm, giá và tồn kho |
| Thanh toán | Đăng nhập, giỏ hàng, địa chỉ, tồn kho và mã giảm giá |
| Đơn hàng | Thanh toán, người dùng, sản phẩm và tồn kho |
| Mã giảm giá | Giỏ hàng, quy tắc khuyến mãi và thời gian hệ thống |
| Quản lý sản phẩm | Đăng nhập admin, danh mục và thương hiệu |
| Quản lý tồn kho | Sản phẩm, lô hàng và cơ sở dữ liệu |
| Thanh toán trực tuyến | Đơn hàng và payment gateway sandbox |
| Tải ảnh | Cloudinary và kết nối mạng |

Nếu một phụ thuộc bị lỗi, test case liên quan được đánh dấu `Blocked` và không tính là `Failed` trừ khi chính phụ thuộc đó là đối tượng đang được kiểm thử.

## 7. Giả định

- Database đã được tạo và migration chạy thành công.
- Có môi trường test tách biệt với production.
- Product Owner hoặc developer có thể xác nhận yêu cầu chưa rõ.
- Có ít nhất một tài khoản admin và hai tài khoản khách hàng.
- Có dữ liệu sản phẩm, lô hàng và mã giảm giá phục vụ kiểm thử.
- API specification và hành vi đã thống nhất phản ánh phiên bản đang kiểm thử.
- Developer cung cấp build ổn định và hỗ trợ xử lý lỗi chặn.
- Lỗi Critical được phản hồi ngay; lỗi Major được phản hồi trong vòng một ngày làm việc.
- Payment gateway sandbox và Cloudinary test hoạt động khi các chức năng liên quan nằm trong phạm vi.
- Ngày 30/08 được hiểu là ngày 30/08/2026.

Nếu một giả định không còn đúng, Test Plan, lịch trình và phạm vi phải được đánh giá lại.

## 8. Môi trường kiểm thử

| Thành phần | Cấu hình |
|---|---|
| Hệ điều hành chính | Windows 10 trở lên |
| Runtime | Node.js 20 trở lên |
| Cơ sở dữ liệu | MySQL |
| URL ứng dụng | `http://127.0.0.1:3000` |
| URL quản trị | `http://127.0.0.1:3000/admin` |
| Trình duyệt chính | Chrome và Edge mới nhất |
| Trình duyệt bổ sung | Firefox và Playwright WebKit |
| Desktop | 1920 x 1080 và 1366 x 768 |
| Tablet giả lập | 768 x 1024 |
| Mobile giả lập | 390 x 844 hoặc tương đương |

Dữ liệu test không được chứa thông tin cá nhân hoặc thông tin thanh toán thật.

## 9. Dữ liệu kiểm thử

Cần chuẩn bị:

- Một tài khoản quản trị viên.
- Hai tài khoản khách hàng để kiểm tra quyền sở hữu dữ liệu.
- Sản phẩm còn hàng, hết hàng và có giá khuyến mãi.
- Sản phẩm thuộc nhiều danh mục và thương hiệu.
- Sản phẩm có một hoặc nhiều lô hàng.
- Mã giảm giá ở các trạng thái nghiệp vụ khác nhau.
- Đơn hàng ở các trạng thái khác nhau.
- Dữ liệu tiếng Việt, ký tự đặc biệt và dữ liệu biên.

Dữ liệu phải có khả năng khôi phục hoặc tạo lại sau mỗi chu kỳ kiểm thử.

## 10. Lịch trình

| Thời gian | Giai đoạn | Kết quả mong đợi |
|---|---|---|
| 16/07-20/07 | Phân tích và lập kế hoạch | Test Plan và danh sách câu hỏi |
| 21/07-27/07 | Thiết lập môi trường và dữ liệu | Môi trường sẵn sàng |
| 28/07-03/08 | Xác thực, tài khoản và phân quyền | Kết quả vòng 1 |
| 04/08-10/08 | Sản phẩm và nội dung | Kết quả vòng 2 |
| 11/08-17/08 | Giỏ hàng, thanh toán và bình luận | Kết quả vòng 3 |
| 18/08-24/08 | AdminJS, API, bảo mật và tồn kho | Kết quả vòng 4 |
| 25/08-29/08 | Hiệu năng, đa trình duyệt và hồi quy | Kết quả regression |
| 30/08 | Tổng kết | Báo cáo kiểm thử cuối kỳ |

Lịch trình được đánh giá lại khi phạm vi, phụ thuộc hoặc giả định thay đổi.

## 11. Tiêu chí bắt đầu

- Build có thể khởi động.
- MySQL kết nối được và migration hoàn tất.
- UI, API và AdminJS có thể truy cập.
- Chức năng cần kiểm thử đã được bàn giao.
- Yêu cầu hoặc kết quả mong đợi có thể xác định.
- Tài khoản và dữ liệu test đã sẵn sàng.
- Không có blocker khiến toàn bộ hệ thống không thể kiểm thử.

## 12. Tiêu chí tạm dừng và tiếp tục

Kiểm thử có thể tạm dừng khi:

- Build không thể khởi động.
- Database hoặc dịch vụ thiết yếu không hoạt động.
- Dữ liệu test bị hỏng và không thể khôi phục.
- Luồng Critical bị chặn hoàn toàn.
- Yêu cầu thay đổi lớn khiến test case không còn hợp lệ.

Kiểm thử tiếp tục khi blocker đã được xử lý, môi trường ổn định và phạm vi/test case đã được cập nhật nếu cần.

## 13. Tiêu chí kết thúc

- Tối thiểu 80% tổng số test case được duyệt đã được thực thi.
- 100% test case Critical đã được thực thi.
- Không còn lỗi Critical hoặc Major chưa được xử lý.
- Lỗi Minor và Trivial còn lại đã được đánh giá và chấp nhận.
- Lỗi đã sửa được retest.
- Các luồng Critical đã được regression test.
- Báo cáo kiểm thử cuối kỳ đã được hoàn thành.

## 14. Quy trình xử lý lỗi

```text
New
  |
  v
Assigned
  |
  v
In Progress
  |
  v
Fixed
  |
  v
Retest ---------> Reopened
  |                  |
  v                  |
Closed <-------------+
```

Các nhánh bổ sung:

- `New -> Rejected`: Không phải lỗi hoặc hành vi đúng yêu cầu.
- `New -> Duplicate`: Trùng với lỗi đã có.
- `New -> Need More Info`: Thiếu bước tái hiện hoặc bằng chứng.
- `Assigned -> Deferred`: Được chấp nhận sửa ở phiên bản sau.
- `Retest -> Cannot Reproduce`: Không thể tái hiện trên môi trường được chỉ định.

Trách nhiệm:

| Trạng thái | Người chịu trách nhiệm chính |
|---|---|
| New | Tester |
| Assigned/In Progress | Developer |
| Fixed | Developer |
| Retest/Reopened/Closed | Tester |
| Rejected/Deferred | Product Owner hoặc QA Lead |

## 15. Phân loại lỗi

| Severity | Định nghĩa |
|---|---|
| Critical | Hệ thống không sử dụng được, mất/sai dữ liệu, lỗi bảo mật nghiêm trọng hoặc sai tiền/tồn kho |
| Major | Chức năng quan trọng không hoạt động và không có cách thay thế phù hợp |
| Minor | Một phần chức năng bị ảnh hưởng nhưng có cách thay thế |
| Trivial | Lỗi nội dung hoặc hiển thị nhỏ, không ảnh hưởng nghiệp vụ |

Một báo cáo lỗi tối thiểu gồm mã lỗi, tiêu đề, môi trường, điều kiện trước, bước tái hiện, kết quả thực tế, kết quả mong đợi, severity và bằng chứng.

## 16. Chỉ số chất lượng

| Chỉ số | Công thức |
|---|---|
| Execution Progress | `(Passed + Failed + Blocked) / Tổng test case x 100%` |
| Pass Rate | `Passed / (Passed + Failed) x 100%` |
| Defect Density | `Tổng lỗi hợp lệ / Số module hoặc test case đã thực thi` |
| Defect Reopen Rate | `Số lỗi Reopened / Số lỗi đã Retest x 100%` |
| Automation Coverage | `Số test case phù hợp đã tự động hóa / Tổng test case phù hợp tự động hóa x 100%` |
| Requirement Coverage | `Số yêu cầu có test case / Tổng yêu cầu trong phạm vi x 100%` |
| Defect Leakage | `Lỗi phát hiện sau phát hành / Tổng lỗi trước và sau phát hành x 100%` |
| Critical Defect Count | Số lỗi Critical đang mở |

Mục tiêu ban đầu:

- Execution Progress >= 80%.
- Critical execution = 100%.
- Critical Defect Count = 0 tại thời điểm kết thúc.
- Smoke automation coverage = 100%.
- Critical regression automation coverage >= 80% đối với test case phù hợp.

Defect Leakage chỉ được tính sau khi có phiên bản phát hành.

## 17. Báo cáo

- Cập nhật tiến độ và blocker hằng ngày trong giai đoạn thực thi.
- Báo cáo lỗi ngay khi phát hiện lỗi Critical hoặc Major.
- Báo cáo tổng hợp sau mỗi vòng kiểm thử.
- Báo cáo cuối kỳ gồm phạm vi đã kiểm tra, metrics, lỗi mở, rủi ro và đề xuất phát hành.

## 18. Sản phẩm bàn giao

- `TEST_PLAN.md`.
- `TEST_SCENARIOS.md`.
- Bộ test case chi tiết.
- Dữ liệu kiểm thử.
- Source code Playwright.
- Báo cáo lỗi.
- Báo cáo API và hiệu năng.
- Báo cáo kiểm thử cuối kỳ.

## 19. Rủi ro

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Yêu cầu chưa rõ hoặc thay đổi | Test case phải sửa hoặc làm lại | Xác nhận sớm và quản lý phiên bản |
| Một tester mới thực hiện toàn bộ | Không đủ thời gian kiểm tra mọi trường hợp | Ưu tiên theo rủi ro và Critical trước |
| Giỏ hàng/thanh toán chưa hoàn chỉnh | Luồng mua hàng bị Blocked | Xác nhận dependency và kiểm thử phần sẵn sàng |
| Môi trường không ổn định | Kết quả không tin cậy | Checklist môi trường và quy trình khôi phục |
| Thiếu dữ liệu test | Thiếu độ bao phủ | Chuẩn bị dữ liệu chuẩn hoặc seed script |
| Cloudinary/payment sandbox lỗi | Không kiểm tra được tích hợp | Mock hoặc tách kiểm thử tích hợp |
| Thiếu Safari và thiết bị thật | Giới hạn kiểm thử tương thích | Dùng WebKit và ghi rõ giới hạn |
| Tự động hóa chức năng chưa ổn định | Chi phí bảo trì cao | Chỉ tự động hóa khi luồng ổn định |

## 20. Phê duyệt

| Vai trò | Họ tên | Trạng thái | Ngày |
|---|---|---|---|
| Người lập Test Plan |  | Chờ xác nhận |  |
| Product Owner |  | Chờ xác nhận |  |
| Technical Lead |  | Chờ xác nhận |  |
| QA Lead |  | Chờ xác nhận |  |
