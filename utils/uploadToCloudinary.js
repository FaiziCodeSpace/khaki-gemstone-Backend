// utils/uploadToCloudinary.js
import cloudinary from "../config/cloudinary.js";

// Uploads an in-memory buffer (from multer.memoryStorage()) straight to
// Cloudinary — no local disk involved anywhere, so this behaves identically
// on Railway, Vercel, or any other host.
export const uploadBuffer = (buffer, { folder, public_id, resource_type = "image" }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id, resource_type, overwrite: true },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
