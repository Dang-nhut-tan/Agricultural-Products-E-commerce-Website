require("dotenv").config();
const { test, expect, db, findBy, exists } = require("./helpers/adminFixture");

test.describe("Quản trị tin tức bằng AdminJS", () => {
  test.setTimeout(180_000);

  test("Quản trị viên thêm, sửa, xóa và kiểm tra dữ liệu bắt buộc", async ({ adminContext }) => {
    const { admin, data } = adminContext;

    await test.step("Thêm một bài viết mới với tiêu đề và nội dung hợp lệ", async () => {
      await admin.openNew("news");
      await admin.fill("title", data.news.title);
      await admin.fillRichText("Nội dung tin tức được tạo bởi Playwright");
      await admin.saveSuccessfully();
      expect(await exists(db.News, { title: data.news.title })).toBe(true);
    });

    const news = await findBy(db.News, { title: data.news.title });
    await test.step("Sửa tiêu đề bài viết và lưu thay đổi thành công", async () => {
      await admin.openEdit("news", news.id);
      await admin.fill("title", data.news.updatedTitle);
      await admin.saveSuccessfully();
      expect(await exists(db.News, { title: data.news.updatedTitle })).toBe(true);
    });

    await test.step("Không cho phép xóa tiêu đề bắt buộc khi cập nhật bài viết", async () => {
      await admin.openEdit("news", news.id);
      await admin.fill("title", "");
      expect(await admin.saveExpectingValidationError()).toBe(true);
      expect(await exists(db.News, { id: news.id, title: data.news.updatedTitle })).toBe(true);
    });

    await test.step("Xóa bài viết vừa tạo khỏi hệ thống", async () => {
      await admin.deleteRecord("news", news.id);
      expect(await exists(db.News, { id: news.id })).toBe(false);
    });

    await test.step("Không cho phép lưu bài viết khi thiếu tiêu đề", async () => {
      await admin.openNew("news");
      await admin.fillRichText("Nội dung không có tiêu đề");
      expect(await admin.saveExpectingValidationError()).toBe(true);
    });
  });
});
