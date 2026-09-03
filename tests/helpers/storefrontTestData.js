const { expect } = require("@playwright/test");

// Id chắc chắn không tồn tại, dùng cho các kịch bản xem nội dung đã bị gỡ bỏ.
const MISSING_RECORD_ID = 999999999;

async function getResponseData(request, endpoint) {
  const response = await request.get(endpoint);
  expect(response.status(), `${endpoint} phải trả về thành công`).toBe(200);
  return (await response.json()).data;
}

async function getNewsArticles(request) {
  const articles = await getResponseData(request, "/api/news");
  expect(articles.length, "Danh sách tin tức cần có ít nhất một bài viết").toBeGreaterThan(0);
  return articles;
}

async function getFirstNewsArticle(request) {
  const [article] = await getNewsArticles(request);
  return article;
}

async function getProductWithSupplier(request) {
  const products = await getResponseData(request, "/api/products?limit=24");
  const product = products.find((item) => item.Brand?.id && item.Brand?.name);
  expect(product, "Cần có sản phẩm đang bán gắn với nhà cung cấp").toBeTruthy();
  return product;
}

async function getSupplierDetail(request, supplierId) {
  return getResponseData(request, `/api/brands/${supplierId}`);
}

// Nhà cung cấp đang có ít nhất một sản phẩm bày bán trên gian hàng.
async function getSupplierWithProducts(request) {
  const product = await getProductWithSupplier(request);
  const supplier = await getSupplierDetail(request, product.Brand.id);
  const products = supplier.Products || [];
  expect(products.length, "Nhà cung cấp cần có ít nhất một sản phẩm đang bán").toBeGreaterThan(0);
  return { supplier, products };
}

module.exports = {
  MISSING_RECORD_ID,
  getResponseData,
  getNewsArticles,
  getFirstNewsArticle,
  getProductWithSupplier,
  getSupplierDetail,
  getSupplierWithProducts,
};
