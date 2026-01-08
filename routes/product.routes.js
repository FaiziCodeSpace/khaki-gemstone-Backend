import express from 'express';
import { getAllProducts, getProductById } from '../controllers/public/productController.js';
const router = express.Router();

// Controller functions (to be implemented)
router.get('/products', getAllProducts);
router.get('/products/:id', getProductById);

export default router;   