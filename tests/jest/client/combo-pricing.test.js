jest.mock("../../../src/models", () => ({}));
const { calculateCombo } = require("../../../src/services/comboService");

const combo = (overrides = {}) => Object.assign({
  id: 1,
  name: "Combo quán ăn",
  status: true,
  quantity_multiplier: 2,
  price_mode: "percent",
  discount_value: 10,
  ComboItems: [
    { id: 1, product_id: 10, base_quantity: 5, Product: { name: "Thịt", price: 100000, quantity: 35, unit: "kg" } },
    { id: 2, product_id: 11, base_quantity: 2, Product: { name: "Rau", price: 20000, quantity: 20, unit: "kg" } },
  ],
}, overrides);

describe("Giá và khả năng bán của combo", () => {
  it("nhân số lượng thành phần và tính mức tiết kiệm theo phần trăm", () => {
    const result = calculateCombo(combo());
    expect(result.items.map((item) => item.quantity)).toEqual([10, 4]);
    expect(result.retailPrice).toBe(1080000);
    expect(result.comboPrice).toBe(972000);
    expect(result.savings).toBe(108000);
    expect(result.savingsPercent).toBe(10);
    expect(result.availableQuantity).toBe(3);
    expect(result.isAvailable).toBe(true);
  });

  it("tự động ẩn combo khi một thành phần hết hàng", () => {
    const data = combo();
    data.ComboItems[0].Product.quantity = 9;
    expect(calculateCombo(data).isAvailable).toBe(false);
  });

  it("không công bố giá nhập thủ công nếu không rẻ hơn giá bán lẻ", () => {
    const result = calculateCombo(combo({ price_mode: "manual", manual_price: 1080000 }));
    expect(result.isAvailable).toBe(false);
    expect(result.savings).toBe(0);
  });

  it("cho phép bán khi tồn kho vừa đủ đúng một combo", () => {
    const data = combo();
    data.ComboItems[0].Product.quantity = 10;
    data.ComboItems[1].Product.quantity = 4;

    const result = calculateCombo(data);

    expect(result.availableQuantity).toBe(1);
    expect(result.isAvailable).toBe(true);
  });

  it.each([
    ["không có thành phần", { ComboItems: [] }],
    ["đang tạm ẩn", { status: false }],
    ["giá bằng không", { price_mode: "manual", manual_price: 0 }],
  ])("không cho bán combo thuộc phân vùng %s", (_label, overrides) => {
    expect(calculateCombo(combo(overrides)).isAvailable).toBe(false);
  });

  it("cho phép giá thủ công thấp hơn giá bán lẻ đúng một đồng", () => {
    const result = calculateCombo(combo({
      price_mode: "manual",
      manual_price: 1079999,
    }));

    expect(result.comboPrice).toBe(1079999);
    expect(result.isAvailable).toBe(true);
  });

  it("tính đúng phân vùng giảm một số tiền cố định", () => {
    const result = calculateCombo(combo({
      price_mode: "fixed",
      discount_value: 80000,
    }));

    expect(result.retailPrice).toBe(1080000);
    expect(result.comboPrice).toBe(1000000);
    expect(result.savings).toBe(80000);
    expect(result.isAvailable).toBe(true);
  });

  it.each([
    ["0 phần trăm", 0],
    ["100 phần trăm", 100],
  ])("không cho bán combo tại biên giảm giá %s", (_label, discountValue) => {
    const result = calculateCombo(combo({ discount_value: discountValue }));
    expect(result.isAvailable).toBe(false);
  });
});
