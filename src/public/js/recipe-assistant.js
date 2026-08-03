const recipeSafe = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const recipeMoney = (value) => Number(value || 0).toLocaleString("vi-VN") + " ₫";
const recipeImage = (product) => product.image || product.ProductImages?.sort((a, b) => Number(a.sort_order) - Number(b.sort_order))[0]?.image || "";

function ensureRecipePanel() {
  if (location.pathname !== "/") return null;
  let panel = document.querySelector("#recipeAssistant");
  if (panel) return panel;
  panel = document.createElement("section");
  panel.id = "recipeAssistant";
  panel.className = "recipe-assistant";
  panel.hidden = true;
  panel.innerHTML = `<div class="container">
    <div class="recipe-filter-bar">
      <div><span class="eyebrow">BẾP THÔNG MINH</span><h2>Tìm món từ nông sản đang có</h2></div>
      <label>Bữa<select data-recipe-filter="meal"><option value="">Bất kỳ</option><option>Sáng</option><option>Trưa</option><option>Tối</option><option>Ăn nhẹ</option></select></label>
      <label>Độ khó<select data-recipe-filter="difficulty"><option value="">Bất kỳ</option><option>Dễ</option><option>Vừa</option><option>Nâng cao</option></select></label>
      <label>Thời gian<select data-recipe-filter="time"><option value="">Bất kỳ</option><option value="15">≤ 15 phút</option><option value="30">≤ 30 phút</option><option value="60">≤ 60 phút</option><option value="60+">Trên 60 phút</option></select></label>
      <label>Chế độ<select data-recipe-filter="diet"><option value="">Không yêu cầu</option><option>Chay</option><option>Ít béo</option><option>Giàu đạm</option></select></label>
    </div>
    <div id="recipeResult" aria-live="polite"></div>
  </div>`;
  document.querySelector("header")?.insertAdjacentElement("afterend", panel);
  return panel;
}

function renderRecipe(recipe) {
  const panel = ensureRecipePanel();
  const result = panel.querySelector("#recipeResult");
  const productById = new Map((recipe.products || []).map((product) => [Number(product.id), product]));
  result.innerHTML = `<article class="recipe-card">
    <div class="recipe-hero ${recipe.image ? "" : "no-image"}" ${recipe.image ? `style="background-image:url('${recipeSafe(recipe.image)}')"` : ""}><span>${recipe.image ? "" : "Ảnh món ăn đang được cập nhật"}</span></div>
    <div class="recipe-body"><span class="recipe-kicker">GỢI Ý PHÙ HỢP</span><h2>${recipeSafe(recipe.name)}</h2><p>${recipeSafe(recipe.summary)}</p>
      <div class="recipe-columns"><section><h3>Nguyên liệu</h3><ul>${recipe.ingredients.map((item) => `<li><b>${recipeSafe(item.name)}</b>${item.amount ? ` <span>${recipeSafe(item.amount)}</span>` : ""}${item.productId ? '<em>Cửa hàng có</em>' : '<em class="missing">Cần mua thêm</em>'}</li>`).join("")}</ul></section>
      <section><h3>Các bước nấu</h3><ol>${recipe.steps.map((step) => `<li>${recipeSafe(step)}</li>`).join("")}</ol></section></div>
      ${recipe.safetyNotes?.length ? `<aside class="recipe-safety"><b>⚠ Lưu ý an toàn</b><ul>${recipe.safetyNotes.map((note) => `<li>${recipeSafe(note)}</li>`).join("")}</ul></aside>` : ""}
    </div></article>
    <section class="recipe-products"><div class="recipe-products-head"><div><span class="eyebrow">CỬA HÀNG CÓ SẴN</span><h2>Chọn nguyên liệu để thêm vào giỏ</h2></div><button type="button" id="addRecipeProducts">Thêm mục đã chọn</button></div>
      <div class="product-grid">${recipe.ingredients.map((ingredient) => {
        const product = productById.get(Number(ingredient.productId));
        if (!product) return "";
        const image = recipeImage(product);
        return `<article class="product recipe-product"><label class="recipe-check"><input type="checkbox" data-recipe-product="${product.id}" checked><span>Chọn</span></label><a class="product-image ${image ? "" : "no-image"}" href="/san-pham/${product.id}" ${image ? `style="background-image:url('${recipeSafe(image)}')"` : ""}></a><div class="product-info"><span class="product-cat">${recipeSafe(product.Category?.name || "Nông sản")}</span><h3><a href="/san-pham/${product.id}">${recipeSafe(product.name)}</a></h3><span class="price">${recipeMoney(product.price)}</span><small>Còn ${Number(product.quantity).toLocaleString("vi-VN")} ${recipeSafe(product.unit || "sản phẩm")}</small><label class="recipe-qty">Số lượng <input type="number" min="1" max="${Number(product.quantity)}" value="1" data-recipe-qty="${product.id}"></label></div></article>`;
      }).join("")}</div></section>`;
  result.querySelector("#addRecipeProducts")?.addEventListener("click", addSelectedRecipeProducts);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function addSelectedRecipeProducts() {
  const cart = JSON.parse(localStorage.getItem("nong-san-cart") || "[]");
  let added = 0;
  document.querySelectorAll("[data-recipe-product]:checked").forEach((checkbox) => {
    const id = Number(checkbox.dataset.recipeProduct);
    const card = checkbox.closest(".recipe-product");
    const quantity = Math.max(1, Math.min(Number(card.querySelector(`[data-recipe-qty='${id}']`).value) || 1, Number(card.querySelector(`[data-recipe-qty='${id}']`).max)));
    const name = card.querySelector("h3").textContent.trim();
    const priceText = card.querySelector(".price").textContent.replace(/[^0-9]/g, "");
    const imageStyle = card.querySelector(".product-image").style.backgroundImage;
    const image = imageStyle.replace(/^url\(["']?|["']?\)$/g, "");
    const existing = cart.find((item) => Number(item.id) === id);
    if (existing) existing.qty += quantity;
    else cart.push({ id, name, price: Number(priceText), image, qty: quantity });
    added += quantity;
  });
  localStorage.setItem("nong-san-cart", JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: { message: `Đã thêm ${added} sản phẩm vào giỏ hàng` } }));
}

async function submitRecipeSearch(query) {
  const panel = ensureRecipePanel();
  panel.hidden = false;
  const result = panel.querySelector("#recipeResult");
  result.innerHTML = '<div class="recipe-loading"><span></span><h3>Đang tìm công thức và đối chiếu hàng trong kho…</h3><p>Quá trình có thể mất khoảng một phút.</p></div>';
  const filters = Object.fromEntries([...panel.querySelectorAll("[data-recipe-filter]")].map((input) => [input.dataset.recipeFilter, input.value]));
  try {
    const response = await fetch("/api/recipes/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, filters }) });
    const data = await response.json();
    if (response.status === 401) {
      sessionStorage.setItem("recipe-query", query);
      location.href = `/dang-nhap?returnTo=${encodeURIComponent("/")}`;
      return;
    }
    if (!response.ok) throw new Error(data.message || "Không thể tìm công thức.");
    renderRecipe(data.data);
  } catch (error) {
    result.innerHTML = `<div class="recipe-error"><h3>Chưa thể gợi ý món ăn</h3><p>${recipeSafe(error.message)}</p><button type="button" onclick="location.reload()">Thử lại</button></div>`;
  }
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest("#searchForm, #modernSearch");
  if (!form || location.pathname !== "/") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const input = form.querySelector("input[type='search'], input");
  const query = input?.value.trim();
  if (query) submitRecipeSearch(query);
}, true);

ensureRecipePanel();
