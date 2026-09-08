# MÃ HTTP TRONG CÁC LUỒNG HỆ THỐNG

## 1. Mục đích

Tài liệu này giải thích các mã HTTP được sử dụng trong project, đặc biệt các mã như `401`, `403`, `404`, `409` và `423`. Nội dung được đối chiếu với controller, middleware, service và luồng AdminJS hiện tại.

Mã HTTP cho biết **kết quả của một request/response**. Nó không phải thuộc tính `status` trong MySQL.

Ví dụ:

```text
HTTP 401                    → request chưa được xác thực
users.status = 1            → tài khoản đang hoạt động
orders.status = 1           → đơn đang được chuẩn bị
payments.status = 1         → đã thanh toán
shipments.shipping_status=1 → đã giao cho đơn vị vận chuyển
```

Cùng là số `1` nhưng mỗi cột database có một ý nghĩa riêng; không được suy ra từ mã HTTP.

## 2. Nhóm mã HTTP

| Khoảng mã | Nhóm | Ý nghĩa tổng quát |
|---:|---|---|
| `100–199` | Informational | Server đã nhận thông tin và đang tiếp tục xử lý |
| `200–299` | Success | Request thành công |
| `300–399` | Redirection | Client cần chuyển đến URL khác hoặc dùng cache |
| `400–499` | Client error | Request, dữ liệu, xác thực hoặc trạng thái nghiệp vụ phía client không phù hợp |
| `500–599` | Server error | Backend hoặc dịch vụ phụ thuộc gặp lỗi |

Project hiện trực tiếp sử dụng hoặc phát sinh các mã chính: `200`, `201`, `302`, `400`, `401`, `403`, `404`, `409`, `423`, `500`, `502`, `503`.

## 3. Bảng tra nhanh

| Mã | Tên chuẩn | Hiểu ngắn gọn trong project | Client nên làm gì? |
|---:|---|---|---|
| `200` | OK | Đọc/cập nhật/xóa thành công hoặc trả kết quả dự phòng hợp lệ | Đọc JSON/HTML và cập nhật giao diện |
| `201` | Created | Backend đã tạo resource mới | Lấy ID/data mới và refresh giao diện |
| `302` | Found | AdminJS yêu cầu chuyển trang | Đọc header `Location` hoặc để browser redirect |
| `400` | Bad Request | Input sai định dạng, thiếu hoặc không hợp lệ | Sửa dữ liệu trước khi gửi lại |
| `401` | Unauthorized | Chưa đăng nhập, session mất hoặc credentials sai | Đăng nhập/nhập lại thông tin xác thực |
| `403` | Forbidden | Đã xác định request nhưng không được phép | Không retry y nguyên; cần quyền hoặc trạng thái tài khoản phù hợp |
| `404` | Not Found | Không tìm thấy hoặc cố ý không tiết lộ resource ngoài quyền sở hữu | Kiểm tra ID/URL; không giả định resource tồn tại |
| `409` | Conflict | Request hợp lệ về cú pháp nhưng xung đột trạng thái hiện tại | Refresh dữ liệu rồi xử lý theo trạng thái mới |
| `423` | Locked | Tài khoản đang bị khóa tạm do sai mật khẩu | Chờ theo `Retry-After` rồi thử lại |
| `500` | Internal Server Error | Lỗi backend không được phân loại an toàn | Hiển thị lỗi chung, log server để điều tra |
| `502` | Bad Gateway | Gemini/dịch vụ upstream trả lỗi hoặc dữ liệu không hợp lệ | Thử lại sau hoặc dùng fallback |
| `503` | Service Unavailable | Dịch vụ AI/index chưa cấu hình hoặc tạm chưa sẵn sàng | Cấu hình dịch vụ hoặc thử lại sau |

## 4. HTTP `200 OK`

`200` nghĩa là request đã được xử lý thành công. `res.json(...)` của Express mặc định cũng trả `200` nếu code không gọi `res.status(...)` trước đó.

Các trường hợp tiêu biểu:

- Đăng nhập đúng.
- `GET /api/auth/me`, kể cả khi chưa đăng nhập, có thể trả `200` với `authenticated:false`; endpoint này dùng payload để diễn tả trạng thái thay vì dùng `401`.
- Lấy danh sách/detail sản phẩm, danh mục, thương hiệu, banner và tin tức.
- Cập nhật hồ sơ người dùng.
- Lấy/thêm dữ liệu thành công ở các API không tạo mới.
- Hủy đơn thành công trả JSON bằng `res.json()`.
- Chatbot trả câu trả lời hoặc fallback an toàn.
- AdminJS API trả dữ liệu dashboard/resource sau khi đăng nhập.

Ví dụ:

```javascript
return res.json({ data }); // mặc định HTTP 200
```

`200` không có nghĩa payload luôn chứa data. Ví dụ `/api/auth/me` chưa đăng nhập vẫn là một request kiểm tra trạng thái thành công:

```json
{
  "authenticated": false,
  "data": null
}
```

## 5. HTTP `201 Created`

`201` dùng khi request đã tạo thành công một resource mới.

Các trường hợp trong source:

| Luồng | Endpoint/hàm | Resource được tạo |
|---|---|---|
| Đăng ký | `authController.register()` | `User` và địa chỉ đầu tiên |
| Thêm địa chỉ | `authController.addAddress()` | `UserAddress` |
| Thêm feedback | `feedbackController.create()` | `Feedback` |
| Tạo PayPal order | `paymentController.createOrder()` | Order/payment nội bộ và PayPal order |

Ví dụ:

```javascript
return res.status(201).json({ message: "Đã thêm địa chỉ.", data: address });
```

Không dùng `201` chỉ vì dữ liệu trong record vừa được cập nhật. Update thông thường dùng `200`.

## 6. HTTP `302 Found` trong AdminJS

Project dùng `302` chủ yếu cho điều hướng xác thực AdminJS:

```text
GET /admin/api/dashboard khi chưa đăng nhập
→ HTTP 302
→ Location: /admin/login

POST /admin/login với tài khoản đúng
→ HTTP 302
→ Location: /admin
→ Set-Cookie: adminjs=...
```

Browser thường tự đi theo redirect nên người dùng chỉ thấy trang mới. Newman test tắt hoặc quan sát redirect để kiểm tra chính xác status và header `Location`.

Lưu ý: `302` không phải lỗi. Đây là chỉ dẫn điều hướng. Một số response/logout của AdminJS có thể render trang đăng nhập với `200` thay vì luôn trả `302`; test phải bám hành vi thật của phiên bản thư viện.

## 7. HTTP `400 Bad Request`

`400` dùng khi dữ liệu đầu vào không đạt yêu cầu và client có thể sửa trước khi gửi lại.

Nguồn phát sinh:

### 7.1. Middleware Joi

`src/middlewares/validate.js` trả:

```javascript
return res.status(400).json({
  message: "Dữ liệu gửi lên không hợp lệ.",
  error: error.details,
});
```

Ví dụ: message chat thiếu, sai kiểu hoặc vượt giới hạn DTO.

### 7.2. Đăng ký/hồ sơ

- Mật khẩu xác nhận không khớp.
- Thiếu điện thoại, địa chỉ hoặc tỉnh/thành khi đăng ký.
- Tên hồ sơ rỗng.
- Avatar Data URL không thuộc định dạng ảnh được chấp nhận.
- Địa chỉ mới thiếu thông tin bắt buộc.

### 7.3. Checkout/coupon

- Giỏ hàng trống.
- Product ID, combo ID hoặc số lượng sai kiểu/phạm vi.
- Địa chỉ không hợp lệ hoặc không thuộc user.
- Sản phẩm không còn bán.
- Chưa đạt số combo tối thiểu.
- Mã coupon hoặc subtotal đầu vào không hợp lệ.

### 7.4. Công thức

- Query món ăn ngắn hơn 2 hoặc dài hơn 200 ký tự.
- Bộ lọc công thức không nằm trong danh sách cho phép.

`400` nói rằng **hình dạng/nội dung request không hợp lệ**, khác `409` là dữ liệu có thể đúng nhưng xung đột với trạng thái hiện tại.

## 8. HTTP `401 Unauthorized`

Mặc dù tên chuẩn là “Unauthorized”, mã này được dùng cho trường hợp **chưa xác thực hoặc xác thực thất bại**.

### 8.1. Middleware `signedIn`

Các route cần tài khoản khách hàng đi qua:

```javascript
const signedIn = (req, res, next) => req.session.userId
  ? next()
  : res.status(401).json({ message: "Bạn chưa đăng nhập." });
```

Vì vậy request checkout, quản lý địa chỉ, order, feedback hoặc chat cần đăng nhập có thể nhận `401` nếu cookie session thiếu/hết hạn.

### 8.2. Đăng nhập sai

`authController.login()` dùng `401` khi:

- Không tìm thấy email.
- Mật khẩu không đúng nhưng chưa đến ngưỡng khóa lần thứ 5.

Cả hai nhánh trả cùng message `Email hoặc mật khẩu không đúng.` để không tiết lộ email có tồn tại hay không.

### 8.3. Session trỏ đến user không tồn tại

Một số controller query lại User bằng `req.session.userId`. Nếu record đã mất, controller trả `401` vì session không còn đại diện cho tài khoản hợp lệ.

Phân biệt:

```text
401 → chưa chứng minh được danh tính/session không hợp lệ/credentials sai
403 → đã biết request là ai nhưng tài khoản hoặc quyền không cho phép
```

## 9. HTTP `403 Forbidden`

`403` nghĩa là server hiểu request nhưng từ chối quyền thực hiện.

Các trường hợp thật:

### 9.1. Tài khoản không hoạt động

```javascript
if (Number(user.status) !== 1) {
  return res.status(403).json({ message: "Tài khoản đã bị khóa." });
}
```

`users.status=0` hoặc `2` đều bị từ chối. Đây là khóa quản trị, khác khóa tạm `locked_until` trả `423`.

### 9.2. Xóa feedback không thuộc quyền

User chỉ được xóa feedback của mình; user có `role=1` được code cho phép xóa feedback của người khác. Nếu không thỏa hai điều kiện, API trả `403`.

Không nên dùng `401` cho trường hợp này vì session đã hợp lệ; vấn đề là quyền.

## 10. HTTP `404 Not Found`

`404` nghĩa là không tìm thấy resource phù hợp với URL và điều kiện truy vấn.

Các đối tượng có thể trả `404`:

- Product, combo, category, brand, banner hoặc news không tồn tại.
- Product/combo đã bị ẩn, ngừng bán hoặc tạm hết hàng nếu query public cố ý lọc chúng.
- Order/payment không tồn tại **hoặc không thuộc user đang đăng nhập**.
- Địa chỉ không tồn tại hoặc không thuộc user.
- Feedback không tồn tại hoặc không thuộc điều kiện thao tác.
- Công thức không phù hợp trả lỗi nội bộ `RECIPE_NOT_FOUND` với status `404`.
- View product/news không tồn tại render trang `not-found.njk` với status `404`.

Ví dụ bảo vệ quyền sở hữu:

```javascript
const order = await Order.findOne({
  where: { id: req.params.id, user_id: req.session.userId },
});
if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
```

Backend không trả `403` ở đây vì `404` tránh xác nhận rằng ID của người khác có tồn tại. Đây là cách giảm rò rỉ thông tin tài nguyên.

Phân biệt:

```text
400 → ID/input không đúng định dạng
404 → định dạng có thể đúng nhưng không tìm thấy record phù hợp
```

## 11. HTTP `409 Conflict`

`409` dùng khi request hợp lệ nhưng không thể thực hiện vì xung đột với dữ liệu hoặc trạng thái hiện tại.

Các trường hợp trong project:

| Luồng | Xung đột |
|---|---|
| Đăng ký | Email đã được sử dụng |
| Coupon | Mã hết hạn, chưa đến ngày, bị tắt, hết lượt, chưa đạt minimum hoặc user đã dùng |
| Checkout | Combo bị ẩn/hết hàng hoặc số lượng yêu cầu vượt tồn |
| Thanh toán | Tồn kho sản phẩm không đủ |
| PayPal capture | Trạng thái/amount/currency không khớp với đơn |
| Hủy đơn | Order đã qua trạng thái cho phép hủy (`0` hoặc `1`) |

Ví dụ:

```javascript
if (![0, 1].includes(Number(order.status))) {
  return res.status(409).json({
    message: "Đơn hàng đã được xử lý nên không thể hủy.",
  });
}
```

Client nên tải lại dữ liệu mới trước khi retry. Gửi lại y nguyên thường vẫn tiếp tục bị `409`.

## 12. HTTP `423 Locked`

`423` được dùng riêng cho cơ chế khóa đăng nhập tạm thời:

```text
Nhập sai mật khẩu lần 1–4 → 401
Nhập sai lần thứ 5       → 423 + khóa 1 giờ
Gửi tiếp khi còn khóa    → 423
Hết thời gian khóa       → reset bộ đếm, cho phép thử lại
```

Response còn có:

```text
Retry-After: số giây cần chờ
lockedUntil: thời điểm hết khóa
```

Ví dụ response:

```json
{
  "message": "Tài khoản tạm khóa do đăng nhập sai 5 lần liên tiếp. Vui lòng thử lại sau.",
  "lockedUntil": "..."
}
```

Phân biệt hai loại khóa:

| Trường hợp | Dữ liệu kiểm tra | HTTP |
|---|---|---:|
| Admin vô hiệu hóa/cấm tài khoản | `users.status != 1` | `403` |
| Khóa tạm vì sai mật khẩu | `users.locked_until > now` | `423` |

## 13. HTTP `500 Internal Server Error`

`500` là lỗi backend không được gán mã cụ thể hoặc không nên đưa chi tiết kỹ thuật ra client.

Error handler chung:

```javascript
const status = Number(error.status);
return res.status(status >= 400 && status < 600 ? status : 500).json({
  message: status >= 400 && status < 600
    ? error.message
    : "Đã xảy ra lỗi máy chủ.",
});
```

Các tình huống có thể dẫn đến `500`:

- MySQL mất kết nối hoặc query lỗi.
- Constraint/database error chưa được controller chuyển thành `400/409`.
- Cloudinary upload lỗi không được gắn status.
- Bug JavaScript, truy cập thuộc tính undefined hoặc parse lỗi.
- Storefront controller bắt lỗi truy vấn và trực tiếp trả `500`.

Client chỉ nên hiển thị thông báo chung. Chi tiết stack trace phải nằm ở log server, không trả ra frontend.

## 14. HTTP `502 Bad Gateway`

`geminiService` tạo lỗi `502` khi backend gọi Gemini nhưng Gemini:

- Trả response không thành công.
- Không trả nội dung công thức hợp lệ.
- Trả payload không thể sử dụng theo yêu cầu.

Luồng khái niệm:

```text
Browser → backend project → Gemini
                         ↑ upstream lỗi
Backend có thể biểu diễn lỗi upstream bằng 502
```

Trong một số flow chatbot/công thức, lỗi Gemini được `catch` và chuyển sang công thức/câu trả lời dự phòng. Khi fallback thành công, client cuối cùng vẫn nhận `200`; `502` khi đó chỉ là status trên Error nội bộ và không nhất thiết đi tới browser.

## 15. HTTP `503 Service Unavailable`

`503` nghĩa là tính năng tạm chưa sẵn sàng, không nhất thiết source bị bug.

Các nguồn trong project:

- Thiếu `GEMINI_API_KEY`/`Gemini_key`.
- Python/FAISS recipe index chưa sẵn sàng hoặc tiến trình query thất bại.

Giống `502`, một số nhánh bắt lỗi rồi dùng fallback nên browser có thể vẫn nhận `200`. Nếu Error `status=503` được chuyển tới error handler chung mà không bị bắt, handler giữ nguyên `503` và trả message của Error.

Phân biệt:

```text
500 → lỗi nội bộ chung, chưa phân loại
502 → backend liên lạc upstream nhưng upstream trả lỗi/kết quả hỏng
503 → dịch vụ cần thiết chưa cấu hình hoặc tạm chưa sẵn sàng
```

## 16. Mã HTTP trong từng luồng chính

| Luồng | Thành công | Lỗi thường gặp |
|---|---|---|
| Đăng ký | `201` | `400` input sai, `409` email trùng, `500` DB lỗi |
| Đăng nhập | `200` | `401` credentials sai, `403` account bị cấm/tắt, `423` khóa tạm |
| Hồ sơ/avatar | `200` | `400` input/ảnh sai, `401` session sai, `500` Cloudinary/DB lỗi |
| Địa chỉ | `200` list/delete, `201` create | `400` thiếu dữ liệu, `401` chưa login, `404` không thuộc user |
| Product/catalog | `200` | `404` không tìm thấy/không active, `500` query lỗi |
| Combo | `200` | `404` không tồn tại/không khả dụng |
| Coupon | `200` | `400` input sai, `409` điều kiện sử dụng xung đột |
| Checkout/PayPal | `201` tạo PayPal order, `200` capture | `400`, `404`, `409`, `500` hoặc lỗi upstream |
| Order | `200` | `401`, `404`, `409` |
| Feedback | `200` list/update/delete, `201` create | `401`, `403`, `404` |
| Recipe | `200` | `400`, lỗi nội bộ `404/502/503` có thể được fallback |
| Chatbot | `200` | `400` DTO, `401` chưa login; Gemini lỗi thường được fallback thành `200` |
| AdminJS | `200` hoặc `302` | Response/notice do AdminJS sinh; không hoàn toàn giống API JSON public |

## 17. Cách frontend nên xử lý

```javascript
const response = await fetch(url, options);
const result = await response.json().catch(() => ({}));

if (response.ok) {
  // 200–299
  render(result);
} else if (response.status === 401) {
  // yêu cầu đăng nhập
} else if (response.status === 423) {
  // đọc Retry-After/lockedUntil và hiển thị thời gian chờ
} else {
  // hiển thị result.message hoặc thông báo chung
}
```

`fetch()` không tự ném exception chỉ vì server trả `400`, `401` hay `500`. Code phải kiểm tra `response.ok` hoặc `response.status`. Exception của `fetch` thường dành cho lỗi mạng, URL hoặc request bị hủy.

Với `302`, browser/fetch có thể tự theo redirect; test muốn thấy chính xác `302` cần cấu hình không tự follow hoặc kiểm tra hành vi thông qua công cụ phù hợp.

## 18. Các nhầm lẫn thường gặp

### `401` có phải user.status bằng 401 không?

Không. `401` là mã response HTTP. `users.status` chỉ dùng `0`, `1`, `2`.

### `404` có chắc record không tồn tại trong database không?

Không chắc. Record có thể tồn tại nhưng:

- Không thuộc user hiện tại.
- Đã xóa mềm.
- `status` không còn active.
- Combo không còn đủ hàng.
- Query public cố ý lọc record đó.

### `200` có luôn nghĩa nghiệp vụ hoàn toàn thành công không?

Thông thường có, nhưng cần đọc payload. `/api/auth/me` dùng `200` cho cả `authenticated:false`; chatbot có thể trả fallback `200` khi AI không hoạt động.

### `403` và `404` dùng khi nào cho quyền sở hữu?

- `403`: source đã tìm thấy resource và công khai rằng user thiếu quyền, như xóa feedback của người khác.
- `404`: query gắn luôn `user_id`, không tìm thấy record phù hợp và không tiết lộ record của người khác, như Order/Address.

### `409` khác `400` thế nào?

- `400`: bản thân input không hợp lệ.
- `409`: input có thể hợp lệ nhưng trạng thái dữ liệu hiện tại không cho phép, ví dụ hết hàng hoặc đơn đã xử lý.

### Status PayPal `COMPLETED` có phải HTTP `200` không?

Không. `COMPLETED` là trạng thái nghiệp vụ trong payload PayPal. HTTP của request PayPal là một lớp khác; backend còn phải kiểm tra currency, amount và capture status trước khi đặt `payments.status=1`.

## 19. Câu trả lời ngắn khi bảo vệ

> Mã HTTP diễn tả kết quả request, tách biệt hoàn toàn với status trong database. Project dùng 200/201 cho thành công, 302 cho redirect AdminJS, 400 cho input sai, 401 cho chưa xác thực hoặc sai mật khẩu, 403 cho thiếu quyền/tài khoản bị cấm, 404 cho không tìm thấy hoặc không thuộc user, 409 cho xung đột trạng thái, 423 cho khóa đăng nhập tạm, và 500–503 cho lỗi backend hoặc dịch vụ AI. Frontend phải kiểm tra `response.ok/status`; riêng fetch không tự throw khi nhận mã lỗi HTTP.

