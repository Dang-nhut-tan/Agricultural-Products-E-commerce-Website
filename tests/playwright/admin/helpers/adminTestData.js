const db = require("../../../../src/models");

db.sequelize.options.logging = false;

function uniqueAdminData(browserName) {
  const marker = `PWADM-${browserName}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

  return {
    marker,
    user: {
      name: `${marker} User`,
      updatedName: `${marker} User Updated`,
      email: `${marker.toLowerCase()}@example.com`,
      phone: "0901234567",
      password: "AdminTest123",
    },
    category: {
      name: `${marker} Category`,
      updatedName: `${marker} Category Updated`,
    },
    brand: {
      name: `${marker} Brand`,
      updatedName: `${marker} Brand Updated`,
    },
    product: {
      name: `${marker} Product`,
      updatedName: `${marker} Product Updated`,
    },
    news: {
      title: `${marker} News`,
      updatedTitle: `${marker} News Updated`,
    },
    banner: {
      name: `${marker} Banner`,
      updatedName: `${marker} Banner Updated`,
    },
    coupon: {
      code: marker.replace(/-/g, "").toUpperCase(),
      updatedCode: `${marker.replace(/-/g, "").toUpperCase()}U`,
    },
  };
}

async function findBy(model, where) {
  const record = await model.findOne({ where, paranoid: false });
  if (!record) throw new Error(`Không tìm thấy dữ liệu test: ${JSON.stringify(where)}`);
  return record;
}

async function exists(model, where) {
  return Boolean(await model.findOne({ where }));
}

async function cleanupAdminData(data) {
  if (!data) return;

  await db.sequelize.transaction(async (transaction) => {
    const products = await db.Product.findAll({
      where: { name: [data.product.name, data.product.updatedName] },
      paranoid: false,
      transaction,
    });
    const productIds = products.map((item) => item.id);
    if (productIds.length) {
      await db.ProductImage.destroy({ where: { product_id: productIds }, transaction });
      await db.ProductBatch.destroy({
        where: { product_id: productIds },
        force: true,
        transaction,
        skipInventoryTransaction: true,
      });
      await db.Product.destroy({ where: { id: productIds }, force: true, transaction });
    }

    await db.News.destroy({
      where: { title: [data.news.title, data.news.updatedTitle] },
      force: true,
      transaction,
    });
    await db.Banner.destroy({
      where: { name: [data.banner.name, data.banner.updatedName] },
      force: true,
      transaction,
    });
    await db.Coupon.destroy({
      where: { code: [data.coupon.code, data.coupon.updatedCode] },
      force: true,
      transaction,
    });
    await db.Category.destroy({
      where: { name: [data.category.name, data.category.updatedName] },
      force: true,
      transaction,
    });
    await db.Brand.destroy({
      where: { name: [data.brand.name, data.brand.updatedName] },
      force: true,
      transaction,
    });

    const user = await db.User.findOne({ where: { email: data.user.email }, transaction });
    if (user) {
      await db.UserAddress.destroy({ where: { user_id: user.id }, transaction });
      await user.destroy({ transaction });
    }
  });
}

module.exports = {
  db,
  uniqueAdminData,
  findBy,
  exists,
  cleanupAdminData,
};
