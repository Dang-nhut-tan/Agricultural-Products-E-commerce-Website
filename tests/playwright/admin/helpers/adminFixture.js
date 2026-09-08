const playwright = require("@playwright/test");
const AdminResourcePage = require("../pages/AdminResourcePage");
const adminTestData = require("./adminTestData");

const test = playwright.test.extend({
  adminContext: async function ({ page, browserName }, use) {
    const data = adminTestData.uniqueAdminData(browserName);
    const admin = new AdminResourcePage(page);

    await admin.login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);

    try {
      await use({ admin: admin, data: data });
    } finally {
      await adminTestData.cleanupAdminData(data);
    }
  },
});

module.exports = {
  test: test,
  expect: playwright.expect,
  db: adminTestData.db,
  findBy: adminTestData.findBy,
  exists: adminTestData.exists,
};
