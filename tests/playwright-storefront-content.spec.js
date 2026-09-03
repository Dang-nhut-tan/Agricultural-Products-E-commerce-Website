const { test, expect } = require("@playwright/test");
const NewsPage = require("./pages/NewsPage");
const SupplierPage = require("./pages/SupplierPage");
const {
  MISSING_RECORD_ID,
  getFirstNewsArticle,
  getProductWithSupplier,
  getSupplierWithProducts,
} = require("./helpers/storefrontTestData");

test.describe("Người dùng xem tin tức", () => {
  let newsPage;
  let article;

  test.beforeEach(async ({ page, request }) => {
    newsPage = new NewsPage(page);
    article = await getFirstNewsArticle(request);
  });

  test("Người dùng mở danh sách tin tức và xem đầy đủ chi tiết một bài viết", async ({ page }) => {
    await test.step("Bước 1: Người dùng truy cập trang danh sách tin tức", async () => {
      await newsPage.openList();
    });

    await test.step("Bước 2: Kiểm tra bài viết cùng ngày đăng và hành động đọc bài được hiển thị", async () => {
      await expect(newsPage.cardByTitle(article.title)).toBeVisible();
      await expect(newsPage.cardDateByTitle(article.title)).not.toBeEmpty();
      await expect(newsPage.cardReadLinkByTitle(article.title)).toBeVisible();
    });

    await test.step("Bước 3: Người dùng chọn bài viết từ danh sách tin tức", async () => {
      await newsPage.openArticle(article.title);
    });

    await test.step("Bước 4: Kiểm tra hệ thống mở đúng trang chi tiết và hiển thị đúng tiêu đề", async () => {
      await expect(page).toHaveURL(new RegExp(`/tin-tuc/${article.id}$`));
      await expect(newsPage.detailTitle).toHaveText(article.title);
    });

    await test.step("Bước 5: Kiểm tra ngày đăng, nguồn bài viết và nội dung chính được hiển thị", async () => {
      await expect(newsPage.detailDate).not.toBeEmpty();
      await expect(newsPage.articleSource).toContainText("Nông Sản Xanh");
      await expect(newsPage.detailContent).not.toBeEmpty();
      await expect(newsPage.moreArticlesLink).toBeVisible();
    });
  });

  test("Người dùng mở trang Tin tức từ thanh điều hướng và xem danh sách bài viết", async ({ page }) => {
    await test.step("Bước 1: Người dùng đang ở trang chủ của cửa hàng", async () => {
      await newsPage.openHome();
    });

    await test.step("Bước 2: Người dùng chọn mục Tin tức trên thanh điều hướng", async () => {
      await newsPage.openListFromMenu();
    });

    await test.step("Bước 3: Kiểm tra hệ thống mở đúng trang tin tức", async () => {
      await expect(page).toHaveURL(/\/tin-tuc$/);
      await expect(newsPage.heading).toBeVisible();
    });

    await test.step("Bước 4: Kiểm tra danh sách hiển thị đúng số bài viết đang có", async () => {
      const displayedArticles = await newsPage.listedArticleCount();
      expect(displayedArticles, "Trang tin tức cần hiển thị ít nhất một bài viết").toBeGreaterThan(0);
      await expect(newsPage.listSummary).toHaveText(`${displayedArticles} bài viết`);
    });

    await test.step("Bước 5: Kiểm tra bài viết của hệ thống xuất hiện trong danh sách", async () => {
      await expect(newsPage.cardByTitle(article.title)).toBeVisible();
    });
  });

  test("Người dùng chọn bài viết bằng liên kết Đọc bài viết và xem nội dung chi tiết", async ({ page }) => {
    await test.step("Bước 1: Người dùng truy cập trang danh sách tin tức", async () => {
      await newsPage.openList();
    });

    await test.step("Bước 2: Người dùng chọn Đọc bài viết của bài viết muốn xem", async () => {
      await newsPage.openArticleByReadLink(article.title);
    });

    await test.step("Bước 3: Kiểm tra hệ thống mở đúng trang chi tiết của bài viết đã chọn", async () => {
      await expect(page).toHaveURL(new RegExp(`/tin-tuc/${article.id}$`));
      await expect(newsPage.detailTitle).toHaveText(article.title);
    });

    await test.step("Bước 4: Kiểm tra chuyên mục, ngày đăng và nội dung bài viết được hiển thị", async () => {
      await expect(newsPage.detailCategory).toHaveText("Kiến thức nông sản");
      await expect(newsPage.detailDate).not.toBeEmpty();
      await expect(newsPage.detailContent).not.toBeEmpty();
    });
  });

  test("Người dùng xem nguồn bài viết rồi quay lại danh sách tin tức", async ({ page }) => {
    await test.step("Bước 1: Người dùng mở trang chi tiết của một bài viết", async () => {
      await newsPage.openArticleById(article.id);
    });

    await test.step("Bước 2: Kiểm tra thông tin nguồn đăng bài viết được hiển thị đúng", async () => {
      await expect(newsPage.articleSource).toContainText("Bài viết từ");
      await expect(newsPage.articleSourceName).toHaveText("Nông Sản Xanh");
    });

    await test.step("Bước 3: Người dùng chọn quay lại trang tin tức", async () => {
      await newsPage.backToList();
    });

    await test.step("Bước 4: Kiểm tra hệ thống trở về danh sách và bài viết vừa đọc vẫn hiển thị", async () => {
      await expect(page).toHaveURL(/\/tin-tuc$/);
      await expect(newsPage.cardByTitle(article.title)).toBeVisible();
    });
  });

  test("Người dùng mở một bài viết không còn tồn tại", async () => {
    let response;

    await test.step("Bước 1: Người dùng truy cập đường dẫn của một bài viết không tồn tại", async () => {
      response = await newsPage.openArticleUrl(MISSING_RECORD_ID);
    });

    await test.step("Bước 2: Kiểm tra hệ thống báo không tìm thấy nội dung", async () => {
      expect(response.status(), "Bài viết không tồn tại phải trả về HTTP 404").toBe(404);
      await expect(newsPage.notFoundHeading).toBeVisible();
    });

    await test.step("Bước 3: Kiểm tra hệ thống không hiển thị nội dung bài viết nào", async () => {
      await expect(newsPage.detail).toHaveCount(0);
    });
  });
});

test.describe("Người dùng xem nhà cung cấp", () => {
  let supplierPage;

  test.beforeEach(async ({ page }) => {
    supplierPage = new SupplierPage(page);
  });

  test("Người dùng xem nhà cung cấp từ thông tin của một sản phẩm và mở đúng gian hàng", async ({
    page,
    request,
  }) => {
    let product;

    await test.step("Điều kiện ban đầu: hệ thống có sản phẩm đang bán gắn với nhà cung cấp", async () => {
      product = await getProductWithSupplier(request);
    });

    await test.step("Bước 1: Người dùng mở trang chi tiết của sản phẩm đang bán", async () => {
      await supplierPage.openProduct(product.id);
    });

    await test.step("Bước 2: Kiểm tra tên sản phẩm và nhà cung cấp được hiển thị đúng", async () => {
      await expect(supplierPage.productTitle(product.name)).toBeVisible();
      await expect(supplierPage.productSupplier(product.Brand.name)).toBeVisible();
    });

    await test.step("Bước 3: Người dùng mở trang danh sách nhà cung cấp", async () => {
      await supplierPage.openSupplierList();
    });

    await test.step("Bước 4: Kiểm tra đối tác của sản phẩm xuất hiện trong danh sách nhà cung cấp", async () => {
      const card = supplierPage.supplierCard(product.Brand.name);
      await expect(card).toBeVisible();
      await expect(card).toContainText("Đối tác cửa hàng");
      await expect(card).toContainText(/sản phẩm/);
      await expect(card).toContainText("Xem gian hàng");
    });

    await test.step("Bước 5: Người dùng chọn mở gian hàng của nhà cung cấp", async () => {
      await supplierPage.openSupplier(product.Brand.name);
    });

    await test.step("Bước 6: Kiểm tra hệ thống hiển thị đúng thông tin và sản phẩm của nhà cung cấp", async () => {
      await expect(page).toHaveURL(new RegExp(`/nha-cung-cap/${product.Brand.id}$`));
      await expect(supplierPage.supplierName(product.Brand.name)).toBeVisible();
      await expect(supplierPage.verifiedStatus).toContainText("Nhà cung cấp đã xác minh");
      await expect(supplierPage.productCount).toContainText("Sản phẩm");
      await expect(supplierPage.supplierProducts).toBeVisible();
    });
  });

  test("Người dùng mở danh sách nhà cung cấp từ thanh điều hướng và xem tổng quan đối tác", async ({
    page,
    request,
  }) => {
    let product;

    await test.step("Điều kiện ban đầu: hệ thống có nhà cung cấp đang hợp tác với cửa hàng", async () => {
      product = await getProductWithSupplier(request);
    });

    await test.step("Bước 1: Người dùng đang xem trang chi tiết của một sản phẩm", async () => {
      await supplierPage.openProduct(product.id);
    });

    await test.step("Bước 2: Người dùng chọn mục Nhà cung cấp trên thanh điều hướng", async () => {
      await supplierPage.openSupplierList();
    });

    await test.step("Bước 3: Kiểm tra hệ thống mở đúng trang danh sách nhà cung cấp", async () => {
      await expect(page).toHaveURL(/\/nha-cung-cap$/);
      await expect(supplierPage.supplierGrid).toBeVisible();
    });

    await test.step("Bước 4: Kiểm tra phần tổng quan hiển thị đúng số nhà cung cấp đang có", async () => {
      const displayedSuppliers = await supplierPage.listedSupplierCount();
      expect(displayedSuppliers, "Trang cần hiển thị ít nhất một nhà cung cấp").toBeGreaterThan(0);
      await expect(supplierPage.listSummary).toContainText(`${displayedSuppliers} nhà cung cấp`);
    });

    await test.step("Bước 5: Kiểm tra nhà cung cấp của sản phẩm vừa xem có trong danh sách", async () => {
      await expect(supplierPage.supplierCard(product.Brand.name)).toBeVisible();
    });
  });

  test("Người dùng xem gian hàng của nhà cung cấp và mở một sản phẩm đang bán", async ({
    page,
    request,
  }) => {
    let supplier;
    let products;

    await test.step("Điều kiện ban đầu: hệ thống có nhà cung cấp đang bán ít nhất một sản phẩm", async () => {
      ({ supplier, products } = await getSupplierWithProducts(request));
    });

    await test.step("Bước 1: Người dùng mở gian hàng của nhà cung cấp", async () => {
      await supplierPage.openSupplierById(supplier.id);
    });

    await test.step("Bước 2: Kiểm tra tên và trạng thái xác minh của nhà cung cấp được hiển thị đúng", async () => {
      await expect(supplierPage.supplierName(supplier.name)).toBeVisible();
      await expect(supplierPage.verifiedStatus).toContainText("Nhà cung cấp đã xác minh");
    });

    await test.step("Bước 3: Kiểm tra gian hàng hiển thị đúng số sản phẩm đang bán", async () => {
      await expect(supplierPage.supplierProductCards).toHaveCount(products.length);
      await expect(supplierPage.productCountValue).toHaveText(String(products.length));
    });

    await test.step("Bước 4: Người dùng chọn một sản phẩm trong gian hàng của nhà cung cấp", async () => {
      await supplierPage.openSupplierProduct(products[0].name);
    });

    await test.step("Bước 5: Kiểm tra hệ thống mở đúng sản phẩm và giữ đúng nhà cung cấp", async () => {
      await expect(page).toHaveURL(new RegExp(`/san-pham/${products[0].id}$`));
      await expect(supplierPage.productTitle(products[0].name)).toBeVisible();
      await expect(supplierPage.productSupplier(supplier.name)).toBeVisible();
    });
  });

  test("Người dùng quay lại danh sách nhà cung cấp từ gian hàng của đối tác", async ({
    page,
    request,
  }) => {
    let product;

    await test.step("Điều kiện ban đầu: hệ thống có nhà cung cấp đang hợp tác với cửa hàng", async () => {
      product = await getProductWithSupplier(request);
    });

    await test.step("Bước 1: Người dùng mở gian hàng của nhà cung cấp", async () => {
      await supplierPage.openSupplierById(product.Brand.id);
    });

    await test.step("Bước 2: Người dùng chọn quay lại tất cả nhà cung cấp", async () => {
      await supplierPage.backToSupplierList();
    });

    await test.step("Bước 3: Kiểm tra hệ thống trở về danh sách và nhà cung cấp vừa xem vẫn hiển thị", async () => {
      await expect(page).toHaveURL(/\/nha-cung-cap$/);
      await expect(supplierPage.supplierCard(product.Brand.name)).toBeVisible();
    });
  });

  test("Người dùng mở gian hàng của nhà cung cấp không còn tồn tại", async () => {
    await test.step("Bước 1: Người dùng truy cập gian hàng của một nhà cung cấp không tồn tại", async () => {
      await supplierPage.openMissingSupplier(MISSING_RECORD_ID);
    });

    await test.step("Bước 2: Kiểm tra hệ thống thông báo chưa thể tải nhà cung cấp", async () => {
      await expect(supplierPage.errorState).toContainText("Chưa thể tải nhà cung cấp");
    });

    await test.step("Bước 3: Kiểm tra hệ thống không hiển thị thông tin nhà cung cấp nào", async () => {
      await expect(supplierPage.supplierProfile).toHaveCount(0);
    });
  });
});
