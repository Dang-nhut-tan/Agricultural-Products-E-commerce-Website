jest.mock("../../src/models", () => ({}));
jest.mock("../../src/services/geminiService", () => ({
  embedText: jest.fn(),
  generateJson: jest.fn(),
}));

const { localRecipe, isRecipeRelevant } = require("../../src/services/recipeSearch");

describe("Độ liên quan của kết quả tìm kiếm công thức", () => {
  it("không thay món ăn không xác định bằng lẩu bò", () => {
    expect(() => localRecipe("nấu mì cay như nào", []))
      .toThrow("Tôi không biết món này.");
  });

  it("chấp nhận công thức khớp với món ăn được yêu cầu", () => {
    expect(isRecipeRelevant("nấu mì cay như nào", "Mì cay hải sản")).toBe(true);
  });

  it("từ chối công thức được tạo không liên quan", () => {
    expect(isRecipeRelevant("nấu mì cay như nào", "Lẩu bò")).toBe(false);
  });
});
