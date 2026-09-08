const { test, expect } = require("@playwright/test");
const SearchPage = require("./pages/SearchPage");
const { getResponseData } = require("./helpers/storefrontTestData");

test.describe("Người dùng tìm kiếm sản phẩm", () => {
  let searchPage;
  let product;

  test.beforeEach(async ({ page, request }) => {
    searchPage = new SearchPage(page);
    const products = await getResponseData(request, "/api/products?limit=24");
    product = products[0];
    expect(product, "Cần có ít nhất một sản phẩm để kiểm tra tìm kiếm").toBeTruthy();
  });

  test("Người dùng tìm sản phẩm từ ô tìm kiếm chung", async ({ page }) => {
    await test.step("Bước 1: Người dùng mở trang tin tức", async () => {
      await searchPage.openPage("/tin-tuc");
    });

    await test.step("Bước 2: Người dùng nhập tên sản phẩm vào ô tìm kiếm chung", async () => {
      await searchPage.searchFromSiteHeader(product.name);
    });

    await test.step("Bước 3: Kiểm tra hệ thống chuyển tới trang sản phẩm với đúng từ khóa", async () => {
      await expect(page).toHaveURL(/\/san-pham\?/);
      expect(new URL(page.url()).searchParams.get("search")).toBe(product.name);
      await expect(searchPage.productCards.filter({ hasText: product.name })).toBeVisible();
    });
  });

  test("Người dùng tìm sản phẩm từ ô tìm kiếm của trang sản phẩm", async ({ page }) => {
    await test.step("Bước 1: Người dùng mở trang sản phẩm", async () => {
      await searchPage.openPage("/san-pham");
    });

    await test.step("Bước 2: Người dùng nhập tên sản phẩm và thực hiện tìm kiếm", async () => {
      await searchPage.searchFromProductPage(product.name);
    });

    await test.step("Bước 3: Kiểm tra từ khóa và sản phẩm phù hợp được hiển thị", async () => {
      expect(new URL(page.url()).searchParams.get("search")).toBe(product.name);
      await expect(searchPage.productSearch).toHaveValue(product.name);
      await expect(searchPage.productCards.filter({ hasText: product.name })).toBeVisible();
    });
  });

  test("Người dùng tìm từ khóa không có sản phẩm phù hợp", async ({ page }) => {
    const missingKeyword = `san-pham-khong-ton-tai-${Date.now()}`;

    await searchPage.openPage("/san-pham");
    await searchPage.searchFromProductPage(missingKeyword);

    expect(new URL(page.url()).searchParams.get("search")).toBe(missingKeyword);
    await expect(searchPage.productCards).toHaveCount(0);
    await expect(searchPage.emptyProductState).toContainText("Chưa tìm thấy sản phẩm");
  });
});

const recipeFilters = [
  { name: "meal", option: "Tối", description: "Bữa" },
  { name: "difficulty", option: "Dễ", description: "Độ khó" },
  { name: "time", option: "30", description: "Thời gian" },
  { name: "diet", option: "Chay", description: "Chế độ" },
];

test.describe("Người dùng chọn bộ lọc gợi ý món ăn", () => {
  let searchPage;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
    await searchPage.mockRecipeApi();
    await searchPage.openHome();
    await searchPage.searchRecipe("canh rau");
  });

  for (const filter of recipeFilters) {
    test(`Combobox ${filter.description} gửi đúng lựa chọn`, async () => {
      await test.step(`Bước 1: Người dùng chọn ${filter.option} trong combobox ${filter.description}`, async () => {
        await searchPage.selectRecipeFilter(filter.name, filter.option);
        await expect(searchPage.recipeFilter(filter.name)).toHaveValue(filter.option);
      });

      await test.step("Bước 2: Người dùng tìm món với bộ lọc đã chọn", async () => {
        await searchPage.searchRecipe("canh rau");
      });

      await test.step("Bước 3: Kiểm tra hệ thống gửi đúng bộ lọc tới API", async () => {
        const requestData = searchPage.lastRecipeRequest();
        expect(requestData.query).toBe("canh rau");
        expect(requestData.filters[filter.name]).toBe(filter.option);
      });
    });
  }
});
