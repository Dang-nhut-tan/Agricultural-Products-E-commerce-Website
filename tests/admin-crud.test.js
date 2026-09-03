jest.mock("../src/models", () => {
  const model = () => ({
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  });
  return {
    Category: model(),
    Brand: model(),
    Banner: model(),
    BannerDetail: model(),
    Coupon: model(),
    News: model(),
    User: model(),
    Product: model(),
    ProductImage: model(),
  };
});
jest.mock("../src/services/sanitizeHtml", () => jest.fn((value) => value));

const db = require("../src/models");

function response() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const resources = [
  {
    name: "user",
    model: db.User,
    controller: require("../src/controllers/userController"),
    insert: "insertUsers",
    update: "updateUsers",
    remove: "deleteUsers",
    body: {
      email: "admin@example.com",
      password: "secret1",
      name: "Admin",
      role: 1,
      status: 1,
      avatar: "",
      phone: "0901234567",
    },
  },
  {
    name: "category",
    model: db.Category,
    controller: require("../src/controllers/categoryController"),
    insert: "insertCategories",
    update: "updateCategories",
    remove: "deleteCategories",
    body: { name: "Vegetables" },
  },
  {
    name: "brand",
    model: db.Brand,
    controller: require("../src/controllers/brandController"),
    insert: "insertBrands",
    update: "updateBrands",
    remove: "deleteBrands",
    body: { name: "Green Farm", image: "" },
  },
  {
    name: "banner",
    model: db.Banner,
    controller: require("../src/controllers/bannerController"),
    insert: "insertBanners",
    update: "updateBanners",
    remove: "deleteBanners",
    body: { name: "Sale", image: "sale.jpg", status: 1, sort_order: 0 },
  },
  {
    name: "coupon",
    model: db.Coupon,
    controller: require("../src/controllers/couponController"),
    insert: "insertCoupons",
    update: "updateCoupons",
    remove: "deleteCoupons",
    body: { code: "SALE10", discount_type: 1, discount_value: 10 },
  },
  {
    name: "news",
    model: db.News,
    controller: require("../src/controllers/newsController"),
    insert: "insertNews",
    update: "updateNews",
    remove: "deleteNews",
    body: { title: "Harvest", content: "Fresh produce", image: "news.jpg" },
  },
];

describe.each(resources)("Admin CRUD - $name", (resource) => {
  beforeEach(() => jest.clearAllMocks());

  it("thêm bản ghi từ dữ liệu đầu vào hợp lệ", async () => {
    const record = { id: 1, ...resource.body };
    resource.model.create.mockResolvedValue(record);
    const res = response();

    await resource.controller[resource.insert]({ body: resource.body }, res);

    expect(resource.model.create).toHaveBeenCalledWith(
      expect.objectContaining(resource.body),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("cập nhật bản ghi có mã tồn tại", async () => {
    const record = {
      id: 1,
      ...resource.body,
      update: jest.fn().mockImplementation(async function update(changes) {
        Object.assign(this, changes);
      }),
    };
    resource.model.findByPk.mockResolvedValue(record);
    const res = response();

    await resource.controller[resource.update](
      { params: { id: "1" }, body: resource.body },
      res,
    );

    expect(record.update).toHaveBeenCalledWith(
      expect.objectContaining(resource.body),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("trả về 404 khi cập nhật mã không tồn tại", async () => {
    resource.model.findByPk.mockResolvedValue(null);
    const res = response();

    await resource.controller[resource.update](
      { params: { id: "999" }, body: resource.body },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("xóa bản ghi có mã tồn tại", async () => {
    const record = { destroy: jest.fn().mockResolvedValue(undefined) };
    resource.model.findByPk.mockResolvedValue(record);
    const res = response();

    await resource.controller[resource.remove]({ params: { id: "1" } }, res);

    expect(record.destroy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("trả về 404 và không xóa khi mã không tồn tại", async () => {
    resource.model.findByPk.mockResolvedValue(null);
    const res = response();

    await resource.controller[resource.remove]({ params: { id: "999" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
