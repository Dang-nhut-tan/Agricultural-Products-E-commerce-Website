require("dotenv").config();

const cloudinary = require("cloudinary").v2;

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
};

// Chỉ cấu hình SDK khi đã điền đủ biến môi trường.
// Nhờ vậy backend vẫn khởi động được khi chưa sử dụng chức năng upload ảnh.
const isCloudinaryConfigured = Boolean(
  cloudinaryConfig.cloud_name &&
  cloudinaryConfig.api_key &&
  cloudinaryConfig.api_secret
);

if (isCloudinaryConfigured) {
  cloudinary.config(cloudinaryConfig);
}

// Gọi trước khi upload/xóa để nhận thông báo dễ hiểu thay vì lỗi SDK khó đọc.
const ensureCloudinaryConfigured = () => {
  if (!isCloudinaryConfigured) {
    throw new Error(
      "Cloudinary chưa được cấu hình. Hãy điền CLOUDINARY_CLOUD_NAME, " +
      "CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET trong file .env"
    );
  }
};

module.exports = {
  cloudinary,
  ensureCloudinaryConfigured,
  isCloudinaryConfigured,
};
