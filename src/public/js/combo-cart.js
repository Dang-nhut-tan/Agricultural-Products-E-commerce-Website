document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-combo-add]");
  if (!button) return;
  const comboId = Number(button.dataset.comboId);
  const minimum = Number(button.dataset.comboMinimum || 1);
  const cart = JSON.parse(localStorage.getItem("nong-san-cart") || "[]");
  const existing = cart.find((item) => item.type === "combo" && Number(item.comboId) === comboId);
  if (existing) existing.qty += minimum;
  else cart.push({
    id: `combo-${comboId}`,
    comboId,
    type: "combo",
    name: button.dataset.comboName,
    price: Number(button.dataset.comboPrice),
    image: button.dataset.comboImage || "",
    minimumQuantity: minimum,
    qty: minimum,
    freeShipping: true,
  });
  localStorage.setItem("nong-san-cart", JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: { message: "Đã thêm combo nhà hàng vào giỏ" } }));
  const toast = document.querySelector("#pageToast");
  if (toast) { toast.textContent = "Đã thêm combo nhà hàng vào giỏ"; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2200); }
  button.textContent = "Đã thêm ✓";
  setTimeout(() => { button.textContent = `Thêm ${minimum} combo vào giỏ`; }, 1400);
});
