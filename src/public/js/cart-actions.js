document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-cart-add]");
  if (!addButton || addButton.disabled) return;

  event.preventDefault();
  const quantityInput = addButton.dataset.quantityInput
    ? document.getElementById(addButton.dataset.quantityInput)
    : null;
  const quantity = Math.max(1, Number(quantityInput?.value) || 1);
  const productId = Number(addButton.dataset.productId);
  const cart = JSON.parse(localStorage.getItem("nong-san-cart") || "[]");
  const existing = cart.find((item) => Number(item.id) === productId);

  if (existing) {
    existing.qty += quantity;
  } else {
    cart.push({
      id: productId,
      name: addButton.dataset.productName,
      price: Number(addButton.dataset.productPrice),
      image: addButton.dataset.productImage || "",
      qty: quantity,
    });
  }

  localStorage.setItem("nong-san-cart", JSON.stringify(cart));

  const toast = document.querySelector("#pageToast");
  if (toast) {
    toast.textContent = `Đã thêm ${quantity} sản phẩm vào giỏ hàng`;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  const originalText = addButton.textContent;
  addButton.textContent = "Đã thêm ✓";
  addButton.classList.add("added");
  window.setTimeout(() => {
    addButton.textContent = originalText;
    addButton.classList.remove("added");
  }, 1500);
});

document.addEventListener("click", (event) => {
  const thumbnail = event.target.closest("[data-gallery-image]");
  if (!thumbnail) return;

  const mainImage = document.querySelector("#commerceMain");
  mainImage.style.backgroundImage = `url("${thumbnail.dataset.galleryImage.replace(/"/g, "%22")}")`;
  document.querySelectorAll("[data-gallery-image]").forEach((item) => {
    item.classList.toggle("active", item === thumbnail);
  });
});
