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

// Multer temporary storage
const upload = multer({ dest: 'temp/' });
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
router.post("/createProduct", productUploadFields, createProduct);

// Note: Added :id and productUploadFields so editing images works!
router.patch("/updateProduct/:id", productUploadFields, updateProduct);

// Note: Added :id so the controller knows what to delete
router.delete("/deleteProduct/:id", deleteProduct);

export default router;