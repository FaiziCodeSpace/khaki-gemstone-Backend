import express from 'express';
import { getAllProducts, getProductById } from '../controllers/public/product.Controller.js';
const router = express.Router();

// Controller functions (to be implemented)
router.get('/products', getAllProducts);
router.get('/product/:id', getProductById);

export default router;   