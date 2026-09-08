# TÀI LIỆU CÁC BẢNG DỮ LIỆU THEO LUỒNG NGHIỆP VỤ

## 1. Mục đích và phạm vi

Tài liệu này giải thích các bảng MySQL đang được khai báo trong `src/models/index.js` và được tạo/thay đổi bởi `src/migration/`. Các bảng được nhóm theo luồng nghiệp vụ để dễ lần theo code từ Controller/Service đến dữ liệu.

Quy ước:

- `PK`: khóa chính, mặc định là `id` tự tăng nếu không ghi chú khác.
- `FK`: khóa ngoại đến bảng khác.
- `NULL`: có thể chưa có giá trị.
- Hầu hết bảng có `created_at` và `updated_at` do Sequelize quản lý.
- `deleted_at` là xóa mềm: bản ghi vẫn nằm trong database nhưng Sequelize mặc định không trả về.
- `status` trong database là trạng thái nghiệp vụ, không phải HTTP status như `200`, `401` hoặc `500`.
- Kiểu trong bảng dưới đây thể hiện kiểu logic từ Sequelize; độ dài thực tế phụ thuộc dialect MySQL.

## 2. Bản đồ bảng theo luồng

| Luồng | Bảng chính | Vai trò |
|---|---|---|
| Đăng ký, đăng nhập, khóa tài khoản | `users` | Tài khoản, quyền, trạng thái và khóa đăng nhập tạm thời |
| Người dùng tự cập nhật địa chỉ | `users`, `user_addresses` | Hồ sơ người dùng và sổ địa chỉ |
| Danh mục, thương hiệu, sản phẩm | `categories`, `brands`, `products`, `product_images` | Catalog hiển thị cho khách hàng |
| Lô hàng và FEFO | `product_batches`, `inventory_transactions` | Tồn kho theo lô và lịch sử nhập/xuất/điều chỉnh |
| Combo nhà hàng | `combos`, `combo_items`, `combo_settings`, `products` | Cấu hình combo, thành phần, số lượng tối thiểu và giá |
| Checkout và PayPal | `orders`, `order_details`, `payments`, `shipments`, `order_histories` | Snapshot đơn hàng, thanh toán và vận chuyển |
| Mã giảm giá | `coupons`, `order_coupons`, `coupon_users` | Điều kiện mã, tiền giảm và lịch sử người dùng đã sử dụng |
| Đánh giá | `feedback`, `users`, `products`, `order_details` | Đánh giá gắn với người mua và dòng hàng đã mua |
| Tin tức và banner | `news`, `news_details`, `banner`, `banner_details` | Nội dung marketing và liên kết sản phẩm |
| Công thức/chatbot | `recipes`, `recipe_sources`, `recipe_product_links`, `products`, các bảng đơn hàng | Dữ liệu công thức, nguồn PDF, gợi ý sản phẩm và context người dùng |
| AdminJS | Tất cả bảng model | AdminJS thao tác trực tiếp qua Sequelize resource, không cần CRUD controller trùng lặp |

## 3. Sơ đồ quan hệ rút gọn

```text
users ──< user_addresses
  │
  ├──< orders ──< order_details >── products >── categories
  │      │              │                │    >── brands
  │      │              │                ├──< product_images
  │      │              └── feedback     └──< product_batches ──< inventory_transactions
  │      ├── payment
  │      ├── shipment
  │      ├──< order_histories
  │      └──< order_coupons >── coupons ──< coupon_users >── users
  │
  └──< feedback

combos ──< combo_items >── products
recipes ──< recipe_product_links >── products
news ──< news_details >── products
banner ──< banner_details >── products
```

## 4. Luồng tài khoản và địa chỉ

### 4.1. Bảng `users`

Lưu tài khoản khách hàng. AdminJS cũng đọc bảng này để quản trị người dùng; tài khoản đăng nhập trang `/admin` lại lấy từ biến môi trường `ADMIN_EMAIL` và `ADMIN_PASSWORD`, không phải một record bắt buộc trong bảng này.

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã người dùng |
| `email` | STRING | Không NULL, UNIQUE | Email đăng nhập; controller chuẩn hóa về chữ thường |
| `password_hash` | STRING | Không NULL | Mật khẩu đã băm bằng `bcryptjs`, không lưu mật khẩu rõ |
| `name` | STRING | NULL | Họ tên hiển thị |
| `role` | INTEGER | Mặc định `2` | Vai trò ứng dụng; cấu hình hiện dùng `2` cho người dùng thông thường |
| `status` | INTEGER | Mặc định `1` | `0`: không hoạt động; `1`: hoạt động; `2`: bị cấm |
| `failed_login_attempts` | INTEGER | Không NULL, mặc định `0` | Số lần nhập sai liên tiếp, tối đa nghiệp vụ là 5 |
| `locked_until` | DATE | NULL | Thời điểm hết khóa tạm; sai mật khẩu lần 5 sẽ khóa 1 giờ |
| `avatar` | STRING | NULL | URL ảnh đại diện, có thể được upload qua Cloudinary |
| `phone` | STRING | NULL | Số điện thoại hồ sơ |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Hai cơ chế khóa độc lập:

- `status != 1`: khóa/vô hiệu hóa do quản trị; không tự mở theo thời gian.
- `locked_until > hiện tại`: khóa tạm do nhập sai mật khẩu; hết hạn thì lần đăng nhập tiếp theo reset `failed_login_attempts` và `locked_until`.

Thuộc tính `password` trong model là `VIRTUAL`: chỉ giúp nhận mật khẩu mới và sinh `password_hash`, không phải cột trong MySQL.

### 4.2. Bảng `user_addresses`

Mỗi người dùng có thể tự thêm, sửa, xóa và chọn địa chỉ mặc định. Khi checkout, địa chỉ được sao chép sang `shipments`, nên sửa địa chỉ sau đó không làm thay đổi đơn cũ.

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã địa chỉ |
| `user_id` | INTEGER | FK → `users.id`, xóa User thì CASCADE | Chủ sở hữu địa chỉ |
| `receiver_name` | STRING | NULL | Tên người nhận |
| `phone` | STRING | NULL | Điện thoại nhận hàng |
| `address` | TEXT | NULL | Số nhà, tên đường |
| `ward` | STRING | NULL | Phường/xã |
| `district` | STRING | NULL | Quận/huyện |
| `province` | STRING | NULL | Tỉnh/thành phố |
| `is_default` | BOOLEAN | Mặc định `false` | Có phải địa chỉ mặc định hay không |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Nghiệp vụ phải bảo đảm mỗi user chỉ có tối đa một địa chỉ `is_default=true`; đây là quy tắc ở code, không phải unique constraint trong database.

## 5. Luồng catalog sản phẩm

### 5.1. Bảng `categories`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã danh mục |
| `name` | STRING | Không NULL, UNIQUE | Tên danh mục |
| `deleted_at` | DATE | NULL | Thời điểm xóa mềm |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Cột `image` của danh mục đã bị migration combo xóa. Không được tiếp tục insert/update thuộc tính này.

### 5.2. Bảng `brands`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã thương hiệu |
| `name` | STRING | Không NULL, UNIQUE | Tên thương hiệu |
| `image` | TEXT | NULL | URL hình thương hiệu, thường lưu từ Cloudinary |
| `deleted_at` | DATE | NULL | Thời điểm xóa mềm |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

### 5.3. Bảng `products`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã sản phẩm |
| `name` | STRING | Không NULL | Tên sản phẩm |
| `price` | DECIMAL(12,2) | Mặc định `0` | Giá bán hiện tại |
| `oldprice` | DECIMAL(12,2) | Mặc định `0` | Giá cũ dùng hiển thị khuyến mãi |
| `image` | TEXT | NULL | Ảnh chính; thường là URL Cloudinary |
| `description` | TEXT | NULL | Mô tả sản phẩm |
| `specification` | TEXT | NULL | Quy cách/bảo quản/thông số |
| `quantity` | INTEGER | Mặc định `0` | Tổng `remaining_quantity` của các lô; hook tự đồng bộ |
| `sold_count` | INTEGER | Mặc định `0` | Tổng số lượng đã bán |
| `status` | INTEGER | Mặc định `1` | `0`: ẩn; `1`: đang bán; `2`: ngừng bán |
| `unit` | STRING | NULL | Đơn vị như kg, gói, hộp |
| `origin` | STRING | NULL | Xuất xứ |
| `brand_id` | INTEGER | FK → `brands.id`, có thể NULL | Thương hiệu |
| `category_id` | INTEGER | FK → `categories.id`, có thể NULL | Danh mục |
| `deleted_at` | DATE | NULL | Thời điểm xóa mềm |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

`status=1` chỉ nghĩa là được phép bán, không đồng nghĩa còn hàng. Tồn kho phải kiểm tra thêm `quantity > 0`.

### 5.4. Bảng `product_images`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã ảnh |
| `product_id` | INTEGER | FK → `products.id`, CASCADE | Sản phẩm sở hữu ảnh |
| `image` | TEXT | NULL | URL ảnh phụ, thường từ Cloudinary |
| `sort_order` | INTEGER | Mặc định `0` | Thứ tự hiển thị tăng dần |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

## 6. Luồng tồn kho theo lô và FEFO

### 6.1. Bảng `product_batches`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã lô |
| `product_id` | INTEGER | FK → `products.id`, CASCADE | Sản phẩm của lô |
| `batch_code` | STRING | UNIQUE | Mã lô; nếu trống hook sinh dạng `LO-000001` |
| `initial_quantity` | INTEGER | Mặc định `0`, không âm | Số lượng nhập ban đầu |
| `remaining_quantity` | INTEGER | Mặc định `0`, không âm | Số còn lại được FEFO sử dụng |
| `import_price` | DECIMAL(12,2) | Không NULL, mặc định `0`, không âm | Giá vốn một đơn vị |
| `harvest_date` | DATE | NULL | Ngày thu hoạch |
| `expiry_date` | DATE | NULL | Hạn sử dụng; FEFO ưu tiên lô hết hạn sớm |
| `origin` | STRING | NULL | Nguồn gốc riêng của lô |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Hook của bảng tự đồng bộ `products.quantity` sau khi tạo, sửa hoặc xóa lô.

### 6.2. Bảng `inventory_transactions`

Đây là sổ lịch sử kho. Khi xóa lô, `batch_id` có thể thành NULL để lịch sử vẫn được giữ lại.

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã giao dịch kho |
| `batch_id` | INTEGER | FK → `product_batches.id`, NULL được | Lô liên quan nếu còn tồn tại |
| `type` | STRING | `IN`, `OUT`, `ADJUST` | Loại biến động; đây không phải status |
| `quantity` | INTEGER | Không NULL, khác `0` | Lượng biến động; `ADJUST` có thể âm |
| `reference_type` | STRING | NULL | Nguồn nghiệp vụ như `purchase`, `order`, `adjust`, `cancel` |
| `reference_id` | INTEGER | NULL | ID của đối tượng nguồn |
| `note` | TEXT | NULL | Giải thích giao dịch |
| `created_at` | DATE | Tự quản lý | Thời điểm phát sinh; bảng không dùng `updated_at` |

## 7. Luồng combo nhà hàng

### 7.1. Bảng `combos`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã combo |
| `name` | STRING | Không NULL | Tên combo |
| `description` | TEXT | NULL | Mô tả |
| `image` | TEXT | NULL | URL ảnh combo, có thể từ Cloudinary |
| `size` | ENUM | `small`, `medium`, `large`; mặc định `small` | Kích cỡ cấu hình |
| `quantity_multiplier` | DECIMAL(10,2) | Không NULL, mặc định `1` | Hệ số nhân lượng của mọi item |
| `price_mode` | ENUM | `percent`, `fixed`, `manual`; mặc định `percent` | Cách tính giá combo |
| `discount_value` | DECIMAL(12,2) | Không NULL, mặc định `10` | Phần trăm hoặc số tiền giảm tùy `price_mode` |
| `manual_price` | DECIMAL(12,2) | NULL | Giá nhập tay khi `price_mode=manual` |
| `minimum_quantity` | INTEGER | Không NULL, mặc định `1` | Số lượng tối thiểu ở record combo; service hiện ưu tiên setting toàn cục |
| `serving_from`, `serving_to` | INTEGER | NULL | Khoảng số người phục vụ |
| `usage_days` | INTEGER | NULL | Số ngày dự kiến sử dụng |
| `badge` | STRING | NULL | Nhãn quảng bá |
| `status` | BOOLEAN | Không NULL, mặc định `true` | `false`: ẩn; `true`: bật để tiếp tục xét khả dụng |
| `sort_order` | INTEGER | Không NULL, mặc định `0` | Thứ tự hiển thị |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

`status=true` chưa đủ để bán: combo còn phải có item, còn tồn kho, giá dương và giá combo nhỏ hơn tổng giá lẻ.

### 7.2. Bảng `combo_items`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã thành phần |
| `combo_id` | INTEGER | FK → `combos.id`, không NULL, CASCADE | Combo sở hữu item |
| `product_id` | INTEGER | FK → `products.id`, không NULL, RESTRICT | Sản phẩm thành phần |
| `base_quantity` | DECIMAL(12,2) | Không NULL, mặc định `1` | Lượng cơ sở trước khi nhân hệ số |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Cặp `(combo_id, product_id)` là UNIQUE nên một sản phẩm không được lặp hai dòng trong cùng combo.

### 7.3. Bảng `combo_settings`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK; hệ thống dùng record `id=1` | Khóa setting singleton |
| `minimum_quantity` | INTEGER | Không NULL, mặc định `1` | Số combo tối thiểu áp dụng toàn hệ thống |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

## 8. Luồng đặt hàng, PayPal và vận chuyển

### 8.1. Bảng `orders`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã đơn hàng |
| `user_id` | INTEGER | FK → `users.id` | Người đặt |
| `address_id` | INTEGER | FK → `user_addresses.id`, có thể NULL | Địa chỉ nguồn lúc checkout |
| `status` | INTEGER | Mặc định `0` | `0`: đã nhận; `1`: chuẩn bị; `2`: giao đơn vị vận chuyển; `3`: đang giao; `4`: hoàn thành; `5`: hủy |
| `note` | TEXT | NULL | Ghi chú đơn hàng |
| `subtotal` | DECIMAL(12,2) | Mặc định `0` | Tổng tiền hàng trước phí/giảm |
| `shipping_fee` | DECIMAL(12,2) | Mặc định `0` | Phí vận chuyển |
| `discount` | DECIMAL(12,2) | Mặc định `0` | Tổng tiền giảm |
| `total` | DECIMAL(12,2) | Mặc định `0` | Số tiền cuối cùng |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Khi `status` đổi, hook tạo `order_histories` và có thể đồng bộ `shipments.shipping_status`.

### 8.2. Bảng `order_details`

Đây là snapshot dòng hàng. `product_name`, `price`, `cost_price` và `unit` giữ dữ liệu tại thời điểm mua, tránh đơn cũ bị thay đổi khi admin sửa sản phẩm.

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã dòng hàng |
| `order_id` | INTEGER | FK → `orders.id`, CASCADE | Đơn hàng |
| `product_id` | INTEGER | FK → `products.id`, có thể NULL | Sản phẩm nguồn |
| `batch_id` | INTEGER | FK → `product_batches.id`, có thể NULL | Lô thực tế đã xuất |
| `product_name` | STRING | NULL | Snapshot tên sản phẩm |
| `price` | DECIMAL(12,2) | Mặc định `0` | Đơn giá bán snapshot |
| `cost_price` | DECIMAL(12,2) | Không NULL, mặc định `0` | Giá vốn snapshot phục vụ lợi nhuận |
| `quantity` | INTEGER | Mặc định `1` | Số lượng sản phẩm của dòng |
| `unit` | STRING | NULL | Đơn vị snapshot |
| `combo_id` | INTEGER | NULL | ID combo nguồn; hiện không khai báo association/FK model |
| `combo_name` | STRING | NULL | Snapshot tên combo |
| `combo_quantity` | INTEGER | NULL | Số bộ combo tạo ra dòng hàng |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

### 8.3. Bảng `order_histories`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã lịch sử |
| `order_id` | INTEGER | FK → `orders.id`, CASCADE | Đơn hàng |
| `from_status` | INTEGER | NULL | Trạng thái đơn trước khi đổi, dùng bộ mã 0–5 |
| `to_status` | INTEGER | NULL | Trạng thái đơn sau khi đổi, dùng bộ mã 0–5 |
| `changed_by_user_id` | INTEGER | FK → `users.id`, NULL | Người thực hiện nếu xác định được |
| `reason` | TEXT | NULL | Lý do thay đổi |
| `created_at` | DATE | Tự quản lý | Thời điểm đổi; bảng không dùng `updated_at` |

### 8.4. Bảng `payments`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã thanh toán |
| `order_id` | INTEGER | FK → `orders.id`, CASCADE | Đơn được thanh toán |
| `method` | STRING | NULL | Phương thức, ví dụ PayPal |
| `status` | INTEGER | Mặc định `0` | `0`: chưa trả; `1`: đã trả; `2`: thất bại; `3`: hoàn tiền |
| `amount` | DECIMAL(12,2) | Mặc định `0` | Số tiền thanh toán |
| `transaction_code` | STRING | NULL | Mã giao dịch/order từ cổng thanh toán |
| `gateway_response` | TEXT | NULL | Dữ liệu phản hồi cổng thanh toán đã serialize |
| `paid_at` | DATE | NULL | Thời điểm capture thành công |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Một `Order` được model hóa `hasOne Payment`, nhưng schema cần được nghiệp vụ bảo đảm không tạo nhiều payment cho cùng đơn nếu không có unique constraint tương ứng.

### 8.5. Bảng `shipments`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã vận chuyển |
| `order_id` | INTEGER | FK → `orders.id`, CASCADE | Đơn hàng |
| `receiver_name` | STRING | NULL | Snapshot người nhận |
| `phone` | STRING | NULL | Snapshot điện thoại |
| `address` | TEXT | NULL | Snapshot địa chỉ |
| `ward`, `district`, `province` | STRING | NULL | Snapshot đơn vị hành chính |
| `shipping_status` | INTEGER | Mặc định `0` | `0`: chuẩn bị; `1`: giao đơn vị vận chuyển; `2`: đang giao; `3`: đã giao; `4`: thất bại; `5`: hoàn hàng |
| `shipping_fee` | DECIMAL(12,2) | Mặc định `0` | Phí giao hàng snapshot |
| `delivery_time` | DATE | NULL | Thời điểm giao thành công |
| `tracking_code` | STRING | NULL | Mã theo dõi vận đơn |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Không đồng nhất số của `orders.status` và `shipments.shipping_status`: ví dụ Order `3` là đang giao, còn Shipment `3` là đã giao.

## 9. Luồng mã giảm giá

### 9.1. Bảng `coupons`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã nội bộ |
| `code` | STRING | Không NULL, UNIQUE | Mã nhập khi checkout; hook trim và viết hoa |
| `discount_type` | INTEGER | Không NULL | `1`: giảm phần trăm; `2`: giảm số tiền cố định |
| `discount_value` | DECIMAL(12,2) | Mặc định `0` | Giá trị giảm theo loại |
| `min_order_value` | DECIMAL(12,2) | Mặc định `0` | Giá trị đơn tối thiểu |
| `start_date`, `end_date` | DATE | NULL | Khoảng thời gian hiệu lực |
| `quantity` | INTEGER | Mặc định `0` | Tổng lượt được dùng |
| `used_quantity` | INTEGER | Mặc định `0` | Số lượt đã ghi nhận |
| `status` | INTEGER | Mặc định `1` | `0`: không hoạt động; `1`: hoạt động |
| `deleted_at` | DATE | NULL | Thời điểm xóa mềm |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

`status=1` chưa chắc dùng được; còn phải hợp lệ theo ngày, quota, giá trị tối thiểu và lịch sử user.

### 9.2. Bảng `order_coupons`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã liên kết |
| `order_id` | INTEGER | FK → `orders.id`, CASCADE | Đơn áp dụng mã |
| `coupon_id` | INTEGER | FK → `coupons.id` | Coupon đã dùng |
| `discount_amount` | DECIMAL(12,2) | Mặc định `0` | Tiền giảm snapshot của đơn |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

### 9.3. Bảng `coupon_users`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã lượt sử dụng |
| `coupon_id` | INTEGER | FK → `coupons.id`, CASCADE | Coupon |
| `user_id` | INTEGER | FK → `users.id`, CASCADE | Người sử dụng |
| `used_at` | DATE | NULL | Thời điểm dùng |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Cặp `(coupon_id, user_id)` có unique constraint để một người không dùng cùng coupon nhiều lần, kể cả khi có request đồng thời.

## 10. Luồng đánh giá

### 10.1. Bảng `feedback`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã đánh giá |
| `product_id` | INTEGER | FK → `products.id` | Sản phẩm được đánh giá |
| `user_id` | INTEGER | FK → `users.id` | Người đánh giá |
| `order_detail_id` | INTEGER | FK → `order_details.id`, SET NULL | Dòng hàng chứng minh đã mua |
| `star` | INTEGER | Không NULL, từ `1` đến `5` | Số sao |
| `content` | TEXT | Không NULL | Nội dung đánh giá |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Quyền tạo/sửa/xóa feedback phải kiểm tra user và dòng đơn hàng; AdminJS không nên tạo feedback giả thiếu quan hệ mua hàng.

## 11. Luồng tin tức và banner

### 11.1. Bảng `news`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã bài viết |
| `title` | STRING | Không NULL | Tiêu đề |
| `image` | TEXT | NULL | Ảnh đại diện, có thể từ Cloudinary |
| `content` | TEXT | NULL | HTML nội dung; hook làm sạch trước khi lưu |
| `deleted_at` | DATE | NULL | Thời điểm xóa mềm |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

### 11.2. Bảng `news_details`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã liên kết |
| `news_id` | INTEGER | FK → `news.id`, CASCADE | Bài viết |
| `product_id` | INTEGER | FK → `products.id`, CASCADE | Sản phẩm liên quan |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

### 11.3. Bảng `banner`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã banner |
| `name` | STRING | Không NULL, không rỗng | Tên quản trị |
| `image` | TEXT | NULL | URL ảnh, thường từ Cloudinary |
| `status` | INTEGER | Mặc định `1` | `0`: ẩn; `1`: hiển thị |
| `sort_order` | INTEGER | Mặc định `0` | Thứ tự hiển thị |
| `deleted_at` | DATE | NULL | Thời điểm xóa mềm |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

### 11.4. Bảng `banner_details`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã liên kết |
| `banner_id` | INTEGER | FK → `banner.id`, CASCADE | Banner |
| `product_id` | INTEGER | FK → `products.id`, CASCADE | Sản phẩm được banner giới thiệu |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

## 12. Luồng công thức và chatbot

### 12.1. Bảng `recipes`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã công thức |
| `name` | STRING | Không NULL | Tên món |
| `aliases` | TEXT | NULL | Các tên gọi khác, thường serialize |
| `ingredients` | LONGTEXT | Không NULL | Danh sách nguyên liệu |
| `steps` | LONGTEXT | Không NULL | Các bước thực hiện |
| `safety_notes` | TEXT | NULL | Ghi chú an toàn thực phẩm |
| `image` | TEXT | NULL | URL ảnh món ăn |
| `source` | STRING | Mặc định `pdf` | Nguồn công thức |
| `active` | BOOLEAN | Mặc định `true` | `true`: được dùng khi tra record; `false`: tạm ngừng |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

### 12.2. Bảng `recipe_sources`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã nguồn |
| `name` | STRING | Không NULL | Tên hiển thị |
| `file_path` | TEXT | Không NULL | Đường dẫn file nguồn trên server |
| `file_name` | STRING | NULL | Tên file gốc |
| `mime_type` | STRING | NULL | Kiểu MIME, thường `application/pdf` |
| `file_size` | INTEGER | NULL | Dung lượng byte |
| `status` | STRING | Mặc định `processing` | `processing`: đang xử lý; `ready`: hoàn tất; `error`: lỗi |
| `error_message` | TEXT | NULL | Chi tiết lỗi rebuild/index |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

File PDF và FAISS index không nằm trong bảng này; bảng chỉ lưu metadata/trạng thái. Cloudinary hiện phục vụ ảnh, không phải kho chính cho file index công thức.

### 12.3. Bảng `recipe_product_links`

| Thuộc tính | Kiểu | Ràng buộc/mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | PK, tự tăng | Mã ánh xạ |
| `recipe_id` | INTEGER | FK → `recipes.id`, CASCADE | Công thức |
| `ingredient_name` | STRING | Không NULL | Tên nguyên liệu trong công thức |
| `aliases` | TEXT | NULL | Từ đồng nghĩa hỗ trợ tìm kiếm |
| `product_id` | INTEGER | FK → `products.id`, không NULL | Sản phẩm đề xuất |
| `priority` | INTEGER | Mặc định `0` | Độ ưu tiên; số lớn hơn được ưu tiên hơn theo cấu hình truy vấn |
| `created_at`, `updated_at` | DATE | Tự quản lý | Thời điểm tạo/cập nhật |

Chatbot không có bảng lưu hội thoại. Lịch sử chat do frontend gửi trong request; backend chỉ đọc catalog, combo, recipe và lịch sử đơn của đúng user để tạo context.

## 13. Cloudinary liên quan bảng nào?

Cloudinary lưu binary ảnh ở dịch vụ bên ngoài; database chủ yếu giữ URL trong các cột:

| Nghiệp vụ | Cột lưu URL |
|---|---|
| Avatar người dùng | `users.avatar` |
| Ảnh thương hiệu | `brands.image` |
| Ảnh chính sản phẩm | `products.image` |
| Bộ ảnh sản phẩm | `product_images.image` |
| Ảnh combo | `combos.image` |
| Ảnh tin tức | `news.image` |
| Ảnh banner | `banner.image` |
| Ảnh công thức | `recipes.image` |

Khi upload thành công, code nhận URL từ Cloudinary rồi lưu chuỗi URL vào bảng. Xóa hoặc thay record database không mặc nhiên có nghĩa file Cloudinary đã bị xóa; việc xóa tài nguyên từ Cloudinary cần `public_id` hoặc logic provider tương ứng.

## 14. Các bảng đã bị loại bỏ

Migration `20260903100000-remove-unused-cart-wishlist-tables.js` xóa các bảng giỏ hàng/wishlist không còn dùng:

- `cart_items`
- `carts`
- `wishlist_items`
- `wishlists`

Giỏ hàng hiện được quản lý phía client/session theo luồng hiện tại, nên không nên viết code mới phụ thuộc các bảng đã xóa này nếu chưa có migration tạo lại.

## 15. Lưu ý khi sửa schema

1. Sửa model không tự làm database CI thay đổi; phải thêm migration.
2. Seeder phải dùng schema cuối cùng sau toàn bộ migration. Ví dụ `categories.image` đã bị xóa nên seeder không được insert cột đó.
3. Với dữ liệu tiền, dùng `DECIMAL` và chuyển đổi rõ ràng; Sequelize/MySQL có thể trả DECIMAL dưới dạng chuỗi.
4. Các bảng snapshot như `order_details` và `shipments` cố ý lặp dữ liệu để bảo toàn lịch sử.
5. Không dùng `products.quantity` làm nguồn lịch sử kho; nguồn chi tiết là `product_batches`, còn `inventory_transactions` là audit log.
6. Xóa mềm chỉ áp dụng cho `categories`, `brands`, `products`, `news`, `banner`, `coupons`.
7. AdminJS dùng trực tiếp model/association trong tài liệu này. Controller public còn lại chủ yếu phục vụ đọc dữ liệu cho storefront.
8. Nếu thêm giá trị `status`, phải cập nhật đồng thời service/controller, hook model, nhãn AdminJS, test và tài liệu này.

