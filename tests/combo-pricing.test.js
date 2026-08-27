jest.mock("../src/models", () => ({}));
const { calculateCombo } = require("../src/services/comboService");

const combo = (overrides = {}) => ({
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
  ...overrides,
});

describe("Combo pricing and availability", () => {
  it("multiplies component quantities and calculates percentage savings", () => {
    const result = calculateCombo(combo());
    expect(result.items.map((item) => item.quantity)).toEqual([10, 4]);
    expect(result.retailPrice).toBe(1080000);
    expect(result.comboPrice).toBe(972000);
    expect(result.savings).toBe(108000);
    expect(result.savingsPercent).toBe(10);
    expect(result.availableQuantity).toBe(3);
    expect(result.isAvailable).toBe(true);
  });

  it("automatically hides a combo when a component is out of stock", () => {
    const data = combo();
    data.ComboItems[0].Product.quantity = 9;
    expect(calculateCombo(data).isAvailable).toBe(false);
  });

  it("does not publish a manual price that is not cheaper than retail", () => {
    const result = calculateCombo(combo({ price_mode: "manual", manual_price: 1080000 }));
    expect(result.isAvailable).toBe(false);
    expect(result.savings).toBe(0);
  });
});
