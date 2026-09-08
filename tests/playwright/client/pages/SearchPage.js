const TestClientBase = require("../base/TestClientBase");

class SearchPage extends TestClientBase {
  constructor(page) {
    super(page);
    this.siteSearch = page.locator("#siteSearch");
    this.productSearch = page.locator("#productSearch");
    this.productCards = page.locator(".product-grid .product");
    this.emptyProductState = page.locator(".product-grid .empty-state");
    this.recipeSearch = page.locator("#modernSearchInput");
    this.recipePanel = page.locator("#recipeAssistant");
    this.recipeResult = page.locator("#recipeResult");
    this.recipeRequests = [];
  }

  async openPage(path) {
    await this.page.goto(path);
  }

  async searchFromSiteHeader(keyword) {
    await this.siteSearch.fill(keyword);
    await this.siteSearch.press("Enter");
  }

  async searchFromProductPage(keyword) {
    await this.productSearch.fill(keyword);
    await this.productSearch.press("Enter");
  }

  async mockRecipeApi() {
    await this.page.route("**/api/recipes/suggest", async (route) => {
      this.recipeRequests.push(route.request().postDataJSON());

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            name: "Món ăn kiểm thử",
            summary: "Kết quả dùng để kiểm tra bộ lọc.",
            ingredients: [],
            steps: ["Chuẩn bị nguyên liệu"],
            products: [],
            safetyNotes: [],
          },
        }),
      });
    });
  }

  async openHome() {
    await this.page.goto("/");
    await this.recipeSearch.waitFor();
    await this.recipePanel.waitFor({ state: "attached" });
  }

  async searchRecipe(keyword) {
    const responsePromise = this.page.waitForResponse("**/api/recipes/suggest");

    await this.recipeSearch.fill(keyword);
    await this.recipeSearch.press("Enter");
    await responsePromise;
    await this.recipeResult.locator(".recipe-card").waitFor();
  }

  recipeFilter(filterName) {
    return this.recipePanel.locator(`[data-recipe-filter="${filterName}"]`);
  }

  async selectRecipeFilter(filterName, optionValue) {
    await this.recipeFilter(filterName).selectOption(optionValue);
  }

  lastRecipeRequest() {
    return this.recipeRequests[this.recipeRequests.length - 1];
  }
}

module.exports = SearchPage;
