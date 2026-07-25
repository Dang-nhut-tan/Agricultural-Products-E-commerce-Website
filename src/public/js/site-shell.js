const mobileMenu = document.querySelector("#mobileMenu");
const primaryNav = document.querySelector("#primaryNav");

mobileMenu?.addEventListener("click", () => {
  const open = primaryNav.classList.toggle("open");
  mobileMenu.setAttribute("aria-expanded", String(open));
  mobileMenu.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
});
