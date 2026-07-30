const profileMain = document.querySelector("main");
const clean = (value) => String(value || "").replace(/[&<>"']/g, "");
const fileData = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
async function refreshAddresses() {
  const response = await fetch("/api/auth/addresses");
  const { data } = await response.json();
  document.querySelector("#addressList").innerHTML = data.length
    ? data
        .map(
          (item) =>
            `<div class="address-card"><b>${clean(item.receiver_name)} · ${clean(item.phone)}</b><p>${clean([item.address, item.ward, item.district, item.province].filter(Boolean).join(", "))}</p>${item.is_default ? "<small>Địa chỉ mặc định</small>" : ""}<button data-delete-address="${item.id}">Xóa</button></div>`,
        )
        .join("")
    : "<p>Bạn chưa có địa chỉ giao hàng.</p>";
}
if (location.pathname === "/tai-khoan")
  fetch("/api/auth/me").then(async (response) => {
    if (!response.ok) {
      location.href = "/dang-nhap";
      return;
    }
    const { authenticated, data: user } = await response.json();
    if (!authenticated || !user) {
      location.href = "/dang-nhap";
      return;
    }
    profileMain.innerHTML = `<section class="account-page container"><div class="panel"><h1>Thông tin cá nhân</h1><div id="profileView"><div class="avatar-editor">${user.avatar ? `<img src="${clean(user.avatar)}" alt="Ảnh đại diện">` : '<div class="avatar-placeholder">Ảnh đại diện</div>'}</div><p><b>Họ và tên:</b> ${clean(user.name) || "Chưa cập nhật"}</p><p><b>Email:</b> ${clean(user.email)}</p><p><b>Số điện thoại:</b> ${clean(user.phone) || "Chưa cập nhật"}</p><button id="editProfileButton" class="primary">Sửa thông tin</button></div><form id="profileForm" hidden><div class="avatar-editor">${user.avatar ? `<img id="avatarPreview" src="${clean(user.avatar)}" alt="Ảnh đại diện">` : '<div id="avatarPreview" class="avatar-placeholder">Ảnh đại diện</div>'}<input id="avatarInput" type="file" accept="image/jpeg,image/png,image/webp"></div><div class="field"><label>Họ và tên</label><input name="name" required value="${clean(user.name)}"></div><div class="field"><label>Số điện thoại</label><input name="phone" value="${clean(user.phone)}"></div><p id="profileMessage" class="auth-error"></p><button class="primary">Lưu thông tin</button><button id="cancelProfileButton" class="outline" type="button">Hủy</button></form></div><div class="panel"><h2>Địa chỉ giao hàng</h2><div id="addressList"></div><button id="showAddressForm" class="primary">Thêm địa chỉ</button><form id="addressForm" hidden><div class="field"><label>Người nhận</label><input name="receiver_name" required></div><div class="field"><label>Địa chỉ</label><input name="address" required></div><div class="field"><label>Phường/Xã</label><input name="ward"></div><div class="field"><label>Quận/Huyện</label><input name="district"></div><div class="field"><label>Tỉnh/Thành phố</label><input name="province" required></div><label><input name="is_default" type="checkbox"> Đặt làm mặc định</label><p id="addressMessage" class="auth-error"></p><button class="primary">Lưu địa chỉ</button><button id="cancelAddressButton" class="outline" type="button">Hủy</button></form></div><button id="profileLogout" class="outline">Đăng xuất</button></section>`;
    profileMain
      .querySelector(".account-page .panel")
      ?.insertAdjacentHTML(
        "afterend",
        `<a class="panel account-orders-link" href="/don-hang">
          <span class="account-orders-icon" aria-hidden="true">▤</span>
          <span><b>Lịch sử mua hàng</b><small>Xem đơn hàng và theo dõi trạng thái giao hàng</small></span>
          <span class="account-orders-arrow" aria-hidden="true">→</span>
        </a>`,
      );
    await refreshAddresses();
    const toggleProfile = (editing) => {
      document.querySelector("#profileView").hidden = editing;
      document.querySelector("#profileForm").hidden = !editing;
    };
    document.querySelector("#editProfileButton").onclick = () =>
      toggleProfile(true);
    document.querySelector("#cancelProfileButton").onclick = () =>
      toggleProfile(false);
    document.querySelector("#showAddressForm").onclick = () => {
      document.querySelector("#addressForm").hidden = false;
      document.querySelector("#showAddressForm").hidden = true;
    };
    document.querySelector("#cancelAddressButton").onclick = () => {
      document.querySelector("#addressForm").hidden = true;
      document.querySelector("#showAddressForm").hidden = false;
    };
    document.querySelector("#avatarInput").onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) {
        document.querySelector("#profileMessage").textContent =
          "Ảnh không được vượt quá 4 MB.";
        event.target.value = "";
        return;
      }
      const source = await fileData(file);
      document.querySelector("#avatarPreview").outerHTML =
        `<img id="avatarPreview" src="${source}" alt="Ảnh đại diện">`;
    };
    document.querySelector("#profileForm").onsubmit = async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.currentTarget));
      const file = document.querySelector("#avatarInput").files[0];
      if (file) payload.avatarData = await fileData(file);
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      document.querySelector("#profileMessage").textContent = result.message;
      if (response.ok) location.reload();
    };
    document.querySelector("#addressForm").onsubmit = async (event) => {
      event.preventDefault();
      const response = await fetch("/api/auth/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      const result = await response.json();
      document.querySelector("#addressMessage").textContent = result.message;
      if (response.ok) {
        event.currentTarget.reset();
        event.currentTarget.hidden = true;
        document.querySelector("#showAddressForm").hidden = false;
        refreshAddresses();
      }
    };
    document.querySelector("#addressList").onclick = async (event) => {
      const button = event.target.closest("[data-delete-address]");
      if (button) {
        await fetch(`/api/auth/addresses/${button.dataset.deleteAddress}`, {
          method: "DELETE",
        });
        refreshAddresses();
      }
    };
    document.querySelector("#profileLogout").onclick = async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      location.href = "/dang-nhap";
    };
  });
