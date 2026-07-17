# TEST SCENARIOS - NÔNG SẢN XANH

Tài liệu này mô tả những nội dung cụ thể cần kiểm tra. Các bước, dữ liệu và kết quả mong đợi chi tiết được quản lý trong `TEST_CASES.md` hoặc công cụ quản lý test case.

## Quy ước

| Mức | Ý nghĩa |
|---|---|
| Critical | Luồng cốt lõi hoặc rủi ro cao, có thể chặn phát hành |
| High | Chức năng quan trọng đối với phần lớn người dùng |
| Medium | Chức năng hỗ trợ hoặc có cách thay thế |
| Low | Ảnh hưởng nhỏ |

## 1. Xác thực

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-AUTH-001 | Kiểm tra đăng ký tài khoản | Functional, API, Security | Critical |
| TS-AUTH-002 | Kiểm tra đăng nhập | Functional, API, Security | Critical |
| TS-AUTH-003 | Kiểm tra đăng xuất và hủy session | Functional, API, Security | Critical |
| TS-AUTH-004 | Kiểm tra lấy thông tin người dùng hiện tại | API, Security | High |
| TS-AUTH-005 | Kiểm tra truy cập khi chưa đăng nhập | Security, Authorization | Critical |
| TS-AUTH-006 | Kiểm tra trạng thái và quyền của tài khoản | Functional, Security | Critical |

## 2. Hồ sơ và địa chỉ

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-ACC-001 | Kiểm tra xem và cập nhật hồ sơ | Functional, API | High |
| TS-ACC-002 | Kiểm tra danh sách địa chỉ | Functional, API | High |
| TS-ACC-003 | Kiểm tra thêm địa chỉ | Functional, API, Validation | High |
| TS-ACC-004 | Kiểm tra xóa địa chỉ | Functional, API | High |
| TS-ACC-005 | Kiểm tra quyền sở hữu địa chỉ | Security, Authorization | Critical |

## 3. Sản phẩm

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-PRD-001 | Kiểm tra danh sách sản phẩm | Functional, API, UI | Critical |
| TS-PRD-002 | Kiểm tra chi tiết sản phẩm | Functional, API, UI | Critical |
| TS-PRD-003 | Kiểm tra tìm kiếm sản phẩm | Functional, API | High |
| TS-PRD-004 | Kiểm tra lọc và phân trang | Functional, API | High |
| TS-PRD-005 | Kiểm tra giá, giá cũ và trạng thái sản phẩm | Functional, Data | High |
| TS-PRD-006 | Kiểm tra sản phẩm hết hàng hoặc không tồn tại | Functional, API, UI | High |
| TS-PRD-007 | Kiểm tra hình ảnh và thông tin liên quan | UI, Integration | Medium |

## 4. Nội dung

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-CMS-001 | Kiểm tra danh mục | Functional, API, UI | Medium |
| TS-CMS-002 | Kiểm tra thương hiệu/nhà cung cấp | Functional, API, UI | Medium |
| TS-CMS-003 | Kiểm tra banner và thứ tự hiển thị | Functional, API, UI | Medium |
| TS-CMS-004 | Kiểm tra danh sách và chi tiết tin tức | Functional, API, UI | Medium |
| TS-CMS-005 | Kiểm tra làm sạch nội dung rich text | Security, Data | High |
| TS-CMS-006 | Kiểm tra liên kết giữa nội dung và sản phẩm | Functional, Data | Medium |

## 5. Giỏ hàng

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-CART-001 | Kiểm tra thêm sản phẩm vào giỏ | Functional | Critical |
| TS-CART-002 | Kiểm tra cập nhật số lượng | Functional, Validation | Critical |
| TS-CART-003 | Kiểm tra xóa sản phẩm khỏi giỏ | Functional | High |
| TS-CART-004 | Kiểm tra tính tạm tính | Functional, Data | Critical |
| TS-CART-005 | Kiểm tra giới hạn theo tồn kho | Functional, Data | Critical |
| TS-CART-006 | Kiểm tra sản phẩm bị sửa hoặc xóa sau khi thêm giỏ | Functional, Data | High |
| TS-CART-007 | Kiểm tra lưu giỏ hàng theo người dùng/session | Functional, Security | High |

## 6. Thanh toán và mã giảm giá

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-CHK-001 | Kiểm tra điều kiện bắt đầu thanh toán | Functional | Critical |
| TS-CHK-002 | Kiểm tra địa chỉ nhận hàng | Functional, Validation | Critical |
| TS-CHK-003 | Kiểm tra phí vận chuyển | Functional, Data | High |
| TS-CHK-004 | Kiểm tra áp dụng mã giảm giá | Functional, Data | Critical |
| TS-CHK-005 | Kiểm tra tính tổng tiền | Functional, Data | Critical |
| TS-CHK-006 | Kiểm tra tạo đơn hàng thành công | Functional, API, Data | Critical |
| TS-CHK-007 | Kiểm tra lỗi hoặc gửi yêu cầu thanh toán lặp | Reliability, Security | Critical |
| TS-CHK-008 | Kiểm tra payment gateway sandbox | Integration, Security | Critical |

## 7. Đơn hàng

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-ORD-001 | Kiểm tra danh sách đơn hàng của khách hàng | Functional, Security | High |
| TS-ORD-002 | Kiểm tra chi tiết đơn hàng | Functional, Data | High |
| TS-ORD-003 | Kiểm tra quyền truy cập đơn hàng | Security, Authorization | Critical |
| TS-ORD-004 | Kiểm tra chuyển trạng thái đơn hàng | Functional, State Transition | Critical |
| TS-ORD-005 | Kiểm tra lịch sử trạng thái | Functional, Data | High |
| TS-ORD-006 | Kiểm tra dữ liệu thanh toán và giao hàng | Functional, Integration | High |
| TS-ORD-007 | Kiểm tra snapshot tên, giá và giá vốn | Data Integrity | Critical |

## 8. Bình luận và đánh giá

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-FB-001 | Kiểm tra danh sách bình luận sản phẩm | Functional, API, UI | Medium |
| TS-FB-002 | Kiểm tra tạo bình luận và đánh giá | Functional, API, Validation | High |
| TS-FB-003 | Kiểm tra cập nhật bình luận | Functional, API | High |
| TS-FB-004 | Kiểm tra xóa bình luận | Functional, API | High |
| TS-FB-005 | Kiểm tra quyền sở hữu bình luận | Security, Authorization | Critical |
| TS-FB-006 | Kiểm tra nội dung độc hại và XSS | Security | Critical |
| TS-FB-007 | Kiểm tra điều kiện đã mua hàng nếu được yêu cầu | Functional, Data | High |

## 9. Quản trị

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-ADM-001 | Kiểm tra đăng nhập và đăng xuất AdminJS | Functional, Security | Critical |
| TS-ADM-002 | Kiểm tra user thường truy cập trang quản trị | Authorization | Critical |
| TS-ADM-003 | Kiểm tra quản lý người dùng | Functional, Data | High |
| TS-ADM-004 | Kiểm tra quản lý sản phẩm | Functional, Data | Critical |
| TS-ADM-005 | Kiểm tra quản lý danh mục và thương hiệu | Functional, Data | High |
| TS-ADM-006 | Kiểm tra quản lý banner và tin tức | Functional, Data | Medium |
| TS-ADM-007 | Kiểm tra quản lý mã giảm giá | Functional, Data | High |
| TS-ADM-008 | Kiểm tra tải và thay đổi hình ảnh | Integration, UI | Medium |
| TS-ADM-009 | Kiểm tra xóa mềm và dữ liệu liên quan | Functional, Data Integrity | High |

## 10. Tồn kho

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-INV-001 | Kiểm tra tạo lô hàng | Functional, Data | Critical |
| TS-INV-002 | Kiểm tra mã lô duy nhất và tự động sinh | Functional, Data | Critical |
| TS-INV-003 | Kiểm tra cập nhật lô hàng | Functional, Data | Critical |
| TS-INV-004 | Kiểm tra xóa lô hàng | Functional, Data | Critical |
| TS-INV-005 | Kiểm tra đồng bộ tồn kho sản phẩm | Data Integrity | Critical |
| TS-INV-006 | Kiểm tra giao dịch IN, OUT và ADJUST | Functional, Data Integrity | Critical |
| TS-INV-007 | Kiểm tra số lượng và giá nhập không hợp lệ | Validation, Data | Critical |
| TS-INV-008 | Kiểm tra chuyển lô sang sản phẩm khác | Functional, Data Integrity | High |
| TS-INV-009 | Kiểm tra bảo toàn lịch sử giao dịch | Data Integrity | Critical |

## 11. API

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-API-001 | Kiểm tra method, endpoint và status code | API | Critical |
| TS-API-002 | Kiểm tra response schema và kiểu dữ liệu | API, Contract | High |
| TS-API-003 | Kiểm tra validation và dữ liệu biên | API, Validation | High |
| TS-API-004 | Kiểm tra tài nguyên không tồn tại | API, Error Handling | High |
| TS-API-005 | Kiểm tra xác thực và phân quyền | API, Security | Critical |
| TS-API-006 | Kiểm tra dữ liệu API khớp cơ sở dữ liệu | API, Data Integrity | Critical |
| TS-API-007 | Kiểm tra lỗi server không lộ thông tin bí mật | API, Security | Critical |
| TS-API-008 | Kiểm tra thời gian phản hồi | API, Performance | High |

## 12. Bảo mật

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-SEC-001 | Kiểm tra authentication bypass | Security | Critical |
| TS-SEC-002 | Kiểm tra authorization và IDOR | Security | Critical |
| TS-SEC-003 | Kiểm tra SQL injection | Security | Critical |
| TS-SEC-004 | Kiểm tra stored và reflected XSS | Security | Critical |
| TS-SEC-005 | Kiểm tra CSRF trên thao tác thay đổi dữ liệu | Security | Critical |
| TS-SEC-006 | Kiểm tra cookie và session | Security | Critical |
| TS-SEC-007 | Kiểm tra brute force/rate limiting | Security | High |
| TS-SEC-008 | Kiểm tra lộ `.env`, stack trace và secrets | Security | Critical |
| TS-SEC-009 | Kiểm tra password hash không xuất hiện trong response | Security, API | Critical |

## 13. Giao diện và khả năng sử dụng

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-UI-001 | Kiểm tra bố cục desktop | UI | Medium |
| TS-UI-002 | Kiểm tra responsive tablet và mobile | UI, Compatibility | High |
| TS-UI-003 | Kiểm tra biểu mẫu, label và thông báo lỗi | UI, Usability | High |
| TS-UI-004 | Kiểm tra trạng thái loading, empty và error | UI, Usability | Medium |
| TS-UI-005 | Kiểm tra điều hướng và liên kết | UI, Functional | Medium |
| TS-UI-006 | Kiểm tra thao tác bàn phím và focus cơ bản | Accessibility | Medium |
| TS-UI-007 | Kiểm tra nội dung tiếng Việt và chính tả | UI, Content | Low |

## 14. Tương thích

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-COMP-001 | Kiểm tra luồng Critical trên Chrome | Compatibility | Critical |
| TS-COMP-002 | Kiểm tra luồng Critical trên Edge | Compatibility | High |
| TS-COMP-003 | Kiểm tra luồng Critical trên Firefox | Compatibility | High |
| TS-COMP-004 | Kiểm tra luồng Critical trên WebKit | Compatibility | High |
| TS-COMP-005 | Kiểm tra các độ phân giải mục tiêu | Compatibility, UI | High |

## 15. Hiệu năng và độ tin cậy

| ID | Test scenario | Loại | Ưu tiên |
|---|---|---|---|
| TS-PERF-001 | Đo thời gian tải trang chủ | Performance | High |
| TS-PERF-002 | Đo thời gian phản hồi API sản phẩm | Performance | High |
| TS-PERF-003 | Đo thời gian đăng nhập | Performance | High |
| TS-PERF-004 | Kiểm tra 20 người dùng đồng thời | Load | High |
| TS-PERF-005 | Kiểm tra tỷ lệ lỗi dưới tải | Load, Reliability | High |
| TS-PERF-006 | Kiểm tra hệ thống phục hồi sau khi tải kết thúc | Reliability | Medium |

