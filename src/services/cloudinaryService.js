const {
  cloudinary,
  ensureCloudinaryConfigured,
} = require("../config/cloudinary");

const uploadImage = async (file, folder = process.env.CLOUDINARY_FOLDER) => {
  ensureCloudinaryConfigured();

  const result = await cloudinary.uploader.upload(file, {
    folder: folder || "web-nong-san",
    resource_type: "image",
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
};

module.exports = { uploadImage };
