# SYSTEM FLOWS — 9 luồng nghiệp vụ chính

> Phạm vi kiểm tra: source trong `src/` (routes, controllers, services, models, middleware, public JS, Nunjucks views và migrations). Tài liệu mô tả đúng code hiện tại, không mô tả một kiến trúc giả định. Các câu SQL bên dưới là **SQL tương đương để giải thích; source thực tế sử dụng Sequelize ORM**. Năm luồng ban đầu được mở rộng thêm luồng chatbot, admin, Cloudinary và quản lý địa chỉ người dùng.

## Bản đồ entry point chung

`src/index.js` khai báo `express.json()`, `express.urlencoded()`, sau đó `express-session` (cookie `nong-san.sid`) trước khi gọi `configRoutes(app)`. `src/routes/index.js` mount:

```javascript
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/combos", comboRoutes);
app.use("/api/chat", chatRoutes);
app.use(viewRoutes);
```

`asyncRoute` chỉ chuyển rejected promise sang Express error handler. `signedIn` kiểm tra `req.session.userId`; không truy vấn database.

## Cách đọc tên và cú pháp thường gặp trong tài liệu

- `req.body`: dữ liệu JSON/form frontend gửi trong body của request.
- `req.params`: giá trị nằm trong URL, ví dụ `/:id`.
- `req.query`: tham số sau dấu `?`, ví dụ `?page=2&search=cam`.
- `req.session.userId`: ID user đã đăng nhập được lưu trong session phía server.
- `Model.findOne/findByPk/findAll`: đọc một bản ghi theo điều kiện/khóa chính hoặc đọc danh sách.
- `findAndCountAll`: vừa lấy danh sách vừa đếm tổng số bản ghi, phục vụ phân trang.
- `create/bulkCreate`: INSERT một/nhiều bản ghi; `update/increment/decrement`: UPDATE.
- `include`: yêu cầu Sequelize lấy thêm dữ liệu từ model có association, tương đương JOIN ở mức giải thích.
- `where`: điều kiện lọc; `order`: thứ tự; `limit/offset`: giới hạn và bỏ qua bản ghi để phân trang.
- `transaction`: nhóm nhiều thay đổi database thành một đơn vị; tất cả thành công thì COMMIT, một bước lỗi thì ROLLBACK.
- `lock: transaction.LOCK.UPDATE`: khóa các row đã đọc đến hết transaction, tránh hai request cùng trừ một lượng tồn kho.
- `res.json/res.render`: lần lượt trả JSON hoặc render HTML bằng template Nunjucks.

## STATUS DICTIONARY — Ý nghĩa mọi trạng thái trong các nghiệp vụ

### Trước hết: có ba loại “status” khác nhau

```text
1. Status nghiệp vụ trong MySQL
   Ví dụ: orders.status=1, payments.status=1
   → lưu trạng thái lâu dài của dữ liệu

2. HTTP response status
   Ví dụ: res.status(400), res.status(401), res.status(201)
   → mã kết quả của một HTTP request, không phải cột database

3. Status từ API ngoài
   Ví dụ: PayPal capture.status="COMPLETED"
   → trạng thái PayPal trả về, sau khi verify mới được ánh xạ thành payments.status/orders.status
```

Không được đọc `res.status(401)` thành “status của User bằng 401”. Đây chỉ là HTTP Unauthorized. Tương tự, PayPal dùng chuỗi `COMPLETED`, còn database của project dùng số nguyên.

### 1. `users.status` — trạng thái tài khoản

| Giá trị | Nhãn trong AdminJS | Ý nghĩa trong nghiệp vụ |
|---:|---|---|
| `0` | Không hoạt động | Không được login/sử dụng API cần account active |
| `1` | Đang hoạt động | Account hợp lệ |
| `2` | Đã cấm | Không được login hoặc duy trì session khách hàng |

Code không phân biệt message cho 0 và 2; `login()` chỉ kiểm tra `Number(user.status)!==1` rồi trả 403 “Tài khoản đã bị khóa”. `me()` cũng hủy session nếu status không còn 1. CRUD quản trị hiện được thực hiện duy nhất qua AdminJS, không còn middleware API `adminOnly`.

`users.status` là khóa do quản trị; khác hoàn toàn khóa tạm `locked_until` do sai mật khẩu. Hết một giờ chỉ tự xóa `locked_until`, không đổi `status`.

### 2. `products.status` — trạng thái bán sản phẩm

| Giá trị | Nhãn trong AdminJS | Ý nghĩa |
|---:|---|---|
| `0` | Đang ẩn | Không xuất hiện ở storefront/query `status=1` |
| `1` | Đang bán | Được list, search, xem detail, checkout và đưa vào chatbot |
| `2` | Ngừng bán | Không được các flow khách hàng lấy do đều lọc `status=1` |

Status không cho biết còn hàng. Sản phẩm có `status=1` nhưng `quantity=0` vẫn là đang bán về mặt cấu hình; một số flow tiếp tục kiểm tra quantity riêng. Checkout query active rồi so stock; recipe yêu cầu cả `status=1` và `quantity>0`.

### 3. `orders.status` — vòng đời đơn hàng

| Giá trị | Nhãn thật trong source | Khi nào xuất hiện |
|---:|---|---|
| `0` | Đã nhận đơn | `createOrder()` tạo order trước khi PayPal thành công |
| `1` | Đang chuẩn bị đơn | `captureOrder()` đặt sau PayPal capture + FEFO thành công |
| `2` | Đã giao cho đơn vị vận chuyển | Có thể được admin cập nhật; Order hook map Shipment về 1 |
| `3` | Đang giao | Shipment hook đặt khi `shipping_status=2` |
| `4` | Đã hoàn thành | Shipment hook đặt khi `shipping_status=3`; chatbot dùng để SUM “tổng tiền đã mua” |
| `5` | Đã hủy | `orderController.cancel()` đặt sau khi hoàn kho |

Luồng thực tế quan trọng:

```text
createOrder()          → Order.status = 0
PayPal capture + FEFO  → Order.status = 1
admin/process          → có thể status = 2
Shipment.status = 2   → Order.status = 3
Shipment.status = 3   → Order.status = 4
customer cancel 0/1   → Order.status = 5
```

`cancel()` chỉ cho hủy khi Order status nằm trong `[0,1]`. Status 2 trở đi được xem là “đã xử lý” và trả HTTP 409.

Mỗi khi `Order.status` thật sự đổi, hook `Order.afterUpdate` INSERT `order_histories` với `from_status`, `to_status`, user thực hiện và reason. `order_histories.from_status/to_status` dùng cùng bộ mã 0–5, không phải một status dictionary khác.

### 4. `payments.status` — trạng thái thanh toán nội bộ

| Giá trị | Nhãn trong AdminJS | Code hiện tại đặt ở đâu |
|---:|---|---|
| `0` | Chưa thanh toán | `Payment.create()` khi tạo order DB |
| `1` | Đã thanh toán | `captureOrder()` sau khi verify PayPal và reserve kho thành công |
| `2` | Thanh toán thất bại | `createOrder()` đặt nếu bước tạo PayPal order ném lỗi |
| `3` | Đã hoàn tiền | Có nhãn/config trong AdminJS; không tìm thấy flow nghiệp vụ tự động nào đặt 3 |

PayPal create thành công **không** làm Payment status thành 1; nó chỉ lưu `transaction_code` và `gateway_response`. Chỉ capture hợp lệ mới là đã thanh toán.

Idempotency capture dựa trên `payment.status===1`: nếu đã paid, controller trả success mà không capture hoặc trừ kho lần nữa.

### 5. `shipments.shipping_status` — trạng thái vận chuyển

| Giá trị | Nhãn trong AdminJS | Tác động tới Order |
|---:|---|---|
| `0` | Đang chuẩn bị đơn | Giá trị lúc `Shipment.create()`; không tự đổi Order |
| `1` | Đã giao cho đơn vị vận chuyển | Order status 2 có thể đồng bộ Shipment thành 1 |
| `2` | Đang giao | Shipment hook tự đổi Order thành status 3 |
| `3` | Đã giao | Shipment hook tự đổi Order thành status 4 |
| `4` | Giao thất bại | Không có mapping tự động sang Order trong source hiện tại |
| `5` | Hoàn hàng | Order status 5 có thể đồng bộ Shipment thành 5; Shipment 5 không tự map ngược Order |

Hai bảng dùng hai bộ số khác nhau. Ví dụ `orders.status=3` nghĩa là “Đang giao”, nhưng `shipments.shipping_status=3` nghĩa là “Đã giao”. Không được so hai số trực tiếp.

Mapping trong model:

```javascript
// Order → Shipment
const shipmentStatusByOrder = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5 };
// Shipment → Order (chỉ hai trạng thái)
const orderStatusByShipment = { 2: 3, 3: 4 };
```

Khi shipping status thành 3, Shipment hook đổi Order thành 4; Order hook sau đó update Shipment thành 3 lần nữa với `hooks:false`, tránh vòng lặp hook vô hạn. `delivery_time` được Order hook đặt khi shipping status đích là 3.

### 6. `coupons.status` — trạng thái mã giảm giá

| Giá trị | Nhãn trong AdminJS | Ý nghĩa |
|---:|---|---|
| `0` | Không hoạt động | `validateCouponRecord()` từ chối |
| `1` | Đang hoạt động | Qua bước status nhưng vẫn phải kiểm tra ngày, quota và min order |

Coupon status 1 không có nghĩa chắc chắn dùng được. Code còn yêu cầu discount config hợp lệ, đã đến ngày bắt đầu, chưa quá ngày kết thúc, `used_quantity<quantity`, đạt `min_order_value` và user chưa dùng.

### 7. `banner.status` — trạng thái hiển thị banner

| Giá trị | Nhãn trong AdminJS | Ý nghĩa |
|---:|---|---|
| `0` | Đang ẩn | API list banner public không lấy |
| `1` | Đang hiển thị | `Banner.findAll({where:{status:1}})` trả cho storefront |

Status này không tham gia trực tiếp 9 flow chính nhưng model/resource có trong source và có thể được admin chỉnh sửa.

### 8. `combos.status` — bật/tắt combo

Đây là BOOLEAN, không phải integer:

| Giá trị | Nhãn AdminJS | Ý nghĩa |
|---|---|---|
| `false` | Không — tạm ẩn | `findCombos()` mặc định không query combo này |
| `true` | Có — đang bán | Được xét tiếp để tính availability |

Status true chưa đủ để hiển thị. `calculateCombo().isAvailable` còn yêu cầu có item, `availableQuantity>0`, `comboPrice>0` và `comboPrice<retailPrice`. Vì vậy combo bật status vẫn có thể tự ẩn do thiếu hàng hoặc cấu hình giá không hợp lệ.

Ngược lại, `findCombos()` include thuộc tính `Product.status` nhưng không có `where:{status:1}` ở Product và `calculateCombo()` cũng không kiểm tra `item.Product.status`. Do đó một Product status 0/2 nhưng vẫn còn `quantity` có thể vẫn đóng góp vào combo và khiến combo được coi là available. Đây là rủi ro logic của source hiện tại.

### 9. `recipes.active` — công thức được quản lý có hoạt động không

Đây là BOOLEAN `active`, không mang tên `status`:

- `true`: `suggestRecipe()` có thể dùng record cùng tên để lấy ảnh.
- `false`: query `Recipe.findOne({name,active:true})` bỏ qua record; vẫn có thể sinh công thức bằng Gemini/local fallback nhưng không dùng ảnh từ record inactive.

### 10. `recipe_sources.status` — trạng thái xử lý nguồn PDF

Đây là STRING:

| Giá trị | Nhãn AdminJS | Ý nghĩa |
|---|---|---|
| `processing` | Đang xử lý | Đang/chờ xây dựng chỉ mục |
| `ready` | Hoàn tất | Rebuild index thành công |
| `error` | Có lỗi | Rebuild thất bại; xem `error_message` |

`recipeIndex.setStatus(status,errorMessage)` update tất cả RecipeSource theo tiến trình rebuild. Nó không liên quan HTTP status của Gemini.

### 11. Status từ PayPal

`capture.status` và `captureData.status` là chuỗi do PayPal trả. Code chỉ chấp nhận cả hai bằng `"COMPLETED"`, currency `USD` và amount đúng:

```javascript
if (capture.status !== "COMPLETED" ||
    captureData?.status !== "COMPLETED" ||
    captureData?.amount?.currency_code !== "USD" ||
    captureData?.amount?.value !== expectedUsd) {
  return res.status(409).json({
    message: "PayPal chưa xác nhận đủ số tiền của đơn hàng.",
  });
}
```

Chỉ sau verify này backend mới đặt `payments.status=1` và `orders.status=1` trong transaction.

### 12. HTTP status thường gặp trong các flow

| HTTP status | Ý nghĩa trong project | Ví dụ |
|---:|---|---|
| `200` | Thành công | login, capture, list/detail/update |
| `201` | Đã tạo mới | register, address, PayPal order response |
| `400` | Request/validation không hợp lệ | item/address/coupon input sai |
| `401` | Chưa đăng nhập hoặc credentials sai | `signedIn`, login sai |
| `403` | Account bị khóa hoặc không có quyền ở flow có kiểm tra quyền | User status != 1 |
| `404` | Không tìm thấy hoặc không thuộc user | product/order/address/payment |
| `409` | Xung đột trạng thái nghiệp vụ | thiếu stock, coupon đã dùng, không thể cancel |
| `423` | Account đang khóa tạm | login sai lần 5 hoặc còn `locked_until` |
| `500` | Lỗi server không được gán status cụ thể | error handler chung |
| `502` | Dịch vụ ngoài từ chối/lỗi | PayPal/Gemini wrapper |
| `503` | Dịch vụ chưa cấu hình/chưa sẵn sàng | thiếu PayPal/Gemini config |

HTTP status chỉ tồn tại trên response của request; nó không được lưu vào cột `status` của model trừ khi controller có câu UPDATE riêng.

### Bản đồ status theo từng luồng

| Luồng | Status được đọc/ghi | Vai trò |
|---|---|---|
| 1. Login | `users.status`, `locked_until` | account active và khóa tạm |
| 2. Product | `products.status=1` | chỉ hiển thị sản phẩm đang bán |
| 3. Combo | `combos.status=true`, Product status được include | bật combo; availability kiểm tra riêng |
| 4. Checkout/PayPal | Product/Coupon/Order/Payment/Shipment status + PayPal COMPLETED | validate bán hàng và chuyển vòng đời order/payment |
| 5. FEFO | không có status riêng; dùng InventoryTransaction `type` | `IN/OUT/ADJUST` là loại giao dịch, không phải status |
| 6. Chatbot | Product/Order/Payment/Shipment/Combo/Recipe active | chỉ đưa dữ liệu phù hợp vào context |
| 7. Admin | có thể chỉnh nhiều status theo resource | cấu hình hiển thị/vòng đời và kích hoạt hooks |
| 8. Cloudinary | không có status nghiệp vụ DB | upload success/error đi qua Promise/HTTP |
| 9. Address | không có status; dùng `is_default` boolean | đánh dấu địa chỉ mặc định, không phải status |

## Các thư viện và nền tảng được sử dụng

### Nhóm trực tiếp tham gia 9 luồng

| Thư viện/nền tảng | Version trong `package.json` | File sử dụng chính | Vai trò dễ hiểu |
|---|---:|---|---|
| Node.js | môi trường chạy, không ghim trong package.json | toàn backend | Chạy JavaScript phía server và cung cấp `fetch`, `Buffer`, `path`, `process.env` |
| `express` | `4.21.2` | `src/index.js`, toàn bộ `src/routes/*.js` | Tạo web server, route, middleware, đọc request và gửi response |
| `express-session` | `^1.19.0` | `src/index.js`, auth/middleware | Tạo session đăng nhập và cookie `nong-san.sid` |
| `sequelize` | `^6.37.8` | `src/models/index.js`, controllers/services | ORM: ánh xạ model JavaScript sang bảng MySQL và tạo SELECT/INSERT/UPDATE/transaction |
| `mysql2` | `^3.22.6` | được Sequelize dùng qua dialect MySQL | Driver kết nối thật tới MySQL; code nghiệp vụ không gọi `mysql2` trực tiếp |
| `bcryptjs` | `^3.0.3` | `src/models/index.js`, `src/controllers/authController.js` | Hash password khi tạo/cập nhật user và so mật khẩu khi login |
| `nunjucks` | `^3.2.4` | `src/config/viewEngine.js`, `src/views/**/*.njk` | Render HTML phía server cho danh sách/detail product và trang combo |
| `dotenv` | `^17.4.2` | `src/config/server.js`, `src/config/config.js` | Nạp biến `.env`: DB, session, PayPal, shipping, exchange rate... |
| PayPal JavaScript SDK | tải từ CDN, không phải npm dependency | `src/public/js/app.js` | Hiển thị PayPal Buttons, kích hoạt `createOrder` và `onApprove` |
| PayPal REST API | HTTP API ngoài | `src/controllers/paymentController.js` | Cấp OAuth token, tạo và capture PayPal order |
| Browser Fetch API | API trình duyệt, không phải thư viện npm | `auth.js`, `app.js`, `combo-cart.js` | Gửi HTTP request từ frontend tới Express API |
| Browser Web Storage API | API trình duyệt | `app.js`, `combo-cart.js` | Lưu cart vào `localStorage` dưới key `nong-san-cart` |

### Express — route và middleware hoạt động thế nào?

```javascript
const express = require("express");
const app = express();
app.use(express.json({ limit: "5mb" }));
app.use("/api/payments", paymentRoutes);
```

- `express()` tạo application server.
- `express.json()` đọc JSON request body rồi gắn object vào `req.body`.
- `app.use('/api/payments', paymentRoutes)` gắn prefix chung. Vì route con là `/paypal/orders`, URL đầy đủ là `/api/payments/paypal/orders`.
- `router.get/post/patch()` chọn controller theo HTTP method và URL.
- `res.status(201).json(...)` thiết lập HTTP status rồi serialize object thành JSON.
- `res.render(...)` nhờ view engine Nunjucks tạo HTML.

### express-session — vì sao backend biết ai đang thanh toán?

```javascript
app.use(session({
  name: "nong-san.sid",
  secret: process.env.SESSION_SECRET || "nong-san-development-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", /* ... */ },
}));
```

- Sau login, code đặt `req.session.userId = user.id`.
- Trình duyệt nhận cookie chứa session ID, không chứa toàn bộ object User.
- Request sau tự gửi cookie; `express-session` tìm session tương ứng và khôi phục `req.session.userId`.
- `httpOnly` ngăn JavaScript frontend đọc cookie; `sameSite:'lax'` giảm một phần rủi ro CSRF; `secure` chỉ bật trong production.
- Source không khai báo `store`, nên dùng MemoryStore mặc định. Session sẽ mất khi server restart và MemoryStore không phù hợp khi chạy nhiều instance/production.

### Sequelize và mysql2 — ORM khác SQL raw ở đâu?

```javascript
const sequelize = new Sequelize(config.database, config.username, config.password, config);
const User = sequelize.define("User", { /* columns */ }, { tableName: "users" });
const user = await User.findOne({ where: { email } });
```

- Sequelize biết model `User` ứng với bảng `users` nhờ `tableName`.
- Controller viết `findOne()` thay vì tự ghép chuỗi SQL. Sequelize tạo câu SQL và truyền cho driver `mysql2`.
- Giá trị như `email` được truyền dưới dạng parameter của ORM, an toàn hơn việc nối trực tiếp vào SQL.
- `include` dựa vào association (`belongsTo`, `hasMany`, `hasOne`) để tạo JOIN/query liên quan.
- `sequelize.transaction(callback)` tự COMMIT khi callback hoàn tất và ROLLBACK khi callback throw.
- `transaction.LOCK.UPDATE` yêu cầu khóa row. Khóa chỉ có ý nghĩa khi query và update dùng cùng object `transaction`.

### bcryptjs — hash và compare

```javascript
// hook model User
user.password_hash = await bcrypt.hash(user.password, 10);
// login
const passwordMatches = await bcrypt.compare(req.body.password, user.password_hash);
```

- `hash(password, 10)` tạo one-way hash với cost factor 10; không thể dùng API bình thường để giải mã về password gốc.
- Mỗi hash chứa salt, nên cùng password có thể tạo hash khác nhau.
- `compare()` đọc salt/cost từ hash, xử lý password người dùng nhập và trả boolean.
- Hook `beforeValidate` giúp code register truyền virtual field `password`, còn model tự tạo `password_hash` trước khi ghi DB.

### Nunjucks — dữ liệu server thành HTML

`src/config/viewEngine.js` cấu hình thư mục `src/views`; controller truyền object vào `res.render()`. Ví dụ vòng lặp `{% for combo in combos %}` trong `pages/combos/index.njk` tạo một card cho mỗi combo, còn `{{ combo.name }}` in giá trị. Nunjucks phục vụ các trang SSR; trang checkout legacy lại được JavaScript trong `app.js` dựng động.

### PayPal SDK, REST API và `fetch`

- Frontend thêm thẻ `<script>` trỏ tới `https://www.paypal.com/sdk/js?...`; sau khi tải xong mới có `window.paypal.Buttons()`.
- PayPal SDK frontend không trực tiếp quyết định số tiền. Callback `createOrder` gọi backend và chỉ trả ID backend nhận từ PayPal.
- Backend dùng `fetch()` của Node.js, không dùng package PayPal SDK: một request OAuth lấy access token, request kế tiếp dùng Bearer token.
- `Buffer.from(clientId + ':' + secret).toString('base64')` tạo phần credentials cho HTTP Basic Auth. Client secret chỉ tồn tại ở backend, không gửi cho browser.
- `PayPal-Request-Id` là idempotency key: retry cùng operation ID giúp giảm nguy cơ tạo/capture trùng ở phía PayPal.

### API JavaScript trình duyệt không phải thư viện npm

- `fetch(url, options)`: gửi request bất đồng bộ và trả Promise; `response.ok` cho biết status thuộc 200–299.
- `FormData(form)`: đọc input có thuộc tính `name`; `Object.fromEntries()` biến nó thành object JSON.
- `localStorage.getItem/setItem()`: lưu cart bền qua reload nhưng người dùng có thể sửa, vì vậy backend phải tính lại giá.
- `URLSearchParams`: đọc `returnTo`, search/category/page và encode query an toàn.
- `CustomEvent('cart:updated')`: thông báo cho các phần giao diện khác render lại cart; không gửi request backend.

### Các package có trong project nhưng không trực tiếp xử lý 5 luồng

| Package | Vai trò thật trong source | Quan hệ với 5 luồng |
|---|---|---|
| `adminjs`, `@adminjs/express`, `@adminjs/sequelize`, `@adminjs/upload` | Trang quản trị và upload tài nguyên | Admin có thể quản lý dữ liệu, nhưng không nằm trên request path khách hàng của 5 flow |
| `express-formidable` | Có trong dependencies nhưng không thấy `require/import` trực tiếp trong source project | Không được khẳng định là một bước của 5 flow; có thể là dependency hỗ trợ hệ sinh thái admin/upload |
| `cloudinary` | Upload ảnh/avatar | Auth profile/admin, không tham gia login password hoặc checkout |
| `joi` | Schema validation cho nhiều CRUD/comment/chat DTO | Hai route PayPal và route login không gắn middleware `validate(JoiSchema)` |
| `sanitize-html` | Làm sạch rich text/news/feedback | Không nằm trong 5 flow đang phân tích |
| `swagger-ui-express`, `yamljs` | Đọc `openapi.yaml` và hiển thị `/api-docs` | Chỉ tài liệu API, không xử lý nghiệp vụ |
| `sequelize-cli` | Chạy migration/create DB từ command line | Không chạy trong mỗi HTTP request |
| `nodemon` | Restart server khi code đổi trong development | Công cụ phát triển |
| `playwright`, Jest và Allure packages | Test E2E/unit và báo cáo test | Không được load trong production flow |
| `newman` | Chạy Postman collection | Công cụ test API ngoài runtime |
| `tslib`, `@types/node`, `cross-env` | hỗ trợ package/type/script | Không có lời gọi nghiệp vụ trực tiếp trong 5 flow |

### Thư viện nào tham gia luồng nào?

| Flow | Thư viện/API chính | Lời gọi tiêu biểu |
|---|---|---|
| Login | Express, express-session, Sequelize/mysql2, bcryptjs, Fetch API | `router.post`, `req.session`, `User.findOne`, `bcrypt.compare`, `fetch` |
| Product | Express, Sequelize/mysql2, Nunjucks | `router.get`, `findAndCountAll`, `include`, `res.render` |
| Combo | Express, Sequelize/mysql2, Nunjucks, Web Storage | `findCombos`, `calculateCombo`, template loop, `localStorage.setItem` |
| Checkout | Express, express-session, Sequelize/mysql2, Fetch API | `signedIn`, `UserAddress.findOne`, `sequelize.transaction`, frontend `fetch` |
| PayPal | PayPal JS SDK, PayPal REST API, Node Fetch/Buffer, Sequelize | `paypal.Buttons`, `paypalRequest`, `/capture`, `Payment.update` |
| FEFO | Sequelize/mysql2 | `findAll`, `Op.gt`, `order`, `LOCK.UPDATE`, `batch.update`, `InventoryTransaction.create` |
| Chatbot | Express/session/Joi, Sequelize, Gemini REST API, Node `child_process`, Python/FAISS | `validate(ChatReq)`, `reply`, `generateJson`, `embedText`, `queryFaiss` |
| Admin edit | AdminJS, `@adminjs/express`, `@adminjs/sequelize`, `@adminjs/upload`, Sequelize, Cloudinary | `buildAuthenticatedRouter`, resource actions, adapter update, upload provider |
| Cloudinary | `cloudinary` v2, dotenv, Browser FileReader, AdminJS upload | `readAsDataURL`, `uploadImage`, `uploader.upload/destroy`, `createUploadPath` |
| User address | Express/session, Fetch API, Sequelize/mysql2 | `addresses`, `addAddress`, `deleteAddress`, `UserAddress.findAll/create/update/destroy` |

---

# LUỒNG 1 — ĐĂNG NHẬP

## 1. Mục đích

Xác thực email/mật khẩu, chặn tài khoản bị vô hiệu hóa hoặc tạm khóa, lưu user ID vào session và trả thông tin an toàn cho frontend.

## 2. Luồng tổng quát

```text
Form #authForm trong src/public/js/auth.js
↓ POST /api/auth/login
src/routes/index.js → src/routes/authRoutes.js
↓ asyncRoute(controller.login) (không có signedIn)
authController.login()
↓ User.findOne() / user.update() / bcrypt.compare()
Sequelize model User → bảng users
↓ req.session.userId = user.id
res.json({ message, data: new UserRespone(user) })
↓ chuyển tới safeReturnTo
```

## 3. Frontend

```text
File: src/public/js/auth.js
Event: submit form #authForm sau khi bấm “Đăng nhập”
API/URL: /api/auth/login
HTTP Method: POST
Request Data: JSON { email, password }
```

```javascript
const payload = Object.fromEntries(new FormData(form));
const response = await fetch(
  `/api/auth/${isLogin ? "login" : "register"}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  },
);
const result = await response.json();
if (!response.ok) throw new Error(result.message || "Không thể xác thực.");
location.href = safeReturnTo;
```

## 4. Route

```text
File: src/routes/authRoutes.js
Route: /api/auth/login (prefix /api/auth từ src/routes/index.js)
HTTP Method: POST
```

```javascript
router.post("/login", asyncRoute(controller.login));
```

```text
Route → asyncRoute → authController.login()
```

## 5. Middleware

- `asyncRoute` (`src/middlewares/asyncRoute.js`): bắt lỗi async và gọi `next(error)`.
- Không có `signedIn`, validate DTO hay middleware role riêng trên route login.
- Middleware toàn app `express-session` tạo/đọc session và cookie `nong-san.sid`.

## 6. Controller

```text
File: src/controllers/authController.js
Function: login(req, res)
```

```javascript
const email = String(req.body.email || "").trim().toLowerCase();
const user = await User.findOne({ where: { email } });
if (!user) return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
if (Number(user.status) !== 1)
  return res.status(403).json({ message: "Tài khoản đã bị khóa." });
// ... kiểm tra locked_until ...
const passwordMatches = await bcrypt.compare(
  String(req.body.password || ""), user.password_hash,
);
// ... tăng failed_login_attempts; khóa 1 giờ ở lần sai thứ 5 ...
req.session.userId = user.id;
res.json({ message: "Đăng nhập thành công.", data: new UserRespone(user) });
```

Các bước:

1. Chuẩn hóa `req.body.email` thành chữ thường; lấy `req.body.password` khi so sánh.
2. `User.findOne({where:{email}})`; không thấy trả 401.
3. `status !== 1` trả 403. `locked_until > now` trả 423 và header `Retry-After`.
4. Hết thời gian khóa thì reset `failed_login_attempts`, `locked_until`.
5. `bcryptjs.compare(plainPassword, user.password_hash)`.
6. Sai: tăng `failed_login_attempts`; lần thứ 5 đặt `locked_until = now + 1 giờ`. Đúng: reset bộ đếm/khóa nếu cần.
7. Lưu duy nhất `req.session.userId = user.id`; trả DTO user. Session mặc định của `express-session` đang dùng MemoryStore vì source không cấu hình store database.

## 7. Service

Controller truy cập Sequelize Model trực tiếp. Không có service đăng nhập.

### Giải thích dễ hiểu từng hàm liên quan

**`login(req, res)`**

- Đầu vào: `email`, `password` từ form đăng nhập.
- `String(...).trim().toLowerCase()` giúp email `"  A@MAIL.COM "` trở thành `"a@mail.com"`, khớp cách dữ liệu được lưu/tìm.
- `User.findOne()` lấy user trước rồi mới so password vì password thật không được lưu; database chỉ có `password_hash`.
- Hàm kiểm tra `status` trước password: account bị admin khóa không được đăng nhập dù mật khẩu đúng.
- `locked_until` là khóa tạm; nếu còn hiệu lực thì dừng ngay. Nếu đã hết hạn, code xóa khóa và đưa bộ đếm về 0.
- `bcrypt.compare()` tự hash mật khẩu người dùng nhập theo thông tin trong hash rồi so an toàn; không giải mã `password_hash`.
- Khi đúng, controller chỉ lưu `user.id` vào session. Các request sau dùng ID này để xác định người dùng.

**`me(req, res)`**

- Dùng khi frontend muốn biết phiên hiện tại đã đăng nhập chưa.
- Không có `session.userId` thì trả `authenticated:false` mà không query DB.
- Có session thì `User.findByPk()` kiểm tra user còn tồn tại và còn active; nếu không, hủy session cũ.

**`asyncRoute(controller.login)`**

- Đây là wrapper, không thực hiện đăng nhập. Nó bảo đảm lỗi Promise trong `login()` được đưa tới error handler chung thay vì làm request bị treo.

### Cơ chế khóa đăng nhập — giải thích chi tiết

#### 1. Hai loại khóa khác nhau

Code hiện tại có hai cơ chế không nên nhầm lẫn:

| Cơ chế | Cột trong `users` | Ý nghĩa | Cách mở khóa trong flow login |
|---|---|---|---|
| Khóa/vô hiệu hóa tài khoản | `status` | `status !== 1` nghĩa là account không được phép đăng nhập | `login()` không tự mở; cần nơi quản trị cập nhật lại status |
| Khóa tạm do sai mật khẩu | `failed_login_attempts`, `locked_until` | Sai 5 lần liên tiếp thì khóa trong 1 giờ | Hết `locked_until`, lần login kế tiếp tự reset rồi cho phép thử lại |

Hai hằng số điều khiển cơ chế khóa tạm:

```javascript
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 60 * 60 * 1000;
```

`60 × 60 × 1000 = 3.600.000 ms = 1 giờ`. Hai giá trị được viết cố định trong controller, không lấy từ `.env` hoặc bảng cấu hình.

#### 2. Thứ tự kiểm tra chính xác

```text
Chuẩn hóa email
↓
User.findOne({ where: { email } })
├─ Không có user → 401; không có bộ đếm nào để UPDATE
└─ Có user
   ↓
   status !== 1?
   ├─ Có → 403 “Tài khoản đã bị khóa”
   └─ Không
      ↓
      locked_until > thời điểm hiện tại?
      ├─ Có → 423 + Retry-After; KHÔNG gọi bcrypt.compare()
      └─ Không
         ↓
         locked_until từng có nhưng đã hết hạn?
         ├─ Có → reset attempts=0, locked_until=null
         └─ Không → giữ nguyên
         ↓
         bcrypt.compare(password, password_hash)
         ├─ Sai → tăng attempts; nếu đạt 5 thì khóa 1 giờ
         └─ Đúng → reset attempts/lock và tạo session
```

Điểm đáng chú ý: controller kiểm tra `status` và khóa tạm **trước** khi chạy bcrypt. Vì vậy account đang khóa không tốn thêm phép hash comparison và một lần thử trong thời gian khóa không làm bộ đếm tăng thêm hay kéo dài thời gian khóa.

#### 3. Khi tài khoản đang trong một giờ khóa

```javascript
if (user.locked_until && new Date(user.locked_until) > now) {
  const retryAfterSeconds = Math.ceil(
    (new Date(user.locked_until).getTime() - now.getTime()) / 1000,
  );
  res.set("Retry-After", String(retryAfterSeconds));
  return res.status(423).json({
    message: "Tài khoản tạm khóa do đăng nhập sai 5 lần liên tiếp. Vui lòng thử lại sau.",
    lockedUntil: user.locked_until,
  });
}
```

- `locked_until > now` nghĩa là khóa còn hiệu lực.
- HTTP 423 (`Locked`) phân biệt trạng thái này với sai credentials 401 và account disabled 403.
- `Retry-After` là số giây còn lại, tính bằng `Math.ceil()` để không trả 0 khi vẫn còn một phần giây.
- JSON còn trả `lockedUntil` để frontend có thể hiển thị thời điểm mở khóa.
- Frontend hiện tại chỉ dùng `result.message`; không thấy code countdown hoặc xử lý riêng header `Retry-After`.
- Hàm return ngay, nên password đúng trong thời gian khóa vẫn không được kiểm tra và không đăng nhập được.

#### 4. Bộ đếm thay đổi sau từng lần sai

```javascript
const failedLoginAttempts = Number(user.failed_login_attempts || 0) + 1;
if (failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
  const lockedUntil = new Date(Date.now() + LOGIN_LOCK_DURATION_MS);
  await user.update({
    failed_login_attempts: MAX_LOGIN_ATTEMPTS,
    locked_until: lockedUntil,
  });
  // trả 423
}
await user.update({ failed_login_attempts: failedLoginAttempts });
// trả 401
```

| Trạng thái trước request | Password | Giá trị ghi xuống `users` | Response |
|---|---|---|---|
| attempts = 0 | sai lần 1 | attempts = 1, chưa có lock | 401 |
| attempts = 1 | sai lần 2 | attempts = 2 | 401 |
| attempts = 2 | sai lần 3 | attempts = 3 | 401 |
| attempts = 3 | sai lần 4 | attempts = 4 | 401 |
| attempts = 4 | sai lần 5 | attempts = 5, `locked_until = now + 1 giờ` | 423 |
| attempts = 5, lock còn hạn | đúng hoặc sai | không UPDATE | 423 |

Ở nhánh lần thứ 5, code lưu attempts đúng bằng `MAX_LOGIN_ATTEMPTS`, không tiếp tục tăng thành 6, 7... Trong thời gian khóa, mọi request đều return trước nhánh cộng bộ đếm.

#### 5. Điều gì xảy ra sau khi hết một giờ?

```javascript
if (user.locked_until) {
  await user.update({ failed_login_attempts: 0, locked_until: null });
}
```

Nhánh này chỉ chạy sau khi điều kiện `locked_until > now` không còn đúng. Có nghĩa là:

1. Database không có scheduler tự mở khóa đúng thời điểm.
2. Hai cột vẫn có thể giữ `5` và thời gian cũ trong DB sau một giờ.
3. Request login đầu tiên sau khi hết hạn phát hiện thời gian cũ, reset hai cột rồi mới so password.
4. Nếu password request đó sai, code lại tăng từ 0 thành 1.
5. Nếu password đúng, session được tạo bình thường.

Đây là cơ chế “mở khóa lười” (lazy unlock): chỉ dọn trạng thái khi có request tiếp theo.

#### 6. Khi nhập đúng trước lần sai thứ 5

```javascript
if (user.failed_login_attempts || user.locked_until) {
  await user.update({ failed_login_attempts: 0, locked_until: null });
}
req.session.userId = user.id;
```

Ví dụ user đã sai 3 lần rồi nhập đúng: code xóa bộ đếm về 0, không giữ 3 lần sai cho lần đăng nhập sau. Vì vậy “5 lần liên tiếp” trong message đúng với hành vi: một lần thành công phá chuỗi thất bại.

#### 7. Database thay đổi ở nhánh nào?

```text
Email không tồn tại       → không UPDATE
status !== 1              → không UPDATE
lock còn thời hạn         → không UPDATE
lock đã hết hạn           → UPDATE reset
password sai lần 1..4     → UPDATE failed_login_attempts
password sai lần 5        → UPDATE failed_login_attempts + locked_until
password đúng sau lần sai → UPDATE reset
password đúng, bộ đếm=0   → không UPDATE user; chỉ lưu session
```

SQL tương đương cho lần khóa:

```sql
UPDATE users
SET failed_login_attempts = 5,
    locked_until = ?
WHERE id = ?;
```

SQL tương đương khi reset:

```sql
UPDATE users
SET failed_login_attempts = 0,
    locked_until = NULL
WHERE id = ?;
```

#### 8. Ví dụ timeline hoàn chỉnh

```text
08:00 sai lần 1 → attempts=1 → HTTP 401
08:01 sai lần 2 → attempts=2 → HTTP 401
08:02 sai lần 3 → attempts=3 → HTTP 401
08:03 sai lần 4 → attempts=4 → HTTP 401
08:04 sai lần 5 → attempts=5, locked_until=09:04 → HTTP 423
08:20 nhập đúng  → lock còn hạn, không compare password → HTTP 423
09:05 nhập đúng  → reset attempts/lock → compare đúng → session.userId → HTTP 200
```

#### 9. Các giới hạn và rủi ro của implementation hiện tại

- **Không có transaction/atomic increment:** code đọc attempts từ object rồi `user.update()`. Hai request sai đồng thời có thể cùng đọc một giá trị và cùng ghi một giá trị mới, làm mất một lần đếm.
- **Khóa theo account, không theo IP:** người biết email có thể cố tình làm account người khác bị khóa. Source không có rate limit theo IP/device và không có CAPTCHA.
- **Khác response có thể tiết lộ trạng thái:** email không tồn tại và password sai cùng trả message chung 401, đây là điểm tốt; nhưng account `status!==1` trả 403 và account tạm khóa trả 423, nên người gọi có thể suy ra email tồn tại trong hai trường hợp này.
- **MemoryStore session:** login thành công nhưng session có thể mất khi server restart; chạy nhiều server instance cũng không chia sẻ session nếu chưa cấu hình store chung.
- **Không cấu hình hóa ngưỡng/thời gian:** muốn đổi 5 lần hoặc 1 giờ phải sửa code và deploy lại.
- **Không ghi audit riêng:** source chỉ lưu số lần sai và thời điểm khóa trên `users`; không có bảng lịch sử login attempt gồm IP, user-agent hoặc từng timestamp.
- **Không gửi thông báo:** không thấy email/SMS cảnh báo khi account bị khóa.

#### 10. Câu trả lời ngắn khi bảo vệ

> `login()` đọc `users` bằng email. Nếu password sai, hàm tăng `failed_login_attempts`; đến lần thứ 5 thì đặt `locked_until` bằng thời điểm hiện tại cộng một giờ và trả HTTP 423. Trong thời gian đó hàm dừng trước `bcrypt.compare()`. Request đầu tiên sau khi hết hạn sẽ reset hai cột; đăng nhập đúng cũng reset chuỗi lần sai. Cơ chế hiện chưa dùng transaction/atomic increment và chưa có rate limit theo IP.

## 8. Model và bảng MySQL

| Model | Table | Operation | Mục đích |
|---|---|---|---|
| `User` | `users` | SELECT | tìm user bằng email |
| `User` | `users` | UPDATE | reset/tăng số lần sai, đặt/xóa thời gian khóa |

## 9. Database Query

**`login()` — tìm user**

```text
Model: User
Table: users
Operation: SELECT
Điều kiện: email = email đã trim/lowercase
Dữ liệu lấy: toàn bộ thuộc tính mặc định, gồm id, email, password_hash, status, failed_login_attempts, locked_until...
```

```sql
SELECT * FROM users WHERE email = ? LIMIT 1;
```

**`login()` — cập nhật thất bại/khóa/reset**

```text
Model: instance User
Table: users
Operation: UPDATE
Điều kiện: id = user.id
Dữ liệu cập nhật tùy nhánh: failed_login_attempts; locked_until
```

```sql
UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?;
```

## 10. Transaction

Không sử dụng transaction trong `login()`. Mỗi `user.update()` là một câu UPDATE độc lập; hai request sai đồng thời có khả năng ghi đè bộ đếm (race condition).

## 11. Response

- 200: `res.json({message:"Đăng nhập thành công.", data:new UserRespone(user)})`; frontend chuyển URL.
- 401: không tìm thấy user hoặc sai password.
- 403: `status !== 1`.
- 423: đang bị khóa hoặc vừa sai lần thứ 5, có `lockedUntil` và `Retry-After`.

## 12. Tóm tắt

```text
auth.js submit → POST /api/auth/login → asyncRoute → authController.login()
→ User.findOne()/user.update() → users → bcrypt.compare()
→ session.userId → JSON UserRespone → redirect safeReturnTo
```

**Trả lời giảng viên:** Đăng nhập gọi `login()` trong `src/controllers/authController.js`, dùng `User.findOne({where:{email}})` đọc bảng `users`, rồi `bcrypt.compare()` so mật khẩu. Các lần đăng nhập sai/reset khóa dùng `user.update()` trên chính bảng `users`.

---

# LUỒNG 2 — TÌM KIẾM VÀ XEM SẢN PHẨM

## 1. Mục đích

Liệt kê sản phẩm còn hoạt động, lọc danh mục/từ khóa, phân trang và mở trang chi tiết.

## 2. Luồng tổng quát

```text
GET /san-pham?search=&category=&page=
→ viewRoutes.js → viewController.getProductsPage()
→ Product.findAndCountAll() + Category.findAll()
→ products JOIN categories/brands/product_images → res.render(index.njk)

GET /san-pham/:id
→ viewController.getProductDetailPage()
→ Product.findOne(include Category, Brand, ProductImage)
→ res.render(detail.njk)
```

Ngoài SSR, API `GET /api/products` gọi `productController.getProducts()` và `GET /api/products/:id` gọi `getProductById()`. Legacy JS còn dùng `GET /api/storefront`. Đây là các entry point thật song song.

## 3. Frontend

```text
File: src/views/pages/products/index.njk
Event: submit form tìm kiếm / bấm category / pagination
API/URL: /san-pham?search=...&category=...&page=...
HTTP Method: GET
Request Data: query search, category, page
```

```njk
<form class="product-search" method="get" action="/san-pham">
  <input name="search" value="{{ search }}">
  {% if selectedCategory %}<input type="hidden" name="category" value="{{ selectedCategory }}">{% endif %}
</form>
```

Ở legacy `src/public/js/app.js`, submit `#searchForm` cập nhật `state.search` rồi gọi `loadProducts()` hoặc điều hướng `/san-pham?search=...`; card liên kết tới `/san-pham/${id}`.

## 4. Route

```javascript
// src/routes/viewRoutes.js
router.get("/san-pham", controller.getProductsPage);
router.get("/san-pham/:id", controller.getProductDetailPage);
// src/routes/productRoutes.js, prefix /api/products
router.get("/", asyncRoute(controller.getProducts));
router.get("/:id", asyncRoute(controller.getProductById));
```

Không có middleware xác thực; view controller tự `try/catch` và gọi `next(error)`.

## 5. Middleware

Không có middleware nghiệp vụ riêng cho list/detail. API dùng `asyncRoute`; view controller tự chuyển lỗi.

## 6. Controller

```text
File: src/controllers/viewController.js
Functions: getProductsPage(), getProductDetailPage()
```

```javascript
const where = { status: 1 };
if (categoryId) where.category_id = categoryId;
if (search) where.name = { [Op.like]: `%${search}%` };
const [{ rows: products, count: total }, categories] = await Promise.all([
  db.Product.findAndCountAll({
    where, distinct: true,
    include: [db.Category, db.Brand, { model: db.ProductImage, required: false }],
    order: [["createdAt", "DESC"]], limit, offset: (page - 1) * limit,
  }),
  db.Category.findAll({ order: [["name", "ASC"]] }),
]);
```

List lấy query, ép page >= 1, limit cố định 8, thêm `status=1`, optional category/search, query song song products/categories, rồi render cùng pagination. Detail lấy `req.params.id`, luôn thêm `status=1`, include ba association và trả 404 view nếu không có.

## 7. Service

Controller truy cập Sequelize Model trực tiếp. Chỉ có helper nội bộ `decorateProduct()` để format tiền, unit và chọn ảnh chính; không truy cập DB.

### Giải thích dễ hiểu từng hàm liên quan

**`getProductsPage(req, res, next)`**

- Đầu vào: `page`, `category`, `search` từ URL.
- `Math.max(..., 1)` không cho page nhỏ hơn 1; `limit=8` nghĩa là mỗi trang tối đa 8 sản phẩm.
- `where` luôn có `status:1`, nên sản phẩm ẩn/ngừng bán không xuất hiện.
- Nếu có keyword, `[Op.like]: '%keyword%'` tìm tên chứa keyword, không chỉ tên khớp tuyệt đối.
- `Promise.all()` chạy query sản phẩm và query danh mục đồng thời vì hai query không phụ thuộc nhau.
- `distinct:true` giúp phần COUNT không bị tăng sai khi một sản phẩm JOIN nhiều ảnh.
- `offset=(page-1)*limit`: trang 1 bỏ qua 0, trang 2 bỏ qua 8, trang 3 bỏ qua 16.
- Cuối cùng hàm không trả JSON mà truyền dữ liệu vào `pages/products/index.njk` để tạo HTML.

**`getProductDetailPage(req, res, next)`**

- Lấy ID từ `req.params.id`, tìm đồng thời điều kiện `id` và `status:1`.
- `include` lấy Category, Brand và nhiều ProductImage liên quan.
- Không có product thì render trang 404; có thì `decorateProduct()` chuẩn hóa dữ liệu hiển thị rồi render detail.

**`decorateProduct(instance)`**

- Chuyển Sequelize instance thành object thuần qua `.get({plain:true})`.
- Tạo chuỗi giá đã format, chỉ hiện giá cũ khi `oldprice > price`.
- Chọn `product.image` trước; nếu thiếu thì lấy ProductImage có `sort_order` nhỏ nhất.

**`syncProductQuantity(productId, transaction)`**

- Cộng `remaining_quantity` của mọi lô thuộc product.
- Ghi tổng đó vào `products.quantity`; nếu SUM trả `null` thì ghi 0.
- Đây là lý do controller sản phẩm chỉ cần đọc `Product.quantity` mà không phải tính lại tất cả batch cho mỗi lượt xem.

## 8. Model và bảng MySQL

| Model | Table | Operation | Mục đích |
|---|---|---|---|
| Product | products | SELECT + COUNT | list/search/detail, giá và `quantity` |
| Category | categories | SELECT/JOIN | filter và tên danh mục |
| Brand | brands | LEFT JOIN | thương hiệu |
| ProductImage | product_images | LEFT JOIN | ảnh phụ |

Associations thật: `Product.belongsTo(Category, category_id)`, `Product.belongsTo(Brand, brand_id)`, `Product.hasMany(ProductImage, product_id)`.

## 9. Database Query

```text
Function: getProductsPage / getProducts / getStorefront
Model: Product
Table: products (+ categories, brands, product_images do include)
Operation: SELECT + COUNT
Điều kiện: products.status=1; optional category_id=?; optional name LIKE '%keyword%'
Dữ liệu: product và các bản ghi association; LIMIT 8 (API cho phép 1..24), OFFSET
```

```sql
SELECT DISTINCT p.*, c.*, b.*, pi.*
FROM products p
LEFT JOIN categories c ON c.id=p.category_id
LEFT JOIN brands b ON b.id=p.brand_id
LEFT JOIN product_images pi ON pi.product_id=p.id
WHERE p.status=1 AND p.category_id=? AND p.name LIKE ?
ORDER BY p.created_at DESC LIMIT ? OFFSET ?;
```

```text
Function: getProductDetailPage / getProductById
Model: Product
Table: products + categories + brands + product_images
Operation: SELECT
Điều kiện: products.id=req.params.id AND products.status=1
```

**Tồn kho:** UI đọc `Product.quantity` từ bảng `products`, không SUM batch trong request list/detail. Tuy nhiên hook `ProductBatch.afterCreate/afterUpdate/afterDestroy` gọi `syncProductQuantity()`: `ProductBatch.sum("remaining_quantity")` trên `product_batches`, rồi `Product.update({quantity})`. Vì vậy chuỗi nguồn là `product_batches.remaining_quantity → SUM → products.quantity → UI`.

Không include `Feedback` trong list/detail hiện tại; route comment là API riêng. Không có query stock trực tiếp ở controller sản phẩm.

## 10. Transaction

Không có transaction trong list/search/detail. Đồng bộ quantity nhận transaction của thao tác batch nếu caller truyền vào.

## 11. Response

- SSR: `res.render("pages/products/index.njk", ...)` hoặc `detail.njk`.
- API: `res.json({data, pagination})`; detail `res.status(200).json({data})`.
- Không thấy product active: 404 JSON hoặc render `pages/not-found.njk` tùy entry point.

## 12. Tóm tắt

```text
Browser → GET /san-pham hoặc /san-pham/:id → viewRoutes.js
→ viewController.getProductsPage()/getProductDetailPage()
→ Product.findAndCountAll()/findOne() → products + categories + brands + product_images
→ res.render(Nunjucks)
```

**Khi mở một sản phẩm:** hệ thống lấy `products` và JOIN `categories`, `brands`, `product_images`. Nó không lấy `product_batches` hay `feedback` ở request detail; số tồn trả về là cột đã đồng bộ `products.quantity`.

---

# LUỒNG 3 — MUA COMBO NHÀ HÀNG

## 1. Mục đích

Hiển thị combo, thành phần, giá mua lẻ/giá combo/tiết kiệm, số combo khả dụng và thêm tối thiểu N combo vào local cart.

## 2. Luồng tổng quát

```text
GET /combo-nha-hang → viewController.getCombosPage()
→ comboService.findCombos() → Combo.findAll(include ComboItem → Product)
  + ComboSetting.findByPk(1) → calculateCombo()
→ combos/combo_items/products/combo_settings → res.render(combos/index.njk)
→ click [data-combo-add] → combo-cart.js → localStorage nong-san-cart
→ checkout POST gửi {type:"combo", comboId, quantity}
→ paymentController.createOrder() gọi lại findCombos() từ DB
```

## 3. Frontend

```text
File: src/views/pages/combos/index.njk + src/public/js/combo-cart.js
Event: click nút [data-combo-add]
API/URL: không gọi API ở thao tác thêm; ghi localStorage
HTTP Method: không có
Request Data khi checkout: { type:"combo", comboId, quantity }
```

```javascript
const existing = cart.find((item) => item.type === "combo" && Number(item.comboId) === comboId);
if (existing) existing.qty += minimum;
else cart.push({ id: `combo-${comboId}`, comboId, type: "combo",
  name: button.dataset.comboName, price: Number(button.dataset.comboPrice),
  minimumQuantity: minimum, qty: minimum, freeShipping: true });
localStorage.setItem("nong-san-cart", JSON.stringify(cart));
```

Giá/name/image trong localStorage chỉ phục vụ hiển thị. Checkout map combo thành `{type, comboId, quantity}`; backend không nhận danh sách product hay tin giá frontend.

## 4. Route

```javascript
router.get("/combo-nha-hang", controller.getCombosPage);
// API prefix /api/combos
router.get("/", asyncRoute(controller.list));
router.get("/:id", asyncRoute(controller.detail));
```

Không có middleware auth cho xem combo; API dùng `asyncRoute`.

## 5. Middleware

Không có middleware nghiệp vụ riêng. Checkout combo sau đó đi qua `signedIn` của payment route.

## 6. Controller

```text
File: src/controllers/viewController.js
Function: getCombosPage()
File: src/controllers/comboController.js
Functions: list(), detail()
```

```javascript
const combos = (await findCombos()).map((combo) => ({
  ...combo,
  displayRetailPrice: formatMoney(combo.retailPrice),
  displayComboPrice: formatMoney(combo.comboPrice),
  displaySavings: formatMoney(combo.savings),
}));
res.render("pages/combos/index.njk", { /* ... */ combos });
```

## 7. Service

```text
File: src/services/comboService.js
Functions: findCombos(), calculateCombo()
Models: Combo, ComboItem, Product, ComboSetting
```

```javascript
const quantity = Number(item.base_quantity) * multiplier;
const retailPrice = roundMoney(items.reduce((sum, item) => sum + item.retailTotal, 0));
if (plain.price_mode === "fixed") comboPrice = retailPrice - Number(plain.discount_value || 0);
else if (plain.price_mode === "manual") comboPrice = Number(plain.manual_price || 0);
else comboPrice = retailPrice * (1 - Number(plain.discount_value || 0) / 100);
const savings = Math.max(0, retailPrice - comboPrice);
const availableQuantity = items.length ? Math.min(...items.map((item) => item.availableSets)) : 0;
```

Công thức thật:

- Thành phần cần/1 combo = `base_quantity × quantity_multiplier`.
- Giá lẻ thành phần = `round(product.price × quantity)`; retail = tổng các thành phần.
- `fixed`: retail − discount_value; `manual`: manual_price; `percent`: retail × (1 − discount_value/100); sau đó round và không âm.
- Saving = max(0, retail − comboPrice); percent saving = round(saving/retail×100).
- `availableSets` từng item = floor(`Product.quantity / required quantity`); available combo = MIN các item.
- Chỉ trả combo `status=true`, có item, stock > 0, comboPrice > 0 và comboPrice < retailPrice.
- Minimum quantity thật được override bằng `ComboSetting.findByPk(1).minimum_quantity`, fallback 1; không dùng trực tiếp `Combo.minimum_quantity` trong kết quả.

### Giải thích dễ hiểu từng hàm liên quan

**`findCombos({includeUnavailable, id})`**

- Tạo điều kiện query: có `id` thì lọc một combo; mặc định thêm `status:true`.
- Một query lấy Combo cùng ComboItems và Product; query còn lại lấy cấu hình minimum tại ID 1. Hai query chạy đồng thời.
- Sau khi có dữ liệu, mỗi combo được đưa qua `calculateCombo()`.
- Mặc định loại tiếp combo mà `isAvailable=false`; option `includeUnavailable=true` mới giữ các combo không bán được.

**`calculateCombo(combo)`**

- `.get({plain:true})` loại bỏ lớp Sequelize để tính toán trên object bình thường.
- Với từng ComboItem, hàm tính lượng thật cần dùng, giá lẻ của dòng và số bộ tối đa mà product đó đáp ứng.
- Product khan hiếm nhất quyết định `availableQuantity`. Ví dụ item A đủ 10 bộ, B đủ 4 bộ thì combo chỉ bán được 4.
- Nhánh `price_mode` quyết định cách tính giá: giảm số tiền cố định, giá manual, hoặc giảm phần trăm.
- `roundMoney()` làm tròn đến đồng và không cho kết quả âm.
- `isAvailable` không chỉ kiểm tra tồn kho: giá combo phải dương và phải thấp hơn tổng giá mua lẻ.

**`comboController.detail(req, res)`**

- Ép URL ID thành Number rồi gọi `findCombos({id})`.
- Vì `findCombos()` mặc định loại combo unavailable, combo hết hàng cũng nhận response 404 giống combo không tồn tại.

**Handler trong `combo-cart.js`**

- Không trừ kho và không tạo cart trong database.
- Lần đầu thêm sẽ tạo một object combo trong `nong-san-cart`; lần sau tăng `qty` thêm đúng `minimum`.
- Dữ liệu này có thể bị sửa ở trình duyệt, nên lúc checkout server chỉ tin `comboId` và quantity sau khi đã validate.

### Ví dụ tính combo từ đầu đến cuối

Ví dụ minh họa dưới đây áp dụng **đúng công thức của code**, các con số chỉ để giúp hiểu thuật toán:

```text
Combo.quantity_multiplier = 2

ComboItem cà chua:
base_quantity = 3, Product.price = 20.000, Product.quantity = 25
→ quantity cần/1 combo = 3 × 2 = 6
→ retailTotal = 20.000 × 6 = 120.000
→ availableSets = floor(25 / 6) = 4

ComboItem thịt bò:
base_quantity = 1, Product.price = 180.000, Product.quantity = 7
→ quantity cần/1 combo = 1 × 2 = 2
→ retailTotal = 180.000 × 2 = 360.000
→ availableSets = floor(7 / 2) = 3

retailPrice = 120.000 + 360.000 = 480.000
availableQuantity = MIN(4, 3) = 3 combo
```

Nếu `price_mode='percent'`, `discount_value=10`:

```text
comboPrice = round(480.000 × (1 - 10/100)) = 432.000
savings = 480.000 - 432.000 = 48.000
savingsPercent = round(48.000 / 480.000 × 100) = 10%
```

Nếu `price_mode='fixed'`, `discount_value=50.000`: giá combo = `480.000 − 50.000 = 430.000`. Nếu `price_mode='manual'`, code dùng trực tiếp `manual_price`. Cuối cùng `isAvailable` chỉ true khi combo active, có item, còn ít nhất một bộ, giá dương và giá combo thấp hơn retail.

### Combo được bung thành OrderDetail như thế nào?

Giả sử người dùng mua 2 combo giá 432.000/combo. Tổng combo cần ghi vào order là 864.000. Backend không tạo một OrderDetail “ảo” duy nhất; nó tạo dòng cho từng Product thật để FEFO có thể xuất kho:

```javascript
const quantity = item.quantity * comboQuantity;
const lineTotal = index === combo.items.length - 1
  ? combo.comboPrice * comboQuantity - allocated
  : Math.round((item.retailTotal / combo.retailPrice)
      * combo.comboPrice * comboQuantity);
details.push({
  product: { id: item.productId, name: item.name, unit: item.unit },
  quantity,
  price: quantity ? lineTotal / quantity : 0,
  comboId: combo.id,
  comboName: combo.name,
  comboQuantity,
});
```

- `quantity`: tổng lượng product phải xuất cho tất cả combo được mua.
- `lineTotal`: chia giá combo cho từng thành phần theo tỷ trọng giá lẻ.
- `allocated`: nhớ số tiền đã phân bổ; item cuối nhận phần còn lại để xử lý sai số làm tròn.
- `price` của OrderDetail là đơn giá đã phân bổ, không nhất thiết bằng `Product.price` mua lẻ.
- `combo_id`, `combo_name`, `combo_quantity` giữ dấu vết dòng này sinh từ combo nào.
- `orderInventory.reserve()` sau đó chỉ cần đọc `product_id` và `quantity` của từng detail để xuất batch FEFO.

### Ba lớp kiểm tra combo

```text
Lớp 1 — Trang combo
findCombos() chỉ hiển thị combo đang active và tính là còn hàng
↓
Lớp 2 — Local cart
frontend giữ comboId, qty và minimum để hiển thị/điều chỉnh
↓
Lớp 3 — Checkout backend
createOrder() reload combo từ DB, kiểm tra minimum/available và tính lại giá
↓
Lớp 4 — Capture/FEFO
reserve() khóa các batch và xác nhận tồn thực tế lần cuối
```

Cart không “giữ chỗ” tồn kho. `availableQuantity` có thể thay đổi từ lúc mở trang đến lúc capture; row lock và kiểm tra trong `reserve()` mới là lớp bảo vệ database cuối cùng.

## 8. Model và bảng MySQL

| Model | Table | Operation | Mục đích |
|---|---|---|---|
| Combo | combos | SELECT | cấu hình/giá combo |
| ComboItem | combo_items | JOIN | FK `combo_id`, `product_id`, `base_quantity` |
| Product | products | JOIN | tên, giá, quantity, unit, image, status |
| ComboSetting | combo_settings | SELECT PK=1 | minimum quantity toàn cục |
| ProductBatch | product_batches | gián tiếp | nguồn đồng bộ cho Product.quantity |

## 9. Database Query

```text
Function: findCombos()
Model: Combo
Table: combos JOIN combo_items JOIN products
Operation: SELECT
Điều kiện: combos.status=true; optional combos.id=id
Dữ liệu: combo + items + Product[id,name,price,quantity,unit,image,status]
Order: sort_order ASC, createdAt DESC
```

```sql
SELECT c.*, ci.*, p.id,p.name,p.price,p.quantity,p.unit,p.image,p.status
FROM combos c JOIN combo_items ci ON ci.combo_id=c.id
JOIN products p ON p.id=ci.product_id
WHERE c.status=TRUE ORDER BY c.sort_order ASC,c.created_at DESC;
SELECT * FROM combo_settings WHERE id=1;
```

## 10. Transaction

Đọc/hiển thị combo không dùng transaction. Checkout reload combo trước transaction tạo order; kiểm tra stock ban đầu vì thế không khóa row. Khóa batch thật diễn ra khi capture trong `orderInventory.reserve()`.

## 11. Response

SSR `res.render("pages/combos/index.njk", {combos})`; API trả `{data}`. Add-to-cart chỉ ghi localStorage. Khi checkout, backend reload toàn bộ active/available combo qua `findCombos()`, tìm theo `comboId`, kiểm tra minimum/available, tính lại giá và bung combo thành các `OrderDetail` sản phẩm.

## 12. Tóm tắt

```text
GET /combo-nha-hang → getCombosPage() → findCombos() → calculateCombo()
→ Combo/ComboItem/Product/ComboSetting → combos/combo_items/products/combo_settings
→ render → localStorage(comboId, qty) → createOrder() reload DB
```

**Một combo liên quan:** trực tiếp `combos`, `combo_items`, `products`, `combo_settings`; tồn kho gốc gián tiếp từ `product_batches`. Checkout còn ghi combo metadata vào `order_details`.

---

# LUỒNG 4 — CHECKOUT + THANH TOÁN PAYPAL

## 1. Mục đích

Xác thực cart/address/coupon bằng dữ liệu server, tạo đơn nội bộ và PayPal order, sau approval capture/verify rồi xuất kho atomically.

## 2. Luồng tổng quát

```text
/thanh-toan → setupPaypalCheckout()
→ GET /api/auth/me + /api/auth/addresses + /api/payments/paypal/config
→ POST /api/payments/paypal/orders
→ signedIn → paymentController.createOrder()
→ validate address/products/combos; recalculate subtotal/coupon/shipping
→ transaction 1: INSERT Order/OrderDetail/Shipment/Payment/(OrderCoupon/CouponUser), UPDATE Coupon
→ COMMIT → paypalRequest(POST /v2/checkout/orders) → UPDATE payments.transaction_code
→ PayPal approval
→ POST /api/payments/paypal/orders/:id/capture
→ captureOrder() → PayPal capture → verify status/currency/exact amount
→ transaction 2: orderInventory.reserve() → Payment.update() → Order.update()
→ JSON → clear cart → /don-hang/:id
```

## 3. Frontend

```text
File: src/public/js/app.js
Function/Event: setupPaypalCheckout(); PayPal Buttons createOrder/onApprove
API: POST /api/payments/paypal/orders; POST /api/payments/paypal/orders/:id/capture
Request create: {addressId,couponCode,items:[{type,id|comboId,quantity}]}
Request capture: params id, body rỗng
```

```javascript
body: JSON.stringify({
  addressId,
  couponCode: appliedCouponCode || undefined,
  items: state.cart.map((item) => item.type === "combo"
    ? { type: "combo", comboId: item.comboId, quantity: item.qty }
    : { type: "product", id: item.id, quantity: item.qty }),
})
// onApprove
fetch(`/api/payments/paypal/orders/${encodeURIComponent(data.orderID)}/capture`, { method: "POST" });
```

Coupon preview gửi `{code, subtotal}` tới `/api/payments/coupons/validate`, nhưng create order lại khóa và validate coupon/tính discount từ DB. Tổng frontend chỉ để hiển thị.

## 4. Route

```javascript
// src/routes/paymentRoutes.js; prefix /api/payments
router.get("/paypal/config", controller.getConfig);
router.post("/coupons/validate", signedIn, asyncRoute(controller.validateCoupon));
router.post("/paypal/orders", signedIn, asyncRoute(controller.createOrder));
router.post("/paypal/orders/:id/capture", signedIn, asyncRoute(controller.captureOrder));
```

## 5. Middleware

- `signedIn`: chỉ cho qua khi có `req.session.userId`.
- `asyncRoute`: chuyển lỗi async.
- Ownership ở capture không nằm trong middleware: `Payment.findOne(include Order where user_id=session.userId)` thực hiện trong controller.
- Không có middleware DTO/Joi cho hai PayPal route; controller tự validate.

## 6. Controller

```text
File: src/controllers/paymentController.js
Functions: createOrder(), captureOrder(), paypalRequest(), getExchangeRate()
```

`createOrder()` gom trùng ID bằng Map, yêu cầu integer ID/quantity 1..99; query address thuộc user, active products và reload combo. Nó kiểm tra `Product.quantity`, combo minimum/availability; lấy `Product.price` và `combo.comboPrice` từ DB; bung combo thành product details và phân bổ tổng giá combo tỷ lệ theo retail total (item cuối nhận phần chênh rounding). Combo làm shipping fee = 0.

```javascript
order = await db.Order.create({ user_id: req.session.userId, address_id: address.id,
  status: 0, subtotal, shipping_fee: shippingFee, discount, total }, { transaction });
await db.OrderDetail.bulkCreate(details.map(/* server-calculated fields */), { transaction });
await db.Shipment.create({ order_id: order.id, /* address snapshot */ }, { transaction });
payment = await db.Payment.create({ order_id: order.id, method: "PAYPAL", status: 0, amount: total }, { transaction });
```

Sau commit, `paypalRequest()` lấy OAuth token rồi POST `/v2/checkout/orders`, amount USD = `(total / PAYPAL_VND_PER_USD).toFixed(2)`, `reference_id/custom_id=order.id`. PayPal ID được lưu ở `payments.transaction_code`; full response lưu `gateway_response`.

`captureOrder()` tìm payment + order thuộc session, idempotent nếu payment.status=1; gọi PayPal capture; xác minh cả order/capture status `COMPLETED`, currency `USD`, và chuỗi amount đúng `expectedUsd`.

## 7. Service/API ngoài

- `comboService.findCombos()`: reload/tính combo server-side.
- `couponService.normalizeCode/validateCouponRecord/calculateDiscount`: validate ngày, status, quota, min order và tính discount.
- `orderInventory.reserve(orderId, transaction)`: FEFO, mô tả ở luồng 5.
- `paypalRequest(path, options)`: PayPal OAuth `/v1/oauth2/token`, sau đó `/v2/checkout/orders` hoặc capture. Không có module PayPal SDK riêng.

### Giải thích dễ hiểu từng hàm liên quan

**`setupPaypalCheckout()` — frontend**

- Đầu tiên render cart từ localStorage để người mua xem; subtotal này chỉ là preview.
- Gọi song song `/me`, `/addresses`, `/paypal/config`. Nếu chưa login hoặc chưa có address thì dừng trước khi dựng nút PayPal.
- Khi bấm áp dụng coupon, API validate chỉ giúp preview discount. Mã vẫn bị validate lần nữa lúc tạo order.
- `window.paypal.Buttons({createOrder,onApprove})` nối vòng đời nút PayPal với hai endpoint backend.
- Callback `createOrder` phải trả PayPal order ID; SDK dùng ID đó mở bước xác nhận PayPal.
- `onApprove` nhận `data.orderID`, gọi capture backend; chỉ sau response thành công frontend mới xóa cart và redirect.

**`createOrder(req, res)` — backend tạo đơn chờ thanh toán**

- Hai Map `quantities` và `comboQuantities` gộp các dòng trùng ID, tránh một ID xuất hiện nhiều lần để vượt kiểm tra từng dòng.
- Query address có cả `id` và `user_id`, nên không thể chọn address của tài khoản khác chỉ bằng cách sửa ID.
- Query product chỉ lấy `status:1`; số product trả về phải bằng số ID yêu cầu, nếu không có item đã ngừng bán/ID giả.
- Backend cộng `price × quantity`; với combo nó gọi lại service rồi cộng `comboPrice × comboQuantity`.
- Combo được “bung” thành nhiều OrderDetail sản phẩm vì FEFO cần biết chính xác mỗi product phải xuất bao nhiêu.
- Giá combo được phân bổ vào các dòng theo tỷ lệ giá lẻ. Dòng cuối nhận phần còn lại để tổng OrderDetail đúng tuyệt đối với giá combo sau làm tròn.
- Coupon được đọc với row lock trong transaction, rồi kiểm tra đã dùng và tăng `used_quantity` cùng transaction.
- Sau COMMIT, hàm đổi VND sang USD theo env, gọi PayPal và lưu PayPal ID vào Payment.

**`paypalRequest(path, options)`**

- Đọc client ID/secret từ env; thiếu cấu hình thì trả lỗi 503.
- Gọi OAuth bằng Basic Auth để lấy access token ngắn hạn.
- Dùng Bearer token gọi endpoint PayPal được truyền vào.
- Nếu PayPal trả HTTP lỗi, hàm tạo Error để `asyncRoute` chuyển tới error handler chung.
- Header `PayPal-Request-Id` dùng giá trị ổn định theo order để hỗ trợ idempotency phía PayPal.

**`captureOrder(req, res)` — backend hoàn tất thanh toán**

- Không tin PayPal ID là đủ: query Payment phải JOIN đúng Order thuộc user đang đăng nhập.
- Nếu `payment.status===1`, trả thành công ngay và không capture/trừ kho lần hai.
- Sau PayPal capture, lấy capture con trong `purchase_units[0].payments.captures[0]`.
- So sánh trạng thái ở cả cấp order và capture, currency phải USD, amount phải đúng chuỗi hai chữ số thập phân đã tính từ `payments.amount`.
- Chỉ sau mọi kiểm tra mới mở transaction DB để xuất kho và chuyển Payment/Order sang thành công.

**`validateCouponRecord(coupon, subtotal)` và `calculateDiscount()`**

- Validate lần lượt: tồn tại/active, loại discount hợp lệ, giá trị dương, ngày bắt đầu/kết thúc, quota còn lại, subtotal tối thiểu.
- `calculateDiscount()` sử dụng cấu hình coupon database; kết quả được giới hạn để không giảm vượt subtotal.

## 8. Model và bảng MySQL

| Model | Table | Operation | Mục đích |
|---|---|---|---|
| UserAddress | user_addresses | SELECT | address phải thuộc user |
| Product | products | SELECT/UPDATE | giá/stock; tăng sold_count |
| Combo/ComboItem/ComboSetting | combos/combo_items/combo_settings | SELECT | reload combo |
| Coupon/CouponUser | coupons/coupon_users | SELECT/INSERT/UPDATE | coupon/quota/usage |
| Order | orders | INSERT/UPDATE | đơn và trạng thái |
| OrderDetail | order_details | INSERT/SELECT/UPDATE | dòng sản phẩm, batch/cost |
| Shipment | shipments | INSERT/UPDATE qua hook | snapshot giao hàng/trạng thái |
| Payment | payments | INSERT/UPDATE | số tiền, PayPal ID, response/status |
| OrderCoupon | order_coupons | INSERT | coupon của order |
| ProductBatch | product_batches | SELECT/UPDATE | xuất kho |
| InventoryTransaction | inventory_transactions | SELECT/INSERT | ledger xuất kho |
| OrderHistory | order_histories | INSERT qua Order hook | lịch sử status |

## 9. Database Query

Các query trọng yếu:

```text
createOrder: UserAddress.findOne → user_addresses SELECT WHERE id=? AND user_id=?
createOrder: Product.findAll → products SELECT WHERE id IN (...) AND status=1
createOrder/findCombos → combos/combo_items/products/combo_settings SELECT
createOrder: Coupon.findOne(lock UPDATE) → coupons SELECT WHERE code=? FOR UPDATE
createOrder: CouponUser.count → coupon_users COUNT WHERE coupon_id=? AND user_id=?
createOrder: Order.create → orders INSERT
createOrder: OrderDetail.bulkCreate → order_details INSERT nhiều dòng
createOrder: Shipment.create → shipments INSERT
createOrder: Payment.create → payments INSERT
createOrder: OrderCoupon/CouponUser.create → INSERT; coupon.increment → coupons UPDATE
createOrder sau PayPal → payments UPDATE transaction_code,gateway_response
captureOrder: Payment.findOne include Order → payments JOIN orders WHERE transaction_code=? AND method='PAYPAL' AND orders.user_id=?
captureOrder → các query reserve ở luồng 5; payments UPDATE; orders UPDATE; hook INSERT order_histories và UPDATE shipments
```

## 10. Transaction

**Transaction 1 trong `createOrder()`:** bắt đầu sau validation initial. Coupon được khóa; toàn bộ INSERT order/detail/shipment/payment/coupon usage và UPDATE used_quantity nằm trong transaction; commit trước khi gọi PayPal, rollback khi một thao tác DB ném lỗi.

**Quan trọng:** gọi PayPal nằm ngoài transaction 1. Nếu PayPal create lỗi, order/detail/shipment/payment đã tồn tại; controller cập nhật payment `status=2` ngoài transaction rồi ném lỗi. Không tự xóa/cancel order và coupon usage không được hoàn ở nhánh này — rủi ro orphan order/tiêu lượt coupon.

**Transaction 2 trong `captureOrder()`:** chỉ bắt đầu sau khi PayPal đã capture và verify. `reserve()` + payment success + order status=1 cùng transaction. Lỗi FEFO/payment/order sẽ rollback DB. Tuy nhiên PayPal đã capture ở hệ thống ngoài nên DB rollback không thể rollback khoản tiền PayPal; source không có automatic refund/compensation — rủi ro lệch trạng thái cần xử lý vận hành.

**Rủi ro kiểm tra stock trước capture:** `createOrder()` kiểm tra product lẻ và từng combo bằng các phép kiểm tra riêng, chưa cộng gộp nhu cầu nếu cùng một product vừa được mua lẻ vừa nằm trong combo, hoặc nằm trong nhiều combo. `reserve()` mới kiểm tra tổng nhu cầu theo các dòng `order_details`; nếu lúc đó thiếu, lỗi xảy ra sau PayPal capture và dẫn tới rủi ro lệch trạng thái nêu trên.

## 11. Response

- Create thành công: `res.status(201).json({id: paypalOrder.id})`. Order DB đã tồn tại ở thời điểm này.
- Capture thành công: `res.json({message:"Thanh toán PayPal thành công.", orderId})`; frontend xóa cart, hiển thị mã đơn, chuyển `/don-hang/:id`.
- Verify không đạt: update gateway_response rồi 409, chưa xuất kho/chưa chuyển paid.

**Vì sao tính lại giá:** code create chỉ dùng client để lấy ID/quantity; giá product lấy `product.price`, combo lấy `findCombos()`/`calculateCombo()`, coupon lấy/khóa từ DB, shipping lấy env. Do đó sửa `localStorage.price`, subtotal hay discount UI không làm giảm tiền order. Đây là bảo vệ cụ thể có trong source.

## 12. Tóm tắt

```text
setupPaypalCheckout() → POST /api/payments/paypal/orders → signedIn
→ paymentController.createOrder() → comboService/couponService → Sequelize models
→ COMMIT order DB → paypalRequest(create) → Payment.update(PayPal ID)
→ onApprove → captureOrder() → paypalRequest(capture+verify)
→ transaction: orderInventory.reserve() + Payment.update() + Order.update()
→ JSON → clear cart/redirect
```

---

# LUỒNG 5 — XUẤT KHO THEO LÔ FEFO

## 1. Mục đích

Khi PayPal capture hợp lệ, trừ các lô có hạn dùng sớm nhất trước, ghi ledger để chống trừ hai lần và phục hồi đúng lô khi hủy.

## 2. Luồng tổng quát

```text
captureOrder() transaction
→ orderInventory.reserve(orderId, transaction)
→ InventoryTransaction.count(chống reserve lại)
→ OrderDetail.findAll(order_id)
→ từng detail: ProductBatch.findAll(remaining>0, expiry ASC,id ASC, FOR UPDATE)
→ batch.update(remaining_quantity) → InventoryTransaction.create(OUT)
→ detail.update(batch_id,cost_price) cho lô đầu tiên
→ Product.increment(sold_count)
→ hooks sync SUM batch về products.quantity
```

## 3. Frontend

Không có thao tác FEFO trực tiếp. Event `onApprove` POST capture kích hoạt backend. Frontend chỉ nhận success/error.

## 4. Route

```javascript
router.post("/paypal/orders/:id/capture", signedIn, asyncRoute(controller.captureOrder));
```

Route → `signedIn` → `asyncRoute` → `paymentController.captureOrder()` → `orderInventory.reserve()`.

## 5. Middleware

`signedIn` kiểm tra session; ownership được controller kiểm tra khi query Payment include Order. Không có middleware kho riêng.

## 6. Controller

```javascript
await db.sequelize.transaction(async (transaction) => {
  await orderInventory.reserve(payment.order_id, transaction);
  await payment.update({ status: 1, paid_at: new Date(), gateway_response: JSON.stringify(capture) }, { transaction });
  await payment.Order.update({ status: 1 }, { transaction, statusHistory: { /* ... */ } });
});
```

## 7. Service

```text
File: src/services/orderInventory.js
Functions: reserve(), restore()
```

```javascript
const batches = await db.ProductBatch.findAll({
  where: { product_id: detail.product_id,
    remaining_quantity: { [db.Sequelize.Op.gt]: 0 } },
  order: [["expiry_date", "ASC"], ["id", "ASC"]],
  lock: transaction.LOCK.UPDATE, transaction,
});
for (const batch of batches) {
  if (!needed) break;
  const quantity = Math.min(needed, Number(batch.remaining_quantity));
  await batch.update({ remaining_quantity: Number(batch.remaining_quantity) - quantity },
    { transaction, skipInventoryTransaction: true });
  await db.InventoryTransaction.create({ batch_id: batch.id, type: "OUT",
    quantity: -quantity, reference_type: "order", reference_id: orderId }, { transaction });
  needed -= quantity;
}
if (needed) throw new Error(`${detail.product_name} không còn đủ tồn kho.`);
```

`expiry_date ASC`, tie-break `id ASC` là FEFO thật. Nếu một lô thiếu, `Math.min()` lấy hết lô đó rồi tiếp tục lô sau. Nếu tổng lô thiếu, throw làm rollback toàn transaction.

Lưu ý dữ liệu: query không lọc `expiry_date IS NOT NULL` và cũng không loại lô đã quá hạn. Trong MySQL, giá trị ngày `NULL` có thể đứng trước ngày thật khi sort tăng dần; vì vậy code chỉ bảo đảm thứ tự FEFO đúng khi dữ liệu lô có `expiry_date` hợp lệ và chính sách cho phép xuất các lô được query. Đây là rủi ro chất lượng dữ liệu/nghiệp vụ trong source hiện tại.

Ví dụ đúng thuật toán: cần 12; lô A expiry sớm còn 5 → trừ 5, needed 7; lô B còn 10 → trừ 7, B còn 3.

### Giải thích dễ hiểu từng hàm liên quan

**`reserve(orderId, transaction)`**

- Bước 1 — chống chạy hai lần: COUNT ledger OUT của order. Nếu đã có ít nhất một record, hàm return ngay.
- Bước 2 — tải `OrderDetail`: mỗi detail cho biết một product cần bao nhiêu. Combo đã được bung thành detail từ bước create order nên service không cần biết công thức combo.
- Bước 3 — đặt `needed=detail.quantity`, lấy các lô còn hàng theo expiry sớm trước và khóa row.
- Bước 4 — `quantity=Math.min(needed,batch.remaining)` bảo đảm không trừ lô xuống số âm.
- Bước 5 — update lô và tạo một ledger OUT âm cho **mỗi lần lấy từ một batch**. Đây là dấu vết quan trọng nhất để hoàn kho.
- Bước 6 — `detail.batch_id`/`cost_price` chỉ được ghi khi chưa có batch, nên nếu một detail trải qua nhiều lô, detail chỉ đại diện lô đầu; ledger mới lưu đầy đủ mọi lô.
- Bước 7 — nếu duyệt hết lô mà `needed>0`, throw để rollback. Nếu đủ, tăng `products.sold_count`.

**`restore(orderId, transaction)`**

- Tìm toàn bộ OUT ledger của order thay vì đoán lại theo FEFO.
- COUNT ledger `order_cancel/IN` để không hoàn hai lần khi cancel bị gọi lặp.
- Với từng OUT, lấy đúng `output.batch_id`, cộng lại `abs(output.quantity)` và tạo ledger IN.
- Cuối cùng giảm `sold_count` theo các OrderDetail.
- Nếu order chưa từng reserve (ví dụ status 0 chưa trả tiền), không có OUT nên không cộng stock; đây là hành vi đúng với flow hiện tại.

**Hooks `ProductBatch.afterUpdate`**

- Mỗi lần remaining thay đổi, hook gọi `syncProductQuantity()` để cập nhật stock tổng trên Product.
- `reserve/restore` truyền `skipInventoryTransaction:true` vì hai hàm đã tự ghi ledger OUT/IN có reference order; nếu không skip, hook sẽ ghi thêm ADJUST trùng ý nghĩa.

## 8. Model và bảng MySQL

| Model | Table | Operation | Mục đích |
|---|---|---|---|
| InventoryTransaction | inventory_transactions | COUNT/INSERT/SELECT | idempotency, ledger OUT/IN |
| OrderDetail | order_details | SELECT/UPDATE | nhu cầu; lưu lô đầu/cost |
| ProductBatch | product_batches | SELECT FOR UPDATE/UPDATE | chọn và trừ/hoàn lô |
| Product | products | UPDATE | sold_count; hook batch sync quantity |

## 9. Database Query

```text
Function: reserve
Model: ProductBatch
Table: product_batches
Operation: SELECT FOR UPDATE
Điều kiện: product_id=detail.product_id AND remaining_quantity>0
Order: expiry_date ASC, id ASC
Dữ liệu: lô, remaining_quantity, import_price
```

```sql
SELECT * FROM product_batches
WHERE product_id=? AND remaining_quantity>0
ORDER BY expiry_date ASC,id ASC FOR UPDATE;
```

Sau mỗi allocation: UPDATE `product_batches.remaining_quantity`; INSERT `inventory_transactions(batch_id,type='OUT',quantity=-n,reference_type='order',reference_id=orderId)`; lần đầu của detail UPDATE `order_details.batch_id` và `cost_price`; sau detail UPDATE `products.sold_count += detail.quantity`.

Hook `ProductBatch.afterUpdate` gọi `syncProductQuantity()`: SUM `product_batches.remaining_quantity` và UPDATE `products.quantity`. `skipInventoryTransaction:true` ngăn hook ghi thêm ADJUST vì service đã tự ghi OUT.

## 10. Transaction

Toàn bộ reserve nằm trong transaction capture. Row batches bị khóa UPDATE; commit chỉ sau reserve, payment và order thành công; bất kỳ thiếu stock/lỗi DB nào rollback tất cả thay đổi DB.

Hủy order gọi `orderController.cancel()` → transaction → `orderInventory.restore()` → tìm toàn bộ OUT bằng `(reference_type='order', reference_id=orderId, type='OUT')`; từng record cho biết chính xác `batch_id` và `abs(quantity)`, nên hoàn đúng lô; ghi IN với `reference_type='order_cancel'`. Đây là dữ liệu phục hồi chính xác, không phụ thuộc `order_details.batch_id` (vốn chỉ lưu lô đầu nếu một detail dùng nhiều lô).

Rủi ro: nếu batch đã bị xóa, `restore()` `continue` và không hoàn lô đó. Migration `preserve-inventory-transaction-history` cho phép giữ ledger, nhưng service vẫn không thể update một batch không còn tồn tại.

## 11. Response

FEFO không trả payload riêng. Thành công quay về `captureOrder()` và trả `{message, orderId}`. Thiếu tổng stock ném lỗi qua error handler; transaction DB rollback.

## 12. Tóm tắt

```text
PayPal onApprove → captureOrder() → transaction → orderInventory.reserve()
→ OrderDetail.findAll() → ProductBatch.findAll(FEFO, FOR UPDATE)
→ ProductBatch.update() + InventoryTransaction.create(OUT)
→ Product.increment() → order_details/product_batches/inventory_transactions/products
→ Payment/Order update → JSON
```

---

# LUỒNG 6 — NGƯỜI DÙNG CHAT VỚI CHATBOT

## 1. Mục đích

Cho user đã đăng nhập hỏi về sản phẩm, cách mua hàng, đơn hàng của chính họ, combo nhà hàng hoặc món ăn. Hệ thống dùng dữ liệu thật làm context cho Gemini và có câu trả lời dự phòng khi AI lỗi.

## 2. Luồng tổng quát

```text
Người dùng mở nút #chatFab → nhập #chatForm → sendChatMessage()
↓ POST /api/chat { message, history }
src/routes/index.js → src/routes/chatRoutes.js
↓ signedIn → validate(ChatReq) → asyncRoute
chatController.reply()
├─ Câu hỏi nấu ăn → recipeSearch.suggestRecipe()
│  ├─ Gemini embedText() → Python query_recipe_index.py/FAISS
│  ├─ Product + Category + ProductImage + RecipeProductLink
│  ├─ Gemini generateJson(recipeSchema), fallback localRecipe()
│  └─ optional Recipe.findOne() lấy image
└─ Câu hỏi thường
   ├─ Product.findAll()
   ├─ getOrderContext() → Order/OrderDetail/Shipment/Payment
   ├─ comboService.findCombos()
   ├─ geminiService.generateJson(), fallback localReply()
   └─ lọc productIds do AI trả về bằng catalog thật
↓ res.json({ data: new ChatRespone(...) })
Frontend render answer/recipe/product cards; user có thể thêm product vào local cart
```

Ngoại lệ: ba câu trong `quickChatAnswers` được trả lời ngay tại frontend khi bấm quick button. Nhánh này không gọi `/api/chat`, không query DB và không gọi Gemini.

## 3. Frontend

```text
File: src/public/js/app.js
Event: submit #chatForm hoặc click [data-chat-question]
Function: sendChatMessage(message)
API/URL: /api/chat
HTTP Method: POST
Request Data: { message: string, history: [{role, text}] }
```

```javascript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: text, history: chatHistory }),
});
const result = await response.json();
renderChatAnswer(loading, result.data.answer);
const recipeCard = appendChatRecipe(result.data.recipe, loading);
appendChatProducts(result.data.products, recipeCard);
```

Frontend đưa message user lên UI trước, khóa input/button khi chờ và hiện “Đang trả lời…”. Nếu 401, chuyển về `/dang-nhap?returnTo=/`. Sau response, nó render text, optional recipe và product cards.

`chatHistory` là mảng JavaScript trong bộ nhớ trang, không phải localStorage/database. Sau mỗi response, frontend push cặp user/model rồi chỉ giữ tối đa 8 phần tử:

```javascript
chatHistory.push(
  { role: "user", text },
  { role: "model", text: result.data.answer },
);
if (chatHistory.length > 8) chatHistory.splice(0, chatHistory.length - 8);
```

Reload trang làm mất lịch sử chat. Backend không tự load lịch sử chat cũ.

Khi bấm dấu `+` trên product card, frontend kiểm tra quantity trong response rồi thêm product vào `state.cart`; `renderCart()` đồng bộ cart về localStorage. Thao tác này chưa tạo Order và chưa trừ kho.

## 4. Route

```text
File: src/routes/chatRoutes.js
Route: /api/chat (prefix /api/chat + route con /)
HTTP Method: POST
```

```javascript
router.post(
  "/",
  signedIn,
  validate(ChatReq),
  asyncRoute(controller.reply),
);
```

```text
POST /api/chat
→ signedIn
→ validate(ChatReq)
→ asyncRoute
→ chatController.reply()
```

## 5. Middleware

```text
File: src/middlewares/signedIn.js
Function: signedIn
Mục đích: yêu cầu req.session.userId; thiếu thì trả 401
```

```text
File: src/middlewares/validate.js
Function: validate(ChatReq)
Mục đích: gọi ChatReq.validate(req.body), thay req.body bằng dữ liệu Joi đã validate
```

`ChatReq.validate()` dùng `joi`:

- `message`: string, trim, tối thiểu 1, tối đa 500, bắt buộc.
- `history`: array tối đa 8; mỗi item bắt buộc có role `user|model` và text tối đa 1.000.
- Sai schema trả HTTP 400 với `error.details`; controller chưa chạy.

`asyncRoute` chuyển rejected promise từ `reply()` tới error handler chung.

## 6. Controller

```text
File: src/controllers/chatController.js
Function chính: reply(req, res)
Helpers: isCookingQuestion(), getOrderContext(), selectProducts(), localReply(), normalize()
```

```javascript
async function reply(req, res) {
  const chat = new ChatReq(req.body);
  const message = chat.message;
  if (isCookingQuestion(message)) {
    const recipe = await suggestRecipe(message, {});
    const answer = `Mình gợi ý món ${recipe.name}...`;
    return res.json({ data: new ChatRespone(answer, recipe.products, recipe) });
  }
  // nhánh chat thông thường: history → products/orderContext/combos
  // → generateJson(), fallback localReply()
}
```

### `normalize(value)`

Chuẩn hóa Unicode NFD, bỏ dấu tiếng Việt, đổi `đ→d` và lowercase. Ví dụ “Đơn hàng” thành gần dạng `don hang`. Nhờ vậy kiểm tra keyword không phụ thuộc dấu/chữ hoa.

### `isCookingQuestion(message)`

Kiểm tra message chuẩn hóa có một trong các keyword thật như `nau`, `cong thuc`, `mon`, `lau`, `xao`, `canh`, `nuong`... Nếu có, controller đi vào recipe branch trước và không chạy query lịch sử order/catalog/combo của nhánh thường.

### `getOrderContext(userId)`

Chạy song song ba query:

1. 10 order mới nhất của đúng `user_id`, include detail/shipment/payment.
2. SUM `total` của order `status=4` (đã hoàn thành).
3. COUNT order `status=4`.

Sau đó đổi Sequelize instances thành object gọn cho AI. Context chứa order ID/status/tổng tiền/tracking/payment và product/combo trong order. Không lấy order của user khác.

### Nhánh chat thông thường trong `reply()`

```javascript
const [products, orderContext, combos] = await Promise.all([
  db.Product.findAll({ where: { status: 1 }, /* ... */ limit: 80 }),
  getOrderContext(req.session.userId),
  require("../services/comboService").findCombos(),
]);
```

- Product active được sắp quantity giảm dần, tối đa 80, include ảnh.
- System instruction nhúng JSON catalog, lịch sử đúng user và combo đủ hàng.
- Prompt yêu cầu Gemini trả JSON `{answer, productIds}`, tối đa 6 IDs.
- Backend không tin productIds từ AI: tạo Set, chỉ lấy ID có trong `catalog` và `quantity>0`, tối đa 6.
- Nếu AI không chọn product hợp lệ, `selectProducts()` thử match keyword với tên sản phẩm.
- Gemini lỗi thì `localReply()` trả lời bằng rule local và `selectProducts()` chọn sản phẩm.

### `localReply(message, products, orderContext)`

Fallback không dùng AI. Nó nhận diện bằng keyword:

- Order/tổng tiền: dùng `orderContext`; tổng tiền chỉ tính order hoàn thành.
- Đặt hàng/phí giao/nấu ăn: trả câu hướng dẫn cố định.
- Tìm sản phẩm: match từ trong tên hoặc trả tối đa 6 sản phẩm cho câu hỏi duyệt chung.
- Không match: nói không có sản phẩm còn hàng phù hợp, không bịa dữ liệu.

## 7. Service

### `geminiService.generateJson(prompt, schema)`

```text
File: src/services/geminiService.js
API ngoài: Google Generative Language API v1beta
Model mặc định: gemini-3.5-flash
Env: GEMINI_API_KEY hoặc Gemini_key; optional GEMINI_TEXT_MODEL
```

`request()` dùng Node `fetch`, header `x-goog-api-key`, timeout 90 giây. `generateJson()` đặt temperature 0.25, response MIME `application/json` và schema bắt buộc, sau đó `JSON.parse()` text model trả về.

### `recipeSearch.suggestRecipe(query, filters)`

```text
File: src/services/recipeSearch.js
Functions gọi: embedText(), queryFaiss(), Product.findAll(),
RecipeProductLink.findAll(), generateJson(), Recipe.findOne()
```

Các bước:

1. `embedText()` gọi model mặc định `gemini-embedding-001`, tạo vector 768 chiều.
2. `queryFaiss()` dùng Node `child_process.spawn()` chạy `src/scripts/query_recipe_index.py`, gửi vector qua stdin và đọc references JSON từ stdout.
3. Nếu embedding/FAISS lỗi, chỉ cảnh báo và tiếp tục với `references=[]`.
4. Query product active và `quantity>0`, include Category/Image; query mọi RecipeProductLink với Product.
5. Tạo prompt gồm yêu cầu, references, tồn kho và link ingredient→product do admin đặt.
6. `generateJson(recipeSchema)` sinh công thức JSON. Nếu lỗi, gọi `localRecipe()`.
7. `isRecipeRelevant()` kiểm tra tên công thức còn liên quan query; không liên quan thì ném `RECIPE_NOT_FOUND`.
8. Chỉ map `ingredient.productId` sang Product thật đang còn hàng.
9. `Recipe.findOne({name,active:true})` chỉ để lấy ảnh quản trị; fallback ảnh product.

`localRecipe()` hiện chỉ có định nghĩa dự phòng cho “Mì xào bò” và “Lẩu bò”. Món khác ném lỗi code `RECIPE_NOT_FOUND`; controller biến thành câu “Tôi không biết món này”.

### `comboService.findCombos()` trong chatbot

Nhánh thường tải combo active/available đã được backend tính giá và stock. System instruction yêu cầu ưu tiên combo khi user hỏi nguồn hàng lớn/nhà hàng và nêu retail/combo/saving/minimum/free shipping.

## 8. Model và bảng MySQL

| Model | Table | Operation | Mục đích |
|---|---|---|---|
| Product | products | SELECT | catalog/giá/tồn kho cho AI và gợi ý |
| ProductImage | product_images | JOIN | ảnh product card |
| Category | categories | JOIN ở recipe | thông tin product cho công thức |
| Order | orders | SELECT/SUM/COUNT | lịch sử đúng user và tổng đã mua |
| OrderDetail | order_details | JOIN | sản phẩm/combo trong order |
| Shipment | shipments | LEFT JOIN | tracking và trạng thái giao |
| Payment | payments | LEFT JOIN | method/status/paid_at |
| Combo/ComboItem/ComboSetting | combos/combo_items/combo_settings | SELECT | combo active/giá/availability |
| RecipeProductLink | recipe_product_links | SELECT + Product JOIN | liên kết ingredient-product |
| Recipe | recipes | SELECT | ảnh recipe đã quản trị |

Không có model/bảng `Chat`, `Message` hay `ChatHistory`. Source hiện tại không INSERT lịch sử hội thoại vào MySQL.

## 9. Database Query

**Nhánh chat thường — catalog:**

```text
Function: reply
Model: Product
Table: products + product_images
Operation: SELECT
Điều kiện: products.status=1
Order/limit: quantity DESC, LIMIT 80
Dữ liệu: id,name,price,oldprice,image,quantity,unit,origin
```

**Context order:**

```text
Function: getOrderContext
Model: Order
Table: orders + order_details + shipments + payments
Operation: SELECT/SUM/COUNT
Điều kiện: user_id=req.session.userId; SUM/COUNT thêm status=4
Dữ liệu: 10 order gần nhất, chi tiết, giao hàng, payment, tổng/count hoàn thành
```

SQL tương đương phần tổng:

```sql
SELECT SUM(total), COUNT(*)
FROM orders
WHERE user_id = ? AND status = 4;
```

**Nhánh recipe:**

```text
suggestRecipe → Product.findAll:
products.status=1 AND products.quantity>0; JOIN categories/product_images

suggestRecipe → RecipeProductLink.findAll:
SELECT recipe_product_links JOIN products ORDER BY priority DESC

suggestRecipe → Recipe.findOne:
SELECT image FROM recipes WHERE name=? AND active=true LIMIT 1
```

**Combo:** giống query `findCombos()` đã mô tả ở luồng 3.

## 10. Transaction

Không có `sequelize.transaction()` trong chat flow. Toàn bộ thao tác database là read-only SELECT/SUM/COUNT nên không COMMIT/ROLLBACK. Các query trong `Promise.all()` không nằm trong cùng snapshot transaction; dữ liệu có thể thay đổi nhẹ giữa các query nếu order/stock đang được cập nhật đồng thời.

## 11. Response

```javascript
return res.json({
  data: new ChatRespone(answer, selectedProducts),
});
```

Cooking branch còn truyền `recipe` vào DTO. `ChatRespone` chỉ trả product fields được chọn (`id,name,price,oldprice,image,quantity,unit`) và recipe fields (`name,ingredients,steps,missingIngredients,safetyNotes`); không trả raw system prompt, full order context, Gemini response hay recipe source paths.

Các response chính:

- 200: answer + products + optional recipe.
- 400: Joi reject message/history.
- 401: chưa đăng nhập.
- Cooking/AI lỗi được controller bắt và thường vẫn trả 200 với câu fallback, không đẩy thành 500.
- Lỗi chưa được catch ở phần query nhánh thường đi qua `asyncRoute` tới error handler chung.

## 12. Tóm tắt

```text
app.js sendChatMessage()
→ POST /api/chat
→ signedIn → validate(ChatReq) → asyncRoute
→ chatController.reply()
→ [suggestRecipe()] hoặc [Product + getOrderContext + findCombos + generateJson]
→ products/orders/order_details/shipments/payments/combos/.../recipes
→ ChatRespone
→ JSON answer/products/recipe
→ render chat cards / optional add to local cart
```

### Rủi ro và giới hạn cần nói rõ

- Chat history do client gửi lên, không có chữ ký/database; backend chỉ validate cấu trúc và length. Gemini có thể dùng nội dung history làm context, nhưng dữ liệu giá/order thật vẫn được server chèn riêng.
- Catalog/order/combo được đưa vào prompt bằng `JSON.stringify`; prompt có thể lớn (tối đa 80 products + 10 orders + combos).
- Không có rate limit riêng cho `/api/chat`, nên một user đăng nhập có thể tạo nhiều request Gemini.
- `AbortSignal.timeout(90000)` cho phép request AI chờ đến 90 giây; frontend khóa form trong thời gian chờ.
- Backend lọc product IDs do AI chọn, nhưng text `answer` do AI tạo được frontend render qua `renderChatAnswer()` với helper `safe()`, giảm nguy cơ chèn HTML.
- Quick answers frontend là nội dung cố định và có thể không phản ánh cấu hình shipping mới nhất; câu “phí theo địa chỉ” không được query từ backend ở nhánh quick.
- Không lưu hội thoại nên không có audit/history xuyên phiên và reload trang sẽ mất context.

---

# LUỒNG 7 — ADMIN CHỈNH SỬA DỮ LIỆU TRÊN GIAO DIỆN ADMIN

## 1. Mục đích

Cho quản trị viên đăng nhập trang `/admin`, chọn một resource (sản phẩm, lô, đơn, vận chuyển, combo...), mở record, sửa trường được phép và lưu xuống bảng MySQL qua AdminJS Sequelize adapter. Resource có thể chạy thêm hook chuẩn hóa, upload ảnh hoặc model hook.

## 2. Luồng tổng quát

```text
Browser → GET /admin
↓ AdminJS login bằng ADMIN_EMAIL/ADMIN_PASSWORD
AdminJSExpress.buildAuthenticatedRouter()
↓ cookie adminjs
Admin chọn resource → chọn record → action edit do AdminJS sinh
↓ resource config trong buildResources()
↓ optional action.before / uploadFeature
AdminJS Sequelize adapter
↓ Sequelize Model.update()/instance save (do adapter thực hiện)
MySQL table tương ứng
↓ optional Sequelize model hooks / action.after
AdminJS action response/notice → giao diện record/list được cập nhật
```

Không có `adminController.editProduct()` hay Express `router.put('/admin/...')` tự viết. Chuỗi đúng là:

```text
AdminJS generated action
→ resource options/actions/features
→ @adminjs/sequelize adapter
→ Sequelize Model
→ MySQL
```

## 3. Frontend

```text
File/component: giao diện được AdminJS bundle từ package và cấu hình resource
Entry URL: /admin
Event: admin mở record, bấm Edit/Chỉnh sửa, thay field rồi Submit/Save
API/URL: endpoint action nội bộ do AdminJS sinh tại runtime
HTTP Method: GET để mở form; POST để thực hiện action theo cơ chế AdminJS
Request Data: request.payload gồm các field resource cho phép sửa
```

Source không chứa form HTML edit chung vì AdminJS tự tạo form từ `models[modelName].rawAttributes` và `options.properties`. Các component custom thật trong project gồm:

- `src/admin/components/dashboard.jsx` — dashboard.
- `src/admin/components/image-preview.jsx` — xem ảnh.
- `src/admin/components/quick-combo.jsx` — action tạo combo nhanh.

**Suy luận có căn cứ từ AdminJS:** URL edit record theo resource/record/action do AdminJS router tạo, không được khai báo bằng `router.put()` trong source. Vì đây là route runtime-generated, tài liệu không khẳng định một route Express thủ công không tồn tại.

## 4. Route

```text
File: src/index.js
Mount: admin.options.rootPath = /admin
Router: AdminJS authenticated router
```

```javascript
const { admin, router: adminRouter } = await createAdmin();
app.use(admin.options.rootPath, adminRouter);
```

Router được tạo trong `src/admin/admin.js`:

```javascript
const router = AdminJSExpress.default.buildAuthenticatedRouter(admin, {
  authenticate: async (email, password) =>
    email === account.email && password === account.password
      ? { email }
      : null,
  cookieName: "adminjs",
  cookiePassword: process.env.ADMIN_COOKIE_SECRET || "change-this-secret",
}, null, { resave: false, saveUninitialized: false });
```

Route/action list/show/edit/new/delete do AdminJS sinh từ danh sách `resources`, không có khai báo thủ công tương đương trong `src/routes`.

## 5. Middleware và xác thực admin

### Cơ chế thực tế

- Email/password admin lấy từ `ADMIN_EMAIL`, `ADMIN_PASSWORD`; fallback lần lượt là `admin@example.com`, `admin123`.
- `authenticate()` chỉ so sánh chuỗi với env và trả `{email}` hoặc `null`.
- Phiên admin dùng cookie riêng tên `adminjs`, ký/mã hóa dựa trên `ADMIN_COOKIE_SECRET`.
- Admin router được mount **trước** middleware `express-session` của khách hàng trong `src/index.js` và tự cấu hình session qua `buildAuthenticatedRouter()`.

### Điều không được nhầm

Không có middleware `src/middlewares/adminOnly.js` trong source hiện tại. Các API CRUD quản trị trùng lặp đã được gỡ; giao diện `/admin` chỉ dùng authentication riêng của AdminJS.

Giao diện AdminJS lại không query model `User` khi đăng nhập; account AdminJS nằm trong env. Vì vậy có hai hệ xác thực admin khác nhau:

```text
/admin UI → ADMIN_EMAIL/ADMIN_PASSWORD → cookie adminjs
API khách hàng → express-session → signedIn khi route yêu cầu
```

Rủi ro: fallback credentials và fallback cookie secret yếu nếu production không cấu hình env. Source cũng chỉ có một account AdminJS và không có role/permission chi tiết theo từng admin.

## 6. Controller / Admin action

Không có controller riêng cho generic edit. `createAdmin()` gọi `buildResources()` để biến Sequelize models thành AdminJS resources; adapter đảm nhận đọc/cập nhật record.

```javascript
const admin = new AdminJS({
  rootPath: "/admin",
  resources: buildResources(models, componentLoader,
    AdminJSUpload.default, buildFeature,
    imagePreviewComponent, quickComboComponent),
  // ...
});
```

### `buildResources()`

```text
File: src/admin/resources.js
Function: buildResources(models, componentLoader, uploadFeature, ...)
```

Hàm duyệt `Object.keys(resourceNames)`, bỏ `hiddenModels`, rồi tạo `{resource: models[modelName], features, options}`. AdminJS dựa vào object này để sinh list/show/edit/new/delete.

Các cấu hình quyết định edit:

- `propertiesByModel`: label, kiểu field, field visible/editable, available values.
- `readOnlyModels`: chặn new/edit/delete/bulkDelete.
- `hiddenModels`: không tạo resource AdminJS.
- `sidebarHiddenModels`: có resource/action nhưng không hiện trực tiếp trên sidebar.
- `actions`: custom `before`, `after`, related action hoặc quick action.
- `features`: upload ảnh/PDF.

### Resource nào không được chỉnh sửa?

```javascript
const hiddenModels = ["ProductImage"];
const readOnlyModels = ["UserAddress", "Feedback", "InventoryTransaction"];
```

- `ProductImage` không được đưa vào resource list.
- `UserAddress`, `Feedback`, `InventoryTransaction`: action new/edit/delete/bulkDelete đều `isAccessible:false` và `isVisible:false`.
- `ComboSetting` không cho new/delete/bulkDelete nhưng vẫn cho edit record singleton.
- Một số resource như OrderDetail/Payment nằm trong `sidebarHiddenModels`; chúng không hiện menu chính nhưng có thể được mở từ related action/filter.

## 7. Service, hooks và feature liên quan

### Trường hợp A — edit thông thường

Nếu resource không có custom `edit.before/after`, AdminJS Sequelize adapter lấy `request.payload`, convert theo property/model và cập nhật model trực tiếp. Project không có service trung gian.

### Trường hợp B — sửa Shipment

```javascript
const normalizeShipment = async (request) => {
  if (request.method !== "post") return request;
  const payload = request.payload || {};
  request.payload = {
    ...payload,
    order_id: Number(firstValue(payload.order_id)),
    shipping_status: Number(firstValue(payload.shipping_status) ?? 0),
    shipping_fee: Number(firstValue(payload.shipping_fee) || 0),
    delivery_time: firstValue(payload.delivery_time) || null,
    tracking_code: String(firstValue(payload.tracking_code) || "").trim() || null,
  };
  return request;
};
```

`actions.edit.before = normalizeShipment` chạy trước adapter UPDATE. Nó xử lý payload AdminJS có thể là array, ép status/fee/order ID thành Number, date rỗng thành null, trim tracking code.

Sau khi Shipment update, hook `Shipment.afterUpdate` trong `src/models/index.js` có thể đồng bộ Order:

```text
shipping_status 2 (Đang giao) → order.status 3
shipping_status 3 (Đã giao)  → order.status 4
```

Hook gọi `order.update()`, và hook Order tiếp tục tạo `OrderHistory` cùng cập nhật shipment mapping nếu cần. Các hook nhận transaction từ adapter nếu adapter cung cấp; source custom admin không tự mở transaction cho generic edit.

### Trường hợp C — sửa ProductBatch

Admin không được edit `batch_code`, nhưng được edit `remaining_quantity`, `import_price`, expiry... theo raw model/property config. `ProductBatch.afterUpdate`:

1. Gọi `syncProductQuantity()` để SUM mọi batch và UPDATE `products.quantity`.
2. Gọi `recordInventoryTransaction()` tạo dòng `ADJUST` bằng `currentQuantity - previousQuantity` nếu chênh lệch khác 0.

Vì vậy sửa tồn một lô có thể tác động ba bảng: `product_batches`, `products`, `inventory_transactions`.

### Trường hợp D — sửa resource có ảnh

Các model trong `imagePropertyByModel` dùng `@adminjs/upload` với `cloudinaryProvider`: User, Brand, Product, ProductImage, News, Banner, Recipe, Combo.

```text
Admin chọn uploadImage
→ @adminjs/upload validate MIME/size tối đa 10 MB
→ createUploadPath() tạo Cloudinary URL/public ID
→ cloudinaryProvider.upload()
→ cloudinary.uploader.upload(overwrite=true)
→ field image/avatar của Sequelize record lưu URL
```

Các MIME cho phép: JPEG, PNG, WebP, GIF. `ensureCloudinaryConfigured()` ném lỗi nếu thiếu config.

### Trường hợp E — sửa RecipeSource

Upload PDF được lưu local trong `src/pdf`, giới hạn 30 MB và MIME `application/pdf`. Action `new/edit/delete/bulkDelete` có `after: rebuildAfter`; hàm dùng `setTimeout(rebuildRecipeIndex, 500)` để rebuild index công thức sau response.

### Trường hợp F — xem/sửa Combo

Edit Combo dùng adapter mặc định. Sau action `list/show`, `enrichComboRecords()` gọi `findCombos({includeUnavailable:true})` để thêm các field chỉ đọc: retail price, calculated price, saving và cảnh báo availability. Các field này không phải cột được lưu vào `combos`.

## 8. Model và bảng MySQL

Generic edit có thể chạm model tương ứng resource. Các trường hợp đáng chú ý:

| Admin resource | Model | Table | Operation/ảnh hưởng |
|---|---|---|---|
| Người dùng | User | users | UPDATE; password dùng model hook bcrypt nếu field password được gửi |
| Sản phẩm | Product | products | UPDATE product fields; quantity bị đặt `edit:false` |
| Lô sản phẩm | ProductBatch | product_batches | UPDATE; hooks UPDATE products + INSERT inventory_transactions |
| Đơn hàng | Order | orders | UPDATE; status hook INSERT order_histories và UPDATE shipments |
| Vận chuyển | Shipment | shipments | UPDATE; hook có thể UPDATE orders |
| Combo | Combo | combos | UPDATE; giá/tồn hiển thị được tính lại, không lưu calculated fields |
| Thành phần combo | ComboItem | combo_items | UPDATE FK/quantity |
| Cấu hình combo | ComboSetting | combo_settings | UPDATE minimum_quantity singleton |
| Tin/Banner/Brand/Recipe | tương ứng | news/banner/brands/recipes | UPDATE + optional Cloudinary image URL |
| Nguồn PDF | RecipeSource | recipe_sources | UPDATE + file local + rebuild index |

## 9. Database Query

### Query generic edit

```text
Function thực thi: action edit runtime của AdminJS qua @adminjs/sequelize adapter
Resource config: buildResources()
Model/Table: phụ thuộc resource đang mở
Operation: SELECT record để render form; UPDATE theo record ID khi submit
Điều kiện: primary key id = recordId do AdminJS action context xác định
Dữ liệu cập nhật: các field editable trong request.payload
```

SQL tương đương khi sửa Product:

```sql
SELECT * FROM products WHERE id = ?;
UPDATE products
SET name = ?, price = ?, status = ?, updated_at = ?
WHERE id = ?;
```

Đây là SQL tương đương để giải thích. Source thực tế giao Sequelize query cho AdminJS adapter; source không chứa raw SQL này.

### Query phát sinh khi sửa ProductBatch.remaining_quantity

```text
1. UPDATE product_batches WHERE id=?
2. SELECT SUM(remaining_quantity) FROM product_batches WHERE product_id=?
3. UPDATE products SET quantity=? WHERE id=?
4. INSERT inventory_transactions(type='ADJUST', quantity=delta, reference_type='adjust')
```

### Query phát sinh khi sửa Shipment.shipping_status

```text
1. UPDATE shipments WHERE id=?
2. SELECT orders WHERE id=shipment.order_id
3. UPDATE orders SET status=? WHERE id=? (chỉ status 2/3 mapping)
4. INSERT order_histories(...)
5. Order hook có thể UPDATE shipments về trạng thái mapping tương ứng
```

## 10. Transaction

- Generic AdminJS edit: source project không tự gọi `sequelize.transaction()` quanh action edit. Không tìm thấy bảo đảm project-level rằng adapter UPDATE cùng toàn bộ model hook side effects được bọc trong một transaction do custom code tạo.
- Hook Sequelize nhận `options.transaction` và truyền tiếp, nên nếu adapter cung cấp transaction thì hook dùng chung; nhưng source hiện tại không cấu hình rõ điều này. Không biến suy luận thành sự thật.
- `quickComboAction()` là ngoại lệ rõ ràng: tự bắt đầu transaction, `Combo.create()` + `ComboItem.bulkCreate()`, commit/rollback thủ công. Đây là action **tạo mới nhanh**, không phải generic edit.
- `rebuildRecipeIndex` chạy `setTimeout` sau response, không nằm trong transaction update RecipeSource.

## 11. Response

Generic edit không gọi `res.json()` trong controller project. AdminJS action handler/adapter tạo response nội bộ gồm record/notice/redirect rồi frontend AdminJS cập nhật giao diện.

Custom action `quickComboAction()` minh họa response thật:

```javascript
return {
  notice: { type: "success", message: `Đã tạo combo “${name}” cùng ${items.length} sản phẩm.` },
  redirectUrl: `/admin/resources/combos/records/${combo.id}/show`,
};
```

`relatedListAction()` cũng trả `redirectUrl` tới danh sách đã filter. Với generic edit, cấu trúc cụ thể do phiên bản AdminJS runtime quyết định, không có object response tự viết trong source project để trích dẫn chính xác hơn.

## 12. Tóm tắt

```text
Admin browser → /admin → buildAuthenticatedRouter()
→ authenticate(ADMIN_EMAIL/ADMIN_PASSWORD) → cookie adminjs
→ AdminJS generated resource edit action
→ buildResources() property/action/feature config
→ optional normalizeShipment()/uploadFeature
→ @adminjs/sequelize adapter → Sequelize Model → MySQL table
→ optional ProductBatch/Order/Shipment hooks hoặc rebuildAfter
→ AdminJS notice/redirect/render
```

### Ví dụ dễ trình bày: admin sửa trạng thái vận chuyển

```text
Admin mở resource Shipment và record cần sửa
↓ chọn shipping_status = 2, nhập tracking_code, bấm Save
AdminJS gửi POST action edit với request.payload
↓ normalizeShipment() ép kiểu/trim
@adminjs/sequelize adapter UPDATE shipments
↓ Shipment.afterUpdate()
Order.findByPk(shipment.order_id)
↓ order.update(status=3)
Order.afterUpdate()
↓ INSERT order_histories + đồng bộ shipment nếu cần
AdminJS trả notice/giao diện record mới
```

### Rủi ro và giới hạn

- AdminJS credential nằm trong env và so sánh chuỗi trực tiếp; không dùng users/bcrypt/MFA.
- Fallback `admin@example.com/admin123` và `change-this-secret` nguy hiểm nếu được dùng ở production.
- Không thấy CSRF/permission tùy resource được cấu hình riêng trong source ngoài cơ chế của AdminJS package và `isAccessible` action.
- Generic edit không có validation Joi của các API custom; validation đến từ model/AdminJS/property config.
- Cho phép sửa trạng thái Order/Shipment trực tiếp có thể kích hoạt hook dây chuyền; cần hiểu mapping trước khi thao tác.
- Các model read-only chặn sửa ở AdminJS UI, nhưng đây không thay thế quyền ở API khác.

---

# LUỒNG 8 — UPLOAD, THAY VÀ XÓA ẢNH VỚI CLOUDINARY

## 1. Mục đích

Đưa file ảnh lên Cloudinary thay vì lưu binary trong MySQL. Database chỉ lưu URL HTTPS của ảnh. Source có hai nhánh thật: user tự đổi avatar ở trang tài khoản và admin upload ảnh cho các resource AdminJS.

## 2. Luồng tổng quát

### Nhánh A — user cập nhật avatar

```text
User chọn file #avatarInput
→ FileReader.readAsDataURL() tạo Base64 preview
→ submit #profileForm
→ PUT /api/auth/profile {name,phone,avatarData}
→ signedIn → asyncRoute → authController.profile()
→ validate Data URL JPEG/PNG/WebP
→ cloudinaryService.uploadImage()
→ ensureCloudinaryConfigured()
→ cloudinary.uploader.upload(Base64, folder avatars)
→ nhận result.secure_url
→ User.update({name,phone,avatar:secure_url})
→ users
→ JSON UserRespone → reload trang → browser tải ảnh từ Cloudinary URL
```

### Nhánh B — admin upload/thay/xóa ảnh

```text
Admin chọn uploadImage trong generated AdminJS form
→ @adminjs/upload validate file
→ createUploadPath(resourceName) tạo URL/public ID đích
→ cloudinaryProvider.upload(file.path, imageUrl)
→ cloudinary.uploader.upload(public_id, overwrite=true)
→ AdminJS Sequelize adapter lưu image/avatar URL vào model/table
→ khi plugin yêu cầu xóa: cloudinaryProvider.delete(imageUrl)
→ cloudinary.uploader.destroy(publicId, invalidate=true)
```

## 3. Frontend

### User avatar

```text
File: src/public/js/profile.js
Event: change #avatarInput; submit #profileForm
API/URL: /api/auth/profile
HTTP Method: PUT
Request Data: JSON {name,phone,avatarData?}
```

```javascript
const fileData = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const file = document.querySelector("#avatarInput").files[0];
if (file) payload.avatarData = await fileData(file);
await fetch("/api/auth/profile", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

Input có `accept="image/jpeg,image/png,image/webp"`. Khi change, frontend từ chối `file.size > 4*1024*1024`, dùng Data URL làm preview; chưa upload tại thời điểm preview. Upload chỉ xảy ra khi submit form.

### Admin upload

Form do `@adminjs/upload` render từ virtual property `uploadImage`; source không có form HTML tự viết. Giới hạn config: JPEG/PNG/WebP/GIF và tối đa 10 MB.

## 4. Route

### User avatar

```javascript
// src/routes/authRoutes.js; prefix /api/auth
router.put("/profile", signedIn, asyncRoute(controller.profile));
```

```text
PUT /api/auth/profile
→ signedIn
→ asyncRoute
→ authController.profile()
```

Không có middleware Joi riêng trên route này; controller tự validate.

### Admin image

Không có route upload Cloudinary thủ công. Request đi qua AdminJS router được mount ở `/admin`; action/resource endpoint do AdminJS sinh runtime và upload feature gọi provider.

## 5. Middleware và validation

### User avatar

- `signedIn` yêu cầu `req.session.userId`.
- `express.json({limit:'5mb'})` parse JSON toàn app trước route.
- Frontend giới hạn file gốc 4 MB.
- Backend regex chỉ chấp nhận prefix `data:image/jpeg;base64,`, `png` hoặc `webp`; GIF bị từ chối ở profile.
- Backend không giải mã để kiểm tra nội dung file thực sự, dimensions hay kích thước decoded.

```javascript
if (!/^data:image\/(jpeg|png|webp);base64,/.test(req.body.avatarData))
  return res.status(400).json({
    message: "Ảnh đại diện phải là JPG, PNG hoặc WebP.",
  });
```

### Admin image

`uploadFeature` validation khai báo MIME và `maxSize:10*1024*1024`. Quyền truy cập thuộc authenticated AdminJS router; không đi qua `signedIn` của API khách hàng.

## 6. Controller

```text
File: src/controllers/authController.js
Function: profile(req,res)
```

```javascript
const user = await User.findByPk(req.session.userId);
const changes = { name, phone };
if (req.body.avatarData) {
  const uploaded = await uploadImage(
    req.body.avatarData,
    `${process.env.CLOUDINARY_FOLDER || "web-nong-san"}/avatars`,
  );
  changes.avatar = uploaded.url;
}
await user.update(changes);
res.json({ message: "Đã cập nhật thông tin.", data: new UserRespone(user) });
```

Các bước:

1. Query user bằng session ID; không dùng ID do client gửi.
2. Validate `name` bắt buộc; phone được trim.
3. Không có `avatarData` thì chỉ update name/phone, không gọi Cloudinary.
4. Có ảnh hợp lệ thì chờ Cloudinary upload thành công, lấy URL rồi mới update User.
5. Cloudinary lỗi làm Promise reject; `asyncRoute` chuyển lỗi tới error handler, `User.update()` chưa chạy.
6. DB update lỗi sau upload sẽ để lại ảnh đã upload nhưng chưa được tham chiếu trong DB; không có cleanup compensation.

Nhánh admin không có controller custom; `@adminjs/upload` + provider + Sequelize adapter chịu trách nhiệm.

## 7. Service và Cloudinary provider

### Cấu hình dùng chung

```text
File: src/config/cloudinary.js
Library: require('cloudinary').v2
Env bắt buộc: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
Env optional: CLOUDINARY_FOLDER
```

```javascript
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
};
if (isCloudinaryConfigured) cloudinary.config(cloudinaryConfig);
```

`ensureCloudinaryConfigured()` ném Error mô tả biến env còn thiếu. `secure:true` yêu cầu SDK tạo HTTPS URL.

### `cloudinaryService.uploadImage(file, folder)`

```text
File: src/services/cloudinaryService.js
Input: Data URL/Base64 hoặc nguồn upload SDK hỗ trợ
Cloudinary call: cloudinary.uploader.upload()
Output: {url,publicId,width,height,format}
```

```javascript
const result = await cloudinary.uploader.upload(file, {
  folder: folder || "web-nong-san",
  resource_type: "image",
});
return {
  url: result.secure_url,
  publicId: result.public_id,
  width: result.width,
  height: result.height,
  format: result.format,
};
```

`profile()` chỉ dùng `uploaded.url`; các metadata còn lại không được lưu vào MySQL.

### `createUploadPath(resourceName)` — admin

Tạo public ID dạng:

```text
{CLOUDINARY_FOLDER hoặc web-nong-san}/{modelName lowercase}/{record.id}-{Date.now()}
```

Extension lấy từ filename, fallback `jpg`. Hàm trả `cloudinary.url(publicId,{secure:true,format:extension})`; đây là URL đích để plugin lưu vào field.

### `cloudinaryProvider.upload(file,imageUrl)`

- `file.path` là đường dẫn file tạm do upload middleware/AdminJS cung cấp.
- `publicIdFromUrl(imageUrl)` bỏ phần trước `/upload/`, version `v123/` và extension để lấy public ID.
- Upload dùng chính public ID đó, `overwrite:true`, `resource_type:'image'`.

### `cloudinaryProvider.delete(imageUrl)`

- Không có URL thì return.
- Có URL thì trích public ID và gọi `cloudinary.uploader.destroy()`.
- `invalidate:true` yêu cầu làm mất hiệu lực bản CDN cache cũ.
- Khi nào delete được gọi do lifecycle của `@adminjs/upload` với `filesToDelete:'imageToDelete'`; source provider cung cấp khả năng xóa nhưng không có controller custom gọi trực tiếp.

## 8. Model và bảng MySQL

| Nhánh | Model | Table | Column lưu URL | Operation |
|---|---|---|---|---|
| User avatar | User | users | avatar | SELECT + UPDATE |
| Admin User image | User | users | avatar | UPDATE |
| Admin Brand image | Brand | brands | image | UPDATE |
| Admin Product image | Product | products | image | UPDATE |
| Admin News image | News | news | image | UPDATE |
| Admin Banner image | Banner | banner | image | UPDATE |
| Admin Recipe image | Recipe | recipes | image | UPDATE |
| Admin Combo image | Combo | combos | image | UPDATE |

`ProductImage` có mapping ảnh trong `imagePropertyByModel`, nhưng model này nằm trong `hiddenModels`, nên không có resource AdminJS generated để người dùng admin truy cập trực tiếp trong cấu hình hiện tại.

Cloudinary chứa binary; MySQL không lưu binary/public ID riêng. Cột chỉ lưu URL. Với user avatar, `publicId` trả từ service không được lưu nên việc xóa avatar cũ về sau không có mapping trực tiếp ngoài việc suy ra từ URL.

## 9. Database Query

### User profile

```text
Function: profile
Model: User
Table: users
Operation 1: SELECT
Điều kiện: id=req.session.userId
Dữ liệu lấy: User instance

Operation 2: UPDATE
Điều kiện: id=user.id
Dữ liệu cập nhật: name,phone; optional avatar=Cloudinary secure_url
```

```sql
SELECT * FROM users WHERE id = ?;
UPDATE users
SET name = ?, phone = ?, avatar = ?, updated_at = ?
WHERE id = ?;
```

Nếu không chọn ảnh, câu UPDATE không cần đổi avatar. Đây là SQL tương đương; source dùng `User.findByPk()` và `user.update()`.

### Admin upload

Adapter update bảng theo resource/record ID và đặt field `avatar` hoặc `image` thành URL đã được upload feature quản lý. Tên model/table/column chính xác nằm trong bảng mục 8.

## 10. Transaction và tính nhất quán

### User avatar

Không có Sequelize transaction bao quanh Cloudinary upload và `User.update()`:

```text
Upload Cloudinary thành công
↓
User.update() thành công → URL được dùng
hoặc User.update() lỗi → ảnh orphan trên Cloudinary
```

Ngược lại, Cloudinary upload lỗi xảy ra trước DB update nên avatar cũ trong database vẫn giữ nguyên. Khi thay avatar thành công, source không gọi `cloudinary.uploader.destroy()` cho URL cũ, nên ảnh cũ có thể tiếp tục tồn tại và tốn storage.

### Admin upload

Cloudinary là hệ thống ngoài MySQL nên không thể cùng nằm trong Sequelize transaction. `@adminjs/upload` có lifecycle riêng và provider hỗ trợ delete, nhưng source không khai báo transaction/compensation custom bảo đảm atomic giữa upload và record UPDATE.

## 11. Response

### User profile

```javascript
res.json({
  message: "Đã cập nhật thông tin.",
  data: new UserRespone(user),
});
```

Frontend hiển thị message rồi `location.reload()`. Lần load sau `/api/auth/me` trả avatar URL; `<img src="...">` khiến browser tải ảnh trực tiếp từ Cloudinary CDN.

- 400: name rỗng hoặc Data URL prefix không hợp lệ.
- 401: session/user không hợp lệ.
- 500 theo error handler chung: Cloudinary/config/DB lỗi không có status cụ thể.

### Admin

Response/notice do AdminJS action và upload feature tạo; source provider chỉ return/throw theo interface, không tự gọi `res.json()`.

## 12. Tóm tắt

```text
profile.js FileReader → PUT /api/auth/profile
→ signedIn → authController.profile()
→ cloudinaryService.uploadImage()
→ cloudinary.uploader.upload()
→ User.update(secure_url) → users
→ UserRespone → reload → Cloudinary CDN image

AdminJS uploadImage
→ uploadFeature validation
→ createUploadPath()
→ cloudinaryProvider.upload()/delete()
→ Cloudinary
→ AdminJS Sequelize adapter → model image/avatar column → MySQL
```

### Rủi ro và giới hạn quan trọng

- File gốc 4 MB sau Base64 thường tăng khoảng 33%, có thể vượt JSON limit 5 MB của Express dù frontend cho chọn; request có thể bị parser từ chối trước controller.
- Validation profile dựa trên Data URL prefix, chưa kiểm tra magic bytes/nội dung decoded hoặc kích thước ảnh.
- User thay avatar không xóa ảnh cũ.
- Upload thành công nhưng DB update lỗi có thể sinh orphan asset.
- API key/secret chỉ nằm backend là đúng; tuyệt đối không đưa `CLOUDINARY_API_SECRET` ra frontend.
- `CLOUDINARY_FOLDER` thay đổi giữa các lần deploy có thể làm asset nằm ở nhiều folder.
- `Date.now()` giúp admin tạo public ID mới, nhưng không phải UUID và không tự cung cấp audit mapping trong DB.

### Ví dụ trả lời khi bảo vệ

> Frontend dùng `FileReader.readAsDataURL()` đổi avatar thành Base64 rồi PUT `/api/auth/profile`. `profile()` kiểm tra session và prefix ảnh, gọi `uploadImage()`; service dùng `cloudinary.uploader.upload()`. Cloudinary trả `secure_url`, sau đó `User.update()` lưu URL vào cột `users.avatar`. MySQL chỉ lưu URL, còn file thật nằm trên Cloudinary.

---

# LUỒNG 9 — NGƯỜI DÙNG TỰ QUẢN LÝ ĐỊA CHỈ NHẬN HÀNG

## 1. Mục đích

Cho người dùng đã đăng nhập xem các địa chỉ của mình, thêm địa chỉ nhận hàng mới, chọn địa chỉ mới làm mặc định và xóa địa chỉ không dùng nữa. Checkout sau đó chỉ cho chọn address thuộc chính user.

> **Giới hạn source hiện tại:** không tìm thấy route PUT/PATCH address, controller `updateAddress()` hoặc form chỉnh sửa record địa chỉ đã có. Vì vậy chức năng hiện thực là **xem + thêm + xóa**, chưa có “sửa tại chỗ”. Nếu muốn thay thông tin, UI hiện tại buộc người dùng thêm địa chỉ mới rồi xóa địa chỉ cũ.

## 2. Luồng tổng quát

```text
User mở /tai-khoan
→ profile.js gọi GET /api/auth/me
→ dựng #addressList và #addressForm
↓ refreshAddresses()
GET /api/auth/addresses
→ signedIn → authController.addresses()
→ UserAddress.findAll(user_id=session.userId)
→ user_addresses → JSON danh sách

User bấm “Thêm địa chỉ” → submit #addressForm
↓ POST /api/auth/addresses
→ signedIn → authController.addAddress()
→ optional User.findByPk() lấy phone fallback
→ UserAddress.count() → UserAddress.create()
→ nếu default: UserAddress.update() bỏ default các địa chỉ khác
→ JSON 201 → refreshAddresses()

User bấm “Xóa”
↓ DELETE /api/auth/addresses/:id
→ signedIn → authController.deleteAddress()
→ UserAddress.findOne(id + user_id ownership)
→ address.destroy()
→ JSON → refreshAddresses()
```

## 3. Frontend

```text
File: src/public/js/profile.js
Trang: /tai-khoan
Events: click #showAddressForm; submit #addressForm; click [data-delete-address]
APIs: GET/POST /api/auth/addresses; DELETE /api/auth/addresses/:id
Request add: receiver_name,address,ward,district,province,is_default?; không có input phone trong form hiện tại
```

### Hiển thị danh sách

```javascript
async function refreshAddresses() {
  const response = await fetch("/api/auth/addresses");
  const { data } = await response.json();
  document.querySelector("#addressList").innerHTML = data.length
    ? data.map((item) => `...${item.receiver_name}...${item.address}...`).join("")
    : "<p>Bạn chưa có địa chỉ giao hàng.</p>";
}
```

`clean()` được dùng trước khi chèn field vào HTML nhằm loại các ký tự `&<>"'`. Mỗi card default hiện nhãn “Địa chỉ mặc định” và có nút Xóa.

### Thêm địa chỉ

```javascript
document.querySelector("#addressForm").onsubmit = async (event) => {
  event.preventDefault();
  const response = await fetch("/api/auth/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
  });
  const result = await response.json();
  if (response.ok) {
    event.currentTarget.reset();
    refreshAddresses();
  }
};
```

Checkbox HTML `name="is_default"` khi được tick sẽ thường tạo chuỗi `"on"` qua FormData; khi không tick, field không xuất hiện.

### Xóa địa chỉ

```javascript
await fetch(`/api/auth/addresses/${button.dataset.deleteAddress}`, {
  method: "DELETE",
});
refreshAddresses();
```

Frontend hiện không kiểm tra `response.ok` hay hiển thị lỗi xóa; dù xóa lỗi nó vẫn refresh danh sách.

## 4. Route

```text
File: src/routes/authRoutes.js
Prefix: /api/auth
```

```javascript
router.get("/addresses", signedIn, asyncRoute(controller.addresses));
router.post("/addresses", signedIn, asyncRoute(controller.addAddress));
router.delete("/addresses/:id", signedIn, asyncRoute(controller.deleteAddress));
```

```text
GET    /api/auth/addresses     → signedIn → asyncRoute → addresses()
POST   /api/auth/addresses     → signedIn → asyncRoute → addAddress()
DELETE /api/auth/addresses/:id → signedIn → asyncRoute → deleteAddress()
```

```text
PUT/PATCH /api/auth/addresses/:id
→ Không tìm thấy trong source code hiện tại.
```

## 5. Middleware

- `signedIn`: cần `req.session.userId`; chưa login trả 401.
- `asyncRoute`: đưa lỗi async tới error handler chung.
- Không có `validate(JoiSchema)` trên ba route address.
- Ownership không nằm trong middleware riêng: controller dùng `user_id=req.session.userId` trong query.

## 6. Controller

```text
File: src/controllers/authController.js
Functions: addresses(), addAddress(), deleteAddress()
```

### `addresses(req,res)`

```javascript
const data = await UserAddress.findAll({
  where: { user_id: req.session.userId },
  order: [["is_default", "DESC"], ["createdAt", "DESC"]],
});
res.json({ data });
```

Chỉ lấy address thuộc user session. Default đứng trước; trong cùng nhóm, địa chỉ mới nhất đứng trước.

### `addAddress(req,res)`

```javascript
const fields = ["receiver_name", "phone", "address", "ward", "district", "province"];
const data = Object.fromEntries(
  fields.map((field) => [field, String(req.body[field] || "").trim()]),
);
if (!data.phone) {
  const user = await User.findByPk(req.session.userId, { attributes: ["phone"] });
  data.phone = String(user?.phone || "").trim();
}
```

Các bước:

1. Chỉ whitelist sáu field và trim; field lạ không được spread trực tiếp vào create.
2. Form frontend hiện thiếu input phone, nên controller thường lấy `users.phone` làm fallback.
3. Bắt buộc receiver_name, phone, address, province; ward/district có thể rỗng.
4. COUNT địa chỉ của user; địa chỉ đầu tiên tự default.
5. Tạo record với `user_id` lấy từ session, không lấy từ client.
6. Nếu record mới default, update mọi address khác của user thành false.
7. Trả HTTP 201 và record mới.

```javascript
const count = await UserAddress.count({ where: { user_id: req.session.userId } });
const address = await UserAddress.create({
  ...data,
  user_id: req.session.userId,
  is_default: count === 0 || Boolean(req.body.is_default),
});
if (address.is_default) {
  await UserAddress.update({ is_default: false }, {
    where: {
      user_id: req.session.userId,
      id: { [Op.ne]: address.id },
    },
  });
}
```

### `deleteAddress(req,res)`

Query đồng thời `id=req.params.id` và `user_id=session.userId`. Vì vậy sửa URL sang ID người khác không lấy được record và trả 404. Có record thì gọi instance `destroy()`.

Không có kiểm tra address đang được Order tham chiếu hay là default trước khi destroy trong controller. Kết quả thật còn phụ thuộc foreign-key constraint của schema/database.

## 7. Service

Không có address service. Controller truy cập Sequelize models `UserAddress` và optional `User` trực tiếp:

```text
Route → Middleware → authController function
→ Sequelize UserAddress/User → MySQL
```

## 8. Model và bảng MySQL

| Model | Table | Operation | Mục đích |
|---|---|---|---|
| UserAddress | user_addresses | SELECT/COUNT/INSERT/UPDATE/DELETE | danh sách, thêm, default, xóa |
| User | users | SELECT phone | fallback phone khi request add không gửi phone |
| Order | orders | SELECT ở checkout, không ở address controller | address_id tham chiếu địa chỉ được chọn |

Association thật:

```javascript
User.hasMany(UserAddress, { foreignKey: "user_id" });
UserAddress.belongsTo(User, { foreignKey: "user_id" });
```

Các cột UserAddress: `user_id`, `receiver_name`, `phone`, `address`, `ward`, `district`, `province`, `is_default`, timestamps.

## 9. Database Query

### Danh sách

```text
Function: addresses
Model/Table: UserAddress/user_addresses
Operation: SELECT
WHERE: user_id=req.session.userId
ORDER BY: is_default DESC, created_at DESC
```

```sql
SELECT * FROM user_addresses
WHERE user_id = ?
ORDER BY is_default DESC, created_at DESC;
```

### Thêm

```text
addAddress → User.findByPk: SELECT phone FROM users WHERE id=? (chỉ khi thiếu phone)
addAddress → UserAddress.count: COUNT(*) FROM user_addresses WHERE user_id=?
addAddress → UserAddress.create: INSERT user_addresses(...)
addAddress → UserAddress.update: UPDATE các địa chỉ khác SET is_default=false (nếu địa chỉ mới default)
```

SQL tương đương update default:

```sql
UPDATE user_addresses
SET is_default = FALSE
WHERE user_id = ? AND id <> ?;
```

### Xóa

```text
Function: deleteAddress
Operation: SELECT rồi DELETE
WHERE ownership: id=req.params.id AND user_id=req.session.userId
```

```sql
SELECT * FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1;
DELETE FROM user_addresses WHERE id = ?;
```

## 10. Transaction

Không sử dụng transaction trong `addAddress()` hoặc `deleteAddress()`.

Rủi ro add default:

```text
INSERT địa chỉ mới is_default=true thành công
↓
UPDATE địa chỉ cũ về false bị lỗi
↓
User có thể tạm thời có nhiều địa chỉ default
```

Hai request thêm default đồng thời cũng có race condition vì COUNT/INSERT/UPDATE không được khóa/gom transaction. Source không cho thấy unique constraint bảo đảm mỗi user chỉ có một default.

Khi xóa địa chỉ đang default, `deleteAddress()` không tìm một địa chỉ khác để đặt `is_default=true`. User có thể còn nhiều địa chỉ nhưng không còn địa chỉ mặc định; checkout vẫn chọn phần tử đầu tiên trên UI nhờ điều kiện `address.is_default || index===0`.

## 11. Response

- GET: `res.json({data})` với toàn bộ địa chỉ của user.
- POST 201: `res.status(201).json({message:"Đã thêm địa chỉ.",data:address})`.
- POST 400: thiếu receiver_name/phone/address/province.
- DELETE 404: ID không tồn tại hoặc không thuộc user.
- DELETE 200: `res.json({message:"Đã xóa địa chỉ."})`.
- 401: middleware `signedIn` chặn.

Frontend add hiển thị `result.message`, reset form và refresh. Frontend delete bỏ qua response body và chỉ refresh.

## 12. Tóm tắt

```text
profile.js /tai-khoan
→ GET/POST/DELETE /api/auth/addresses
→ signedIn → asyncRoute
→ authController.addresses()/addAddress()/deleteAddress()
→ UserAddress.findAll/count/create/update/findOne/destroy
→ optional User.findByPk(phone)
→ user_addresses/users
→ JSON → refreshAddresses()
```

### Quan hệ với checkout

Checkout gọi `GET /api/auth/addresses` để render radio. Khi tạo PayPal order, `paymentController.createOrder()` không tin address ID đơn thuần mà query:

```javascript
db.UserAddress.findOne({
  where: { id: addressId, user_id: req.session.userId },
});
```

Sau đó Shipment copy snapshot receiver/phone/address/ward/district/province. Vì Shipment giữ bản sao, thay đổi/xóa UserAddress về sau không làm thay đổi địa chỉ trên shipment đã tạo.

### Câu trả lời khi giảng viên hỏi “user tự sửa địa chỉ bằng hàm nào?”

> Không tìm thấy hàm sửa địa chỉ trong source hiện tại. `authController` chỉ có `addresses()`, `addAddress()` và `deleteAddress()`, tương ứng GET/POST/DELETE `/api/auth/addresses`. Hiện user phải thêm địa chỉ mới rồi xóa địa chỉ cũ; nếu yêu cầu edit tại chỗ thì project còn thiếu route PUT/PATCH và controller update.

---

# DATABASE SUMMARY

| Flow | Function | Model | Table | Operation | Purpose |
|---|---|---|---|---|---|
| Login | login | User | users | SELECT/UPDATE | auth, fail counter, lock |
| Product | getProductsPage | Product/Category/Brand/ProductImage | products/categories/brands/product_images | SELECT | list/search/page |
| Product | getProductDetailPage | Product + associations | products/categories/brands/product_images | SELECT | detail |
| Stock sync | syncProductQuantity | ProductBatch/Product | product_batches/products | SUM/UPDATE | cached stock |
| Combo | findCombos | Combo/ComboItem/Product/ComboSetting | combos/combo_items/products/combo_settings | SELECT | compute price/availability |
| Checkout | createOrder | UserAddress/Product | user_addresses/products | SELECT | ownership/price/stock |
| Checkout | createOrder | Order/OrderDetail/Shipment/Payment | orders/order_details/shipments/payments | INSERT | persist pending order |
| Coupon | createOrder | Coupon/OrderCoupon/CouponUser | coupons/order_coupons/coupon_users | SELECT/INSERT/UPDATE | apply once/quota |
| PayPal | createOrder | Payment | payments | UPDATE | PayPal ID/response |
| PayPal | captureOrder | Payment/Order | payments/orders | SELECT/UPDATE | ownership, paid/order status |
| FEFO | reserve | OrderDetail/ProductBatch | order_details/product_batches | SELECT/UPDATE | allocate inventory |
| FEFO | reserve | InventoryTransaction/Product | inventory_transactions/products | INSERT/UPDATE | ledger/sold count |
| Cancel | restore | InventoryTransaction/ProductBatch/Product | inventory_transactions/product_batches/products | SELECT/INSERT/UPDATE | return exact batches |
| Chat | reply | Product/ProductImage | products/product_images | SELECT | catalog thật cho AI |
| Chat | getOrderContext | Order/OrderDetail/Shipment/Payment | orders/order_details/shipments/payments | SELECT/SUM/COUNT | lịch sử đúng user |
| Chat | findCombos | Combo/ComboItem/Product/ComboSetting | combos/combo_items/products/combo_settings | SELECT | combo cho tư vấn nhà hàng |
| Chat recipe | suggestRecipe | Product/RecipeProductLink/Recipe | products/recipe_product_links/recipes | SELECT | công thức và map nguyên liệu |
| Admin edit | AdminJS edit action | resource Sequelize model | bảng tương ứng resource | SELECT/UPDATE | tải form và lưu field đã sửa |
| Admin batch edit | ProductBatch hooks | ProductBatch/Product/InventoryTransaction | product_batches/products/inventory_transactions | UPDATE/SUM/INSERT | sửa lô, sync tổng kho, ghi adjustment |
| Admin shipment edit | normalizeShipment + model hooks | Shipment/Order/OrderHistory | shipments/orders/order_histories | UPDATE/SELECT/INSERT | chuẩn hóa và đồng bộ trạng thái |
| Admin upload | uploadFeature/cloudinaryProvider | model có image | bảng tương ứng + Cloudinary | UPDATE/external upload | lưu URL ảnh |
| Cloudinary profile | profile/uploadImage | User | users + Cloudinary | SELECT/UPDATE/external upload | cập nhật avatar URL |
| Cloudinary admin | uploadFeature/provider | model có image | bảng resource + Cloudinary | UPDATE/upload/destroy | quản lý ảnh resource |
| Address list | addresses | UserAddress | user_addresses | SELECT | địa chỉ đúng user, default trước |
| Address add | addAddress | User/UserAddress | users/user_addresses | SELECT/COUNT/INSERT/UPDATE | thêm và chuyển default |
| Address delete | deleteAddress | UserAddress | user_addresses | SELECT/DELETE | ownership và xóa |

# FUNCTION CALL MAP

```text
login()
├── User.findOne()
├── bcrypt.compare()
├── user.update() [các nhánh fail/lock/reset]
├── req.session.userId = user.id
└── new UserRespone(user)

getProductsPage()
├── Product.findAndCountAll()
│   └── include Category, Brand, ProductImage
├── Category.findAll()
├── decorateProduct()
└── res.render(products/index.njk)

getProductDetailPage()
├── Product.findOne(include Category, Brand, ProductImage)
├── decorateProduct()
└── res.render(products/detail.njk)

getCombosPage()/comboController.list/detail()
└── findCombos()
    ├── Combo.findAll(include ComboItem(include Product))
    ├── ComboSetting.findByPk(1)
    └── calculateCombo()

createOrder() [PayPal create]
├── UserAddress.findOne()
├── Product.findAll()
├── findCombos() → calculateCombo()
├── Coupon.findOne()/CouponUser.count()/calculateDiscount()
├── transaction 1
│   ├── Order.create()
│   ├── OrderDetail.bulkCreate()
│   ├── Shipment.create()
│   ├── Payment.create()
│   └── OrderCoupon/CouponUser create + Coupon.increment()
├── paypalRequest('/v2/checkout/orders')
└── payment.update(transaction_code, gateway_response)

captureOrder()
├── Payment.findOne(include Order ownership)
├── paypalRequest('/capture')
├── verify status/currency/amount
└── transaction 2
    ├── orderInventory.reserve()
    │   ├── InventoryTransaction.count()
    │   ├── OrderDetail.findAll()
    │   ├── ProductBatch.findAll(FEFO + lock)
    │   ├── batch.update()
    │   ├── InventoryTransaction.create()
    │   ├── detail.update()
    │   └── Product.increment()
    ├── payment.update()
    └── Order.update() → OrderHistory.create()/Shipment.update() hooks

sendChatMessage()
└── POST /api/chat
    └── signedIn → validate(ChatReq) → chatController.reply()
        ├── isCookingQuestion() = true
        │   └── suggestRecipe()
        │       ├── embedText() → Gemini embedding API
        │       ├── queryFaiss() → query_recipe_index.py
        │       ├── Product.findAll()
        │       ├── RecipeProductLink.findAll()
        │       ├── generateJson(recipeSchema) hoặc localRecipe()
        │       └── Recipe.findOne() [image]
        └── câu hỏi thường
            ├── Product.findAll()
            ├── getOrderContext()
            │   ├── Order.findAll(include details/shipment/payment)
            │   ├── Order.sum()
            │   └── Order.count()
            ├── findCombos()
            ├── generateJson() hoặc localReply()
            └── new ChatRespone()

createAdmin()
├── AdminJS.registerAdapter(@adminjs/sequelize)
├── buildResources(models, ...)
│   ├── property/action visibility config
│   ├── optional uploadFeature()
│   ├── optional normalizeShipment() trước edit
│   └── optional enrichComboRecords()/rebuildAfter()
└── buildAuthenticatedRouter()
    └── authenticate(ADMIN_EMAIL, ADMIN_PASSWORD)

AdminJS generic edit action
├── load record qua Sequelize adapter
├── apply request.payload/property rules
├── optional action.before
├── adapter UPDATE Sequelize model
├── optional Sequelize model hooks
│   ├── ProductBatch → syncProductQuantity + recordInventoryTransaction
│   ├── Shipment → Order.findByPk + order.update
│   └── Order → OrderHistory.create + Shipment.update
└── AdminJS action response/notice

profileForm avatar upload
├── FileReader.readAsDataURL()
├── PUT /api/auth/profile
├── signedIn → authController.profile()
├── User.findByPk(session.userId)
├── uploadImage(avatarData, folder)
│   ├── ensureCloudinaryConfigured()
│   └── cloudinary.uploader.upload()
├── user.update({ avatar: secure_url })
└── UserRespone → reload

AdminJS image upload
├── uploadFeature validation
├── createUploadPath(modelName)
├── cloudinaryProvider.upload(file.path, imageUrl)
│   └── cloudinary.uploader.upload(public_id, overwrite)
├── Sequelize adapter lưu image/avatar URL
└── optional provider.delete()
    └── cloudinary.uploader.destroy(publicId, invalidate)

refreshAddresses()
└── GET /api/auth/addresses
    └── signedIn → addresses()
        └── UserAddress.findAll(user_id, order)

addressForm submit
└── POST /api/auth/addresses
    └── signedIn → addAddress()
        ├── optional User.findByPk(phone)
        ├── UserAddress.count()
        ├── UserAddress.create()
        └── optional UserAddress.update(other defaults=false)

delete address click
└── DELETE /api/auth/addresses/:id
    └── signedIn → deleteAddress()
        ├── UserAddress.findOne(id + user_id)
        └── address.destroy()
```

# FUNCTION → DATABASE MAP

| Function | File | Model | Table | Query |
|---|---|---|---|---|
| login | src/controllers/authController.js | User | users | SELECT by email; UPDATE lock counters |
| getProductsPage | src/controllers/viewController.js | Product + associations | products/categories/brands/product_images | SELECT active/search/category/page |
| getProductDetailPage | src/controllers/viewController.js | Product + associations | same | SELECT id + active |
| syncProductQuantity | src/models/index.js | ProductBatch/Product | product_batches/products | SUM remaining; UPDATE quantity |
| findCombos | src/services/comboService.js | Combo/ComboItem/Product/ComboSetting | combos/combo_items/products/combo_settings | SELECT configuration/components |
| validateCoupon | src/controllers/paymentController.js | Coupon/CouponUser | coupons/coupon_users | SELECT/COUNT |
| createOrder | src/controllers/paymentController.js | UserAddress/Product | user_addresses/products | SELECT ownership/active items |
| createOrder | same | Order/OrderDetail/Shipment/Payment | orders/order_details/shipments/payments | INSERT |
| createOrder | same | Coupon/OrderCoupon/CouponUser | coupons/order_coupons/coupon_users | lock/INSERT/increment |
| captureOrder | same | Payment/Order | payments/orders | SELECT ownership; UPDATE statuses |
| reserve | src/services/orderInventory.js | InventoryTransaction/OrderDetail/ProductBatch/Product | inventory_transactions/order_details/product_batches/products | COUNT/SELECT/UPDATE/INSERT |
| restore | same | InventoryTransaction/ProductBatch/Product | inventory_transactions/product_batches/products | SELECT/UPDATE/INSERT/decrement |
| reply | src/controllers/chatController.js | Product/ProductImage | products/product_images | SELECT active catalog LIMIT 80 |
| getOrderContext | src/controllers/chatController.js | Order/OrderDetail/Shipment/Payment | orders/order_details/shipments/payments | SELECT latest; SUM/COUNT completed |
| suggestRecipe | src/services/recipeSearch.js | Product/Category/ProductImage | products/categories/product_images | SELECT active in-stock products |
| suggestRecipe | same | RecipeProductLink/Product | recipe_product_links/products | SELECT links by priority |
| suggestRecipe | same | Recipe | recipes | SELECT active recipe image by name |
| createAdmin | src/admin/admin.js | tất cả model đã cấu hình | các bảng resource | đăng ký adapter/resources/router |
| buildResources | src/admin/resources.js | model theo resource | bảng tương ứng | cấu hình generated SELECT/UPDATE actions |
| normalizeShipment | src/admin/resources.js | Shipment | shipments | chuẩn hóa payload trước UPDATE |
| syncProductQuantity | src/models/index.js | ProductBatch/Product | product_batches/products | SUM batch; UPDATE cached quantity |
| recordInventoryTransaction | src/models/index.js | InventoryTransaction | inventory_transactions | INSERT ADJUST sau batch edit |
| cloudinaryProvider.upload | src/admin/cloudinary-provider.js | model có image | Cloudinary + bảng resource | upload file; adapter lưu URL |
| profile | src/controllers/authController.js | User | users | SELECT session user; UPDATE avatar URL |
| uploadImage | src/services/cloudinaryService.js | không phải Sequelize model | Cloudinary | upload Data URL và trả secure_url/metadata |
| createUploadPath | src/admin/cloudinary-provider.js | không phải Model | Cloudinary path | tạo public ID/URL đích |
| cloudinaryProvider.delete | same | không phải Model | Cloudinary | destroy asset theo public ID suy từ URL |
| addresses | src/controllers/authController.js | UserAddress | user_addresses | SELECT by user, order default/newest |
| addAddress | same | User/UserAddress | users/user_addresses | optional SELECT phone; COUNT; INSERT; UPDATE defaults |
| deleteAddress | same | UserAddress | user_addresses | SELECT ownership; DELETE record |

# QUICK DEFENSE GUIDE

### 1. Khi login, backend lấy user từ bảng nào?

`src/controllers/authController.js`, hàm `login()`, model `User`, bảng `users`. Query là `User.findOne({where:{email}})`; password so bằng `bcrypt.compare()`.

### 2. Tồn kho sản phẩm lấy từ đâu?

UI đọc `products.quantity`. Cột này được `syncProductQuantity()` trong `src/models/index.js` cập nhật từ `ProductBatch.sum('remaining_quantity')` của bảng `product_batches` qua hooks batch.

### 3. Combo tính giá bằng function nào?

`calculateCombo()` trong `src/services/comboService.js`; `findCombos()` load `combos → combo_items → products`, rồi gọi function này.

### 4. Combo biết còn bán được bao nhiêu bằng cách nào?

Mỗi item tính `floor(Product.quantity / (base_quantity × quantity_multiplier))`; `availableQuantity` là MIN của các item. `Product.quantity` là stock đã đồng bộ từ batches.

### 5. Tại sao checkout phải tính lại giá?

Cart nằm trong localStorage nên người dùng có thể sửa. `createOrder()` chỉ nhận ID/quantity; nó reload Product/Combo/Coupon, lấy giá DB và tự tính subtotal, shipping, discount.

### 6. Khi tạo PayPal order thì Order DB đã tồn tại chưa?

Có. `createOrder()` commit transaction tạo `orders`, `order_details`, `shipments`, `payments` trước rồi mới gọi PayPal. Nếu PayPal create lỗi, payment chuyển status 2 nhưng order vẫn tồn tại.

### 7. Capture thành công cập nhật bảng nào?

`product_batches`, `inventory_transactions`, `order_details` (batch/cost lô đầu), `products` (sold_count và quantity qua hook), `payments`, `orders`; hook order còn INSERT `order_histories` và UPDATE `shipments`.

### 8. FEFO implement ở đâu?

`reserve()` trong `src/services/orderInventory.js`: `ProductBatch.findAll()` lọc remaining > 0, order `expiry_date ASC`, `id ASC`, và khóa `FOR UPDATE`.

### 9. Một batch không đủ thì xử lý thế nào?

Trừ `min(needed, remaining)` rồi tiếp tục batch kế. Nếu tổng tất cả batch vẫn thiếu, throw error và transaction capture rollback các thay đổi DB.

### 10. PayPal thành công nhưng cập nhật tồn kho lỗi thì sao?

Transaction DB rollback reserve/payment/order, nhưng PayPal capture đã xảy ra trước transaction. Source không có auto refund/compensating transaction, nên có rủi ro khách đã bị trừ tiền trong khi DB chưa đánh dấu paid; cần đối soát/refund vận hành.

### 11. Chatbot có đọc đơn hàng của người khác không?

Không theo query hiện tại. `getOrderContext(req.session.userId)` luôn thêm `where:{user_id:userId}`; route còn bắt buộc `signedIn`. Tuy nhiên history chat là dữ liệu client gửi, không phải dữ liệu order tin cậy.

### 12. Khi Gemini lỗi, chatbot có ngừng hoàn toàn không?

Không nhất thiết. Chat thường chuyển sang `localReply()` và `selectProducts()`. Nhánh món ăn chuyển sang `localRecipe()`, nhưng fallback này chỉ biết “Mì xào bò” và “Lẩu bò”; món khác trả câu không biết món.

### 13. Chat được lưu ở bảng nào?

Không tìm thấy model/bảng chat trong source hiện tại. Frontend giữ tối đa 8 message trong biến `chatHistory`; reload trang sẽ mất. Database chỉ được đọc để lấy catalog, order, combo và recipe context.

### 14. Giao diện `/admin` có dùng bảng users không?

Không. `/admin` dùng `buildAuthenticatedRouter()`, so `ADMIN_EMAIL/ADMIN_PASSWORD` từ env và cookie `adminjs`. Các API CRUD quản trị trùng AdminJS và middleware `adminOnly` đã được gỡ khỏi source.

### 15. Khi admin sửa tồn của một ProductBatch, bảng nào thay đổi?

Adapter UPDATE `product_batches`. Hook `afterUpdate` SUM lại các batch để UPDATE `products.quantity` và INSERT một dòng `ADJUST` vào `inventory_transactions` với chênh lệch quantity.

### 16. Admin sửa Shipment có thể đổi Order không?

Có. `normalizeShipment()` chuẩn hóa payload; `Shipment.afterUpdate` map shipping status 2→order status 3 và 3→4. `Order.afterUpdate` tiếp tục INSERT `order_histories` và đồng bộ shipment theo mapping của Order.

### 17. Ảnh avatar được lưu trong MySQL hay Cloudinary?

Binary ảnh nằm trên Cloudinary. Bảng `users` chỉ lưu `secure_url` vào cột `avatar`. `uploadImage()` còn nhận publicId/width/height/format nhưng `profile()` không lưu các metadata đó.

### 18. Tại sao upload Cloudinary và cập nhật database không atomic?

Cloudinary là API ngoài, còn Sequelize transaction chỉ quản lý MySQL. Source upload trước rồi mới `User.update()` và không có compensation; nếu DB lỗi sau upload, ảnh có thể bị orphan trên Cloudinary.

### 19. User thay avatar thì ảnh cũ có bị xóa không?

Không tìm thấy lời gọi `cloudinary.uploader.destroy()` trong `profile()`. Provider admin có hàm delete cho lifecycle `@adminjs/upload`, nhưng nhánh avatar user chỉ upload URL mới và update `users.avatar`.

### 20. User cập nhật một địa chỉ đã tồn tại bằng route nào?

Không tìm thấy route đó. Source chỉ có GET danh sách, POST thêm và DELETE xóa. Muốn đổi nội dung hiện phải thêm record mới rồi xóa record cũ; PUT/PATCH update address chưa được implement.

### 21. Làm sao backend ngăn user xóa/chọn address của người khác?

`deleteAddress()` query cả `id` và `user_id=session.userId`. Checkout cũng query `UserAddress.findOne({where:{id:addressId,user_id:session.userId}})`. ID đúng nhưng không thuộc user vẫn không được sử dụng.

### 22. Đổi địa chỉ tài khoản có đổi địa chỉ của order cũ không?

Không theo cấu trúc hiện tại. Khi tạo order, backend copy receiver/phone/address/ward/district/province sang `shipments`. Shipment là snapshot giao hàng; nó không đọc lại nội dung UserAddress mỗi lần xem.

### 23. `orders.status=3` và `shipments.shipping_status=3` có giống nhau không?

Không. Order status 3 là “Đang giao”, còn Shipment status 3 là “Đã giao”. Shipment chuyển sang 3 sẽ kích hoạt hook đổi Order sang status 4 “Đã hoàn thành”.

### 24. Payment được coi là thành công từ lúc tạo PayPal order chưa?

Chưa. Lúc tạo record, `payments.status=0`. Tạo PayPal order chỉ lưu transaction code. Chỉ sau capture có cả hai status `COMPLETED`, đúng USD/amount và FEFO thành công thì backend mới UPDATE Payment status 1.

### 25. Combo status true có chắc chắn được bán không?

Không. Còn phải có item, đủ quantity, giá dương và thấp hơn retail. Ngoài ra source hiện không loại Product status 0/2 trong `findCombos()`, nên đây là lỗ hổng logic cần lưu ý.

# Kết quả tự kiểm tra chéo

- Các file/function/route/model/table nêu trên đều tồn tại trong source hiện tại.
- Controller combo thực sự gọi `findCombos`; payment thực sự gọi `comboService.findCombos`, coupon functions và `orderInventory.reserve`.
- Association dùng đúng FK trong `src/models/index.js`; không ghi nhận association Product→Batch ở product detail vì controller không include nó.
- Hai transaction PayPal có thứ tự đúng code: persist DB/commit → create PayPal; capture PayPal/verify → transaction reserve/update.
- FEFO đúng code: `expiry_date ASC`, sau đó `id ASC`, row lock và allocation qua nhiều batch.
- Chatbot đúng hai nhánh code: cooking gọi `suggestRecipe()` trước; nhánh thường load Product/order context/combo rồi gọi `generateJson()` với local fallback.
- Admin UI đúng kiến trúc AdminJS generated action → resource config → Sequelize adapter/model; không ghi sai thành controller/service tự viết.
- Cloudinary được tách đúng hai nhánh: profile dùng Data URL + service; AdminJS dùng file path + upload provider. MySQL chỉ lưu URL.
- Address flow đúng source: chỉ list/add/delete; không dựng route update không tồn tại. Ownership luôn dựa trên session user ID.
- SQL trong tài liệu chỉ là SQL tương đương; không khẳng định source chứa raw SQL.
