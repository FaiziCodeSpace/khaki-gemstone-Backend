import express from 'express';
import multer from 'multer';
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct
} from '../controllers/public/product.Controller.js';
import { protectAdmin } from "../middleware/admin.middleware.js";

// Files are held in memory only, then uploaded to Cloudinary explicitly in
// the controller — see utils/uploadToCloudinary.js. Nothing ever touches disk.
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Public Routes
router.get('/products', getAllProducts);
router.get('/product/:id', getProductById);

// Fields configuration (shared between Create and Update)
const productUploadFields = upload.fields([
  { name: 'images', maxCount: 6 },
  { name: 'lab_test', maxCount: 1 },
  { name: 'certificate', maxCount: 1 }
]);

// Admin Protected Routes
router.post("/createProduct", protectAdmin, productUploadFields, createProduct);

// Note: Added :id and productUploadFields so editing images works!
router.patch("/updateProduct/:id", protectAdmin, productUploadFields, updateProduct);

// Note: Added :id so the controller knows what to delete
router.delete("/deleteProduct/:id", protectAdmin, deleteProduct);

export default router;