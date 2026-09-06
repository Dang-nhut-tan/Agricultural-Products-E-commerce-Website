require("dotenv").config();

const cloudinary = require("cloudinary").v2;

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
};

const isCloudinaryConfigured = Boolean(
  cloudinaryConfig.cloud_name &&
  cloudinaryConfig.api_key &&
  cloudinaryConfig.api_secret
);

if (isCloudinaryConfigured) {
  cloudinary.config(cloudinaryConfig);
}

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
