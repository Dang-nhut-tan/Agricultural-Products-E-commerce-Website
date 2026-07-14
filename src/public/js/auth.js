const authPath = location.pathname;
const authMain = document.querySelector("main");

if (authPath === "/dang-nhap" || authPath === "/dang-ky") {
  const isLogin = authPath === "/dang-nhap";
  authMain.innerHTML = `<div class="auth-wrap"><form id="authForm" class="panel"><h1>${isLogin ? "Đăng nhập" : "Tạo tài khoản"}</h1>${isLogin ? "" : '<div class="field"><label>Họ và tên</label><input name="name" required autocomplete="name" placeholder="Nguyễn Văn An"></div><div class="field"><label>Số điện thoại</label><input name="phone" type="tel" required autocomplete="tel"></div><div class="field"><label>Địa chỉ</label><input name="address" required autocomplete="street-address" placeholder="Số nhà, tên đường"></div><div class="field"><label>Phường/Xã</label><input name="ward"></div><div class="field"><label>Quận/Huyện</label><input name="district"></div><div class="field"><label>Tỉnh/Thành phố</label><input name="province" required></div>'}<div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email" placeholder="ban@example.com"></div><div class="field"><label>Mật khẩu</label><input name="password" type="password" minlength="6" required autocomplete="${isLogin ? "current-password" : "new-password"}" placeholder="••••••••"></div>${isLogin ? "" : '<div class="field"><label>Xác nhận mật khẩu</label><input name="passwordConfirmation" type="password" minlength="6" required autocomplete="new-password" placeholder="••••••••"></div>'}<p id="authError" class="auth-error" role="alert"></p><button class="primary full" type="submit">${isLogin ? "Đăng nhập" : "Đăng ký"}</button><div class="auth-links">${isLogin ? 'Chưa có tài khoản? <a href="/dang-ky">Đăng ký ngay</a>' : 'Đã có tài khoản? <a href="/dang-nhap">Đăng nhập</a>'}</div></form></div>`;
  document
    .querySelector("#authForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector("button[type=submit]");
      const errorBox = document.querySelector("#authError");
      button.disabled = true;
      errorBox.textContent = "";
      const payload = Object.fromEntries(new FormData(form));
      if (!isLogin && payload.password !== payload.passwordConfirmation) {
        errorBox.textContent = "Mật khẩu xác nhận không khớp.";
        button.disabled = false;
        return;
      }
      try {
        const response = await fetch(
          `/api/auth/${isLogin ? "login" : "register"}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "Không thể xác thực.");
        location.href = "/tai-khoan";
      } catch (error) {
        errorBox.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
}

fetch("/api/auth/me")
  .then((response) => (response.ok ? response.json() : null))
  .then((result) => {
    if (!result) return;
    if (authPath === "/tai-khoan") return;
    document.querySelectorAll(".modern-account").forEach((link) => {
      link.href = "/tai-khoan";
      const label = link.querySelector("b");
      if (label) label.textContent = result.data.name || "Tài khoản";
    });
    if (authPath === "/tai-khoan")
      authMain.innerHTML = `<section class="page-shell"><div class="container"><div class="panel"><h1>Xin chào, ${String(result.data.name || "bạn").replace(/[&<>"']/g, "")}</h1><p>${result.data.email}</p><button id="logoutButton" class="outline">Đăng xuất</button></div></div></section>`;
    document
      .querySelector("#logoutButton")
      ?.addEventListener("click", async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        location.href = "/dang-nhap";
      });
  });
