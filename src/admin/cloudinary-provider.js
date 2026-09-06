const path = require("path");
const {
  cloudinary,
  ensureCloudinaryConfigured,
} = require("../config/cloudinary");

const publicIdFromUrl = (url) => {
  const uploadPath = new URL(url).pathname.split("/upload/")[1] || "";
  return decodeURIComponent(uploadPath)
    .replace(/^v\d+\//, "")
    .replace(/\.[^/.]+$/, "");
};

const cloudinaryProvider = {
  name: "BaseProvider",
  bucket: process.env.CLOUDINARY_FOLDER || "web-nong-san",
  opts: {},

  async upload(file, imageUrl) {
    ensureCloudinaryConfigured();
    const publicId = publicIdFromUrl(imageUrl);

    await cloudinary.uploader.upload(file.path, {
      public_id: publicId,
      overwrite: true,
      resource_type: "image",
    });
  },

  async delete(imageUrl) {
    if (!imageUrl) return;
    ensureCloudinaryConfigured();
    await cloudinary.uploader.destroy(publicIdFromUrl(imageUrl), {
      invalidate: true,
      resource_type: "image",
    });
  },

  path(imageUrl) {
    return imageUrl;
  },
};

const createUploadPath = (resourceName) => (record, filename) => {
  ensureCloudinaryConfigured();
  const extension = path.extname(filename).slice(1).toLowerCase() || "jpg";
  const publicId = [
    cloudinaryProvider.bucket,
    resourceName,
    `${record.id()}-${Date.now()}`,
  ].join("/");

  return cloudinary.url(publicId, { secure: true, format: extension });
};

module.exports = { cloudinaryProvider, createUploadPath };
