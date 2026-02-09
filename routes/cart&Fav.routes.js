import express from "express";
import protect from "../middleware/auth.middleware.js";
import { addToCart, clearCart, getCart, removeFromCart } from "../controllers/public/cart.Controller.js";

const router = express.Router();

router.post("/addCart", protect, addToCart);
router.get("/cart", protect, getCart);
router.delete("/deleteCartItem/:productId", protect, removeFromCart);
router.delete("/clearCart", protect, clearCart);

export default router;