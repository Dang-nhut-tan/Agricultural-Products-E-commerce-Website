# Nông Sản Xanh

Ứng dụng bán nông sản gồm website khách hàng, REST API và trang quản trị AdminJS. Backend được xây dựng bằng Express, Sequelize và MySQL; giao diện sử dụng Nunjucks kết hợp JavaScript phía trình duyệt.

## Chức năng chính

### Khách hàng

- Đăng ký, đăng nhập, đăng xuất và kiểm tra phiên đăng nhập.
- Cập nhật hồ sơ, ảnh đại diện và địa chỉ nhận hàng.
- Xem, tìm kiếm và lọc sản phẩm theo danh mục.
- Xem thương hiệu, nhà cung cấp, banner, khuyến mãi và tin tức.
- Thêm sản phẩm vào giỏ hàng lưu trên trình duyệt.
- Thanh toán PayPal Sandbox hoặc Live.
- Xem chi tiết, lịch sử trạng thái và hủy đơn hàng hợp lệ.
- Xem, tạo, cập nhật và xóa đánh giá sản phẩm.

### Quản trị

- Đăng nhập AdminJS tại `/admin`.
- Quản lý người dùng, sản phẩm, danh mục, thương hiệu, lô hàng, đơn hàng, vận chuyển, tin tức, banner và mã giảm giá.
- Dashboard thống kê người dùng, sản phẩm, đơn hàng, đánh giá và lô hàng sắp hết hạn.
- Upload ảnh lên Cloudinary.
- Một số resource như địa chỉ, đánh giá và giao dịch kho được cấu hình chỉ đọc.

### Kho và đơn hàng

- Quản lý tồn kho theo lô sản phẩm.
- Tự động đồng bộ tổng tồn kho của sản phẩm.
- Lưu giao dịch nhập, xuất và điều chỉnh kho.
- Giữ lịch sử thay đổi trạng thái đơn hàng.
- Lưu giá vốn tại thời điểm bán.
- Hoàn kho khi đơn hàng được hủy.

## Công nghệ sử dụng

- Node.js, Express 4
- MySQL 8.4
- Sequelize 6 và Sequelize CLI
- AdminJS 7
- Nunjucks
- Joi
- bcryptjs và express-session
- PayPal REST API
- Cloudinary
- Swagger UI và OpenAPI 3
- Playwright, Newman và Allure
- Docker Compose
- GitHub Actions

## Yêu cầu

- Node.js 22 được khuyến nghị
- Yarn 1.x
- Docker Desktop và Docker Compose, hoặc MySQL cài trực tiếp

## Cài đặt

### 1. Cài dependencies

```bash
yarn install
```

### 2. Tạo file môi trường

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS hoặc Linux:

```bash
cp .env.example .env
```

Các biến cấu hình:

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
SESSION_SECRET=thay-bang-mot-chuoi-bi-mat-khac

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=web-nong-san

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_VND_PER_USD=25000
```

Cloudinary và PayPal có thể để trống khi chỉ cần khởi động và xem ứng dụng. Các chức năng upload ảnh và thanh toán chỉ hoạt động khi đã cung cấp thông tin hợp lệ.

Không commit `.env`, khóa API, mật khẩu hoặc cookie secret lên Git.

### 3. Khởi động MySQL

```bash
yarn docker:up
```

Kiểm tra container:

```bash
docker compose ps
```

Docker Compose mở MySQL ở `127.0.0.1:3307` và tự tạo database `web_nong_san`.

Nếu dùng MySQL cài trực tiếp và database chưa tồn tại:

```bash
yarn db:create
```

### 4. Chạy migration

```bash
yarn db:migrate
```

Kiểm tra trạng thái migration:

```bash
npx sequelize-cli db:migrate:status
```

Nạp dữ liệu dùng cho CI hoặc kiểm thử khi cần:

```bash
npx sequelize-cli db:seed:all
```

### 5. Khởi động ứng dụng

Chạy thông thường:

```bash
yarn start
```

Chạy phát triển và tự khởi động lại khi code thay đổi:

```bash
yarn dev
```

Các địa chỉ mặc định:

| Thành phần | Địa chỉ |
| --- | --- |
| Website | <http://127.0.0.1:3000> |
| AdminJS | <http://127.0.0.1:3000/admin> |
| Swagger UI | <http://127.0.0.1:3000/api-docs> |

Đăng nhập AdminJS bằng `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `.env`.

## REST API

Các route đang được mount trong ứng dụng:

| Nhóm | Prefix | Quyền truy cập |
| --- | --- | --- |
| Xác thực và tài khoản | `/api/auth` | Công khai hoặc yêu cầu đăng nhập tùy endpoint |
| Cửa hàng | `/api/storefront` | Công khai |
| Sản phẩm và đánh giá | `/api/products` | Xem công khai; ghi đánh giá cần đăng nhập |
| Danh mục | `/api/categories` | Xem công khai; thay đổi cần quyền admin |
| Thương hiệu | `/api/brands` | Xem công khai; thay đổi cần quyền admin |
| Banner | `/api/banners` | Xem công khai; thay đổi cần quyền admin |
| Tin tức | `/api/news` | Xem công khai; thay đổi cần quyền admin |
| Mã giảm giá | `/api/coupons` | Yêu cầu quyền admin |
| Người dùng | `/api/users` | Yêu cầu quyền admin |
| Đơn hàng của khách | `/api/orders` | Yêu cầu đăng nhập |
| Thanh toán PayPal | `/api/payments` | Cấu hình công khai; tạo và capture cần đăng nhập |

Chi tiết request, response và schema nằm trong:

- Swagger UI: <http://127.0.0.1:3000/api-docs>
- OpenAPI source: `src/docs/openapi.yaml`

Lưu ý: OpenAPI hiện có mô tả thêm nhóm `/api/admin/*`, nhưng các route này chưa được mount trong `src/routes/index.js`. Phần quản trị đang hoạt động thông qua AdminJS tại `/admin` và API nội bộ `/admin/api/*`.

## Xác thực

Ứng dụng có hai phiên đăng nhập độc lập:

- Khách hàng dùng session cookie `nong-san.sid`.
- AdminJS dùng session riêng do AdminJS Express quản lý.

Các REST API yêu cầu khách hàng đăng nhập sử dụng middleware `signedIn`. Các API quản lý danh mục, thương hiệu, banner, tin tức, coupon và người dùng sử dụng middleware `adminOnly`.

## Thanh toán PayPal

Luồng thanh toán:

1. Client lấy cấu hình từ `/api/payments/paypal/config`.
2. Server kiểm tra giỏ hàng, địa chỉ và tồn kho.
3. Server tạo đơn hàng, chi tiết đơn, vận chuyển và payment trong database.
4. Server tạo PayPal order theo USD.
5. Sau khi PayPal capture thành công, server xác nhận số tiền và giữ tồn kho.
6. Khách được chuyển đến trang chi tiết đơn hàng.

PayPal không hỗ trợ VND trực tiếp. `PAYPAL_VND_PER_USD` quy định số VND được quy đổi thành một USD.

## Kiểm thử

### Playwright

Cài browser ở lần chạy đầu:

```bash
npx playwright install
```

Chạy smoke test trên Chromium, Firefox và WebKit:

```bash
yarn test
```

Xem báo cáo HTML:

```bash
npx playwright show-report
```

Playwright tự khởi động server theo cấu hình trong `playwright.config.js`.

### Newman

Collection duy nhất nằm tại:

```text
api-testing-project/collections/Web Nông Sản API.postman_collection.json
```

Collection được chia thành hai nhóm:

- `Người dùng`
- `Admin`

Chạy API test:

```bash
yarn api:test
```

Server và database phải chạy trước khi chạy Newman.

Để test đăng nhập AdminJS trong Postman hoặc Newman, cấu hình hai biến sau với giá trị tương ứng trong `.env`:

```text
adminEmail
adminPassword
```

Không lưu mật khẩu thật vào collection nếu collection được commit lên Git.

### Allure

```bash
yarn test:allure
yarn allure:generate
yarn allure:open
```

Máy chạy Allure cần có Java.

## CI

Workflow `.github/workflows/playwright.yml` chạy khi push hoặc tạo pull request vào `main` hoặc `master`.

Pipeline hiện thực hiện:

1. Khởi tạo MySQL 8.4.
2. Cài dependencies.
3. Chạy migration và seeder.
4. Cài Chromium.
5. Chạy Playwright smoke test.
6. Khởi động backend.
7. Chạy Newman collection.

## Các lệnh thường dùng

| Lệnh | Chức năng |
| --- | --- |
| `yarn start` | Chạy server bằng Node.js |
| `yarn dev` | Chạy server bằng Nodemon |
| `yarn test` | Chạy Playwright |
| `yarn api:test` | Chạy collection bằng Newman |
| `yarn test:allure` | Chạy Playwright và tạo dữ liệu Allure |
| `yarn allure:generate` | Tạo báo cáo Allure |
| `yarn allure:open` | Mở báo cáo Allure |
| `yarn allure:serve` | Tạo và phục vụ báo cáo Allure tạm thời |
| `yarn docker:up` | Khởi động MySQL |
| `yarn docker:down` | Dừng MySQL |
| `yarn docker:logs` | Theo dõi log MySQL |
| `yarn db:create` | Tạo database |
| `yarn db:migrate` | Chạy migration |
| `yarn db:migrate:undo` | Hoàn tác migration gần nhất |

## Cấu trúc dự án

```text
.
├── api-testing-project/
│   ├── collections/       # Postman collection
│   ├── data/              # Dữ liệu chạy Newman
│   └── environments/      # Postman environment
├── src/
│   ├── admin/             # AdminJS, dashboard và resource config
│   ├── config/            # Server, database, view engine, Cloudinary
│   ├── controllers/       # Xử lý request
│   ├── docs/              # OpenAPI
│   ├── dtos/              # Request validation và response mapping
│   ├── middlewares/       # Xác thực, phân quyền, validate, async wrapper
│   ├── migration/         # Sequelize migrations
│   ├── models/            # Models, associations và hooks
│   ├── public/            # CSS và JavaScript phía trình duyệt
│   ├── routes/            # REST API và page routes
│   ├── seeders/           # Dữ liệu kiểm thử
│   ├── services/          # Cloudinary, tồn kho, sanitize HTML
│   ├── views/             # Nunjucks và trang legacy
│   └── index.js           # Điểm khởi động ứng dụng
├── tests/                 # Playwright tests
├── docker-compose.yml
├── playwright.config.js
└── package.json
```

## Xử lý lỗi thường gặp

### Không kết nối được MySQL

- Kiểm tra Docker Desktop đang chạy.
- Chạy `docker compose ps`.
- Khi dùng Docker Compose, đặt `DB_HOST=127.0.0.1` và `DB_PORT=3307`.
- Đảm bảo `DB_PASSWORD` khớp `MYSQL_ROOT_PASSWORD`.
- Xem log bằng `yarn docker:logs`.

### Cổng 3000 hoặc 3307 đang được sử dụng

- Đổi `PORT` trong `.env` nếu cổng web bị trùng.
- Đổi cổng bên trái trong `docker-compose.yml`, sau đó cập nhật `DB_PORT`.

### Upload ảnh không hoạt động

Điền đầy đủ `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET`, sau đó khởi động lại server.

### PayPal không hoạt động

- Kiểm tra `PAYPAL_MODE`, `PAYPAL_CLIENT_ID` và `PAYPAL_CLIENT_SECRET`.
- Dùng tài khoản PayPal Sandbox khi `PAYPAL_MODE=sandbox`.
- Kiểm tra `PAYPAL_VND_PER_USD` là số dương.

### Test AdminJS trả về trang login với status 200

Điều này thường xảy ra khi `adminEmail` hoặc `adminPassword` trong Postman không khớp `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `.env`.

## Giấy phép

MIT
