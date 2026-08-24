const db = require("../../src/models");

function randomUser(browserName) {
  const unique = `${browserName}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  return {
    name: `Playwright ${browserName}`,
    email: `pw-${unique}@example.com`,
    password: "Test123456",
    phone: "0901234567",
    address: "123 Nguyen Trai",
    ward: "Ben Thanh",
    district: "Quan 1",
    province: "TP Ho Chi Minh",
  };
}

async function deleteTestUser(email) {
  const user = await db.User.findOne({ where: { email } });
  if (!user) return;

  await db.sequelize.transaction(async (transaction) => {
    await db.UserAddress.destroy({
      where: { user_id: user.id },
      transaction,
    });
    await user.destroy({ transaction });
  });
}

module.exports = { randomUser, deleteTestUser };
