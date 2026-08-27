# Nông Sản Xanh

Nền tảng thương mại điện tử bán nông sản gồm website khách hàng, REST API và trang quản trị AdminJS. Hệ thống hỗ trợ bán lẻ cho gia đình, combo số lượng lớn cho nhà hàng, tồn kho theo lô, PayPal và trợ lý món ăn Gemini.

## Chức năng chính

### Khách hàng

- Đăng ký, đăng nhập, quản lý hồ sơ và địa chỉ nhận hàng.
- Tìm kiếm, lọc sản phẩm; trang chủ nhóm sản phẩm thành từng hàng danh mục cuộn ngang theo alphabet.
- Hai chế độ mua sắm: **Dành cho nội trợ** và **Dành cho nhà hàng**.
- Mua chung sản phẩm lẻ và combo trong một giỏ hàng.
- Thanh toán PayPal, theo dõi vận chuyển, lịch sử đơn và mua lại combo.
- Đánh giá sản phẩm và nhận gợi ý công thức món ăn.

### Combo nhà hàng

- Combo nhỏ, vừa, lớn do quản trị viên thiết lập thủ công.
- Một combo gồm một hoặc nhiều sản phẩm với hệ số số lượng lớn.
- Giá theo phần trăm giảm, số tiền giảm cố định hoặc giá nhập thủ công.
- Hiển thị giá mua lẻ, giá combo, số tiền và phần trăm tiết kiệm.
- Tự tính khả dụng từ tồn kho; tự ẩn khi thiếu hàng hoặc không rẻ hơn mua lẻ.
- Backend kiểm tra lại giá, mức mua tối thiểu và tồn kho khi đặt hàng.
- Đơn có combo được miễn phí giao hàng; kho được trừ/hoàn theo từng thành phần.

### Chatbot và công thức

- Tư vấn sản phẩm và combo đang còn hàng.
- Trả lời trạng thái đơn, mã vận đơn, lịch sử mua và tổng chi tiêu của tài khoản đang đăng nhập.
- Tổng chi tiêu chỉ tính đơn đã hoàn thành; mọi truy vấn đơn đều lọc theo `session.userId`.
- Gợi ý công thức từ PDF, Gemini và chỉ mục FAISS.

### Quản trị

- AdminJS tiếng Việt tại `/admin`, menu được tổ chức theo nghiệp vụ.
- Quản lý người dùng, sản phẩm, thương hiệu, danh mục, lô hàng, combo, đơn hàng, vận chuyển, nội dung, khuyến mãi, kho và công thức.
- Các bảng liên kết được ẩn khỏi sidebar nhưng có thể mở từ bản ghi cha.
- Cảnh báo combo thiếu thành phần, chưa cấu hình hoặc không có lợi hơn mua lẻ.
- Upload ảnh qua Cloudinary và dashboard thống kê.

## Công nghệ

- Node.js, Express 4, MySQL, Sequelize 6
- AdminJS 7, Nunjucks, JavaScript, CSS
- Joi, bcryptjs, express-session
- PayPal REST API, Cloudinary, Gemini API, FAISS
- Jest, Playwright, Newman, Allure
- Docker Compose, GitHub Actions

## Yêu cầu

- Node.js 22 trở lên
- Yarn 1.x
- Docker Desktop/Compose hoặc MySQL cài trực tiếp
- Python nếu cần xây dựng chỉ mục công thức

## Cài đặt

```bash
yarn install
```

Tạo file môi trường:

```powershell
Copy-Item .env.example .env
```

Các biến quan trọng:

```env
HOST=127.0.0.1
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=3307
DB_USERNAME=root
DB_PASSWORD=123456
DB_DATABASE=web_nong_san
DB_DIALECT=mysql

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_COOKIE_SECRET=thay-bang-mot-chuoi-bi-mat
ADMIN_WATCH=false
SESSION_SECRET=thay-bang-mot-chuoi-bi-mat-khac

GEMINI_API_KEY=
GEMINI_TEXT_MODEL=gemini-3.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=web-nong-san

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_VND_PER_USD=25000
STANDARD_SHIPPING_FEE=0
```

Không commit `.env`, mật khẩu, cookie secret hoặc API key. Giữ `ADMIN_WATCH=false` khi phát triển API/storefront; chỉ bật khi sửa component React của AdminJS.

### Khởi động database

```bash
yarn docker:up
docker compose ps
yarn db:migrate
```

Docker Compose mặc định mở MySQL tại `127.0.0.1:3307`. Nếu dùng MySQL cài trực tiếp và database chưa tồn tại, chạy `yarn db:create` trước migration.

### Chạy ứng dụng

```bash
yarn dev
```

| Thành phần | Địa chỉ |
| --- | --- |
| Website | <http://127.0.0.1:3000> |
| Combo nhà hàng | <http://127.0.0.1:3000/combo-nha-hang> |
| AdminJS | <http://127.0.0.1:3000/admin> |
| Swagger UI | <http://127.0.0.1:3000/api-docs> |

## Tạo combo nhà hàng

1. Mở **Combo nhà hàng** trong AdminJS và tạo bản ghi.
2. Chọn kích cỡ, hệ số số lượng và cách tính giá.
3. Mở combo, chọn **Sản phẩm trong combo** và thêm thành phần.
4. Mở **Cấu hình combo** để đặt số lượng mua tối thiểu dùng chung.
5. Combo xuất hiện khi đang bật, đủ tồn kho và có giá thấp hơn mua lẻ.

```text
Giá mua lẻ = Σ (giá sản phẩm × số lượng cơ sở × hệ số)
Tiền tiết kiệm = giá mua lẻ − giá combo
Phần trăm tiết kiệm = tiền tiết kiệm / giá mua lẻ × 100
```

## API chính

| Nhóm | Prefix | Truy cập |
| --- | --- | --- |
| Xác thực/tài khoản | `/api/auth` | Tùy endpoint |
| Storefront | `/api/storefront` | Công khai |
| Sản phẩm/danh mục | `/api/products`, `/api/categories` | Xem công khai |
| Combo nhà hàng | `/api/combos` | Công khai |
| Đơn hàng | `/api/orders` | Cần đăng nhập |
| PayPal | `/api/payments` | Tạo/capture cần đăng nhập |
| Chatbot | `/api/chat` | Cần đăng nhập |
| Công thức | `/api/recipes` | Gợi ý cần đăng nhập |

- `GET /api/storefront`: sản phẩm có phân trang và bộ lọc.
- `GET /api/storefront/grouped`: sản phẩm nhóm theo danh mục cho các hàng cuộn ngang trên trang chủ.

## Tồn kho và thanh toán

1. Client chỉ gửi ID và số lượng.
2. Backend tải lại sản phẩm/combo, tính giá và xác thực tồn kho.
3. Đơn, chi tiết, vận chuyển và payment được tạo trong transaction.
4. PayPal phải xác nhận đủ tiền trước khi giữ kho.
5. Combo được bung thành từng thành phần để xuất kho theo lô.
6. Hủy đơn hợp lệ sẽ hoàn kho và ghi giao dịch tương ứng.

`STANDARD_SHIPPING_FEE` áp dụng cho đơn chỉ có hàng lẻ. Đơn có combo hợp lệ luôn có phí giao hàng bằng `0`.

## Công thức thông minh

```bash
yarn recipes:index
yarn recipes:index:smoke
```

Đặt `GEMINI_API_KEY`, chạy migration và thêm nguồn PDF trước khi xây dựng chỉ mục. Dữ liệu tại `data/recipes/` không được commit.

## Kiểm thử

```bash
# Jest
yarn test --runInBand

# Playwright
npx playwright install
yarn test:e2e

# Newman
yarn api:test

# Allure
yarn test:allure
yarn allure:generate
yarn allure:open
```

Các test mới quan trọng:

```bash
yarn test tests/combo-pricing.test.js --runInBand
yarn test tests/chat-order-history.test.js --runInBand
yarn test tests/cart.test.js --runInBand
```

## Cấu trúc dự án

```text
src/
├── admin/          # AdminJS và dashboard
├── config/         # Server, database, Cloudinary, view engine
├── controllers/    # Xử lý request
├── docs/           # OpenAPI
├── dtos/           # Validate request/response
├── middlewares/    # Xác thực và phân quyền
├── migration/      # Sequelize migrations
├── models/         # Models, associations, hooks
├── public/         # CSS, JavaScript, hình ảnh
├── routes/         # API và page routes
├── scripts/        # Xây dựng chỉ mục công thức
├── services/       # Combo, kho, Gemini, Cloudinary
└── views/          # Nunjucks và trang legacy

tests/              # Jest và Playwright
api-testing-project/# Postman/Newman
```

## Lệnh thường dùng

| Lệnh | Mô tả |
| --- | --- |
| `yarn dev` | Chạy server với Nodemon |
| `yarn start` | Chạy server với Node.js |
| `yarn docker:up` | Khởi động MySQL |
| `yarn docker:down` | Dừng Docker Compose |
| `yarn db:create` | Tạo database |
| `yarn db:migrate` | Chạy migration |
| `yarn db:migrate:undo` | Hoàn tác migration gần nhất |
| `yarn test` | Chạy Jest |
| `yarn test:e2e` | Chạy Playwright |
| `yarn api:test` | Chạy Newman |

## Xử lý lỗi nhanh

- **Không kết nối MySQL:** kiểm tra Docker, host, port, mật khẩu và `yarn docker:logs`.
- **AdminJS khởi động chậm:** giữ `ADMIN_WATCH=false`.
- **Combo không xuất hiện:** kiểm tra trạng thái, thành phần, tồn kho và giá.
- **PayPal lỗi:** kiểm tra mode, client ID, secret và tỷ giá.
- **Upload ảnh lỗi:** kiểm tra các biến Cloudinary.
- **Chatbot/công thức lỗi:** kiểm tra Gemini API key và chỉ mục.

## Bảo mật

- `.env`, `docs/` ở thư mục gốc, báo cáo test và dữ liệu chỉ mục đều được ignore.
- Chatbot chỉ đọc đơn hàng theo `session.userId`.
- Giá, phí giao hàng và tồn kho luôn được xác minh lại ở backend.

## Giấy phép

MIT
