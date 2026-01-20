import express from "express";
import { addToFavorite } from "../controllers/public/favorite.Controller.js";
import protect from "../middleware/auth.middleware.js";
import { addToCart, getCart, removeFromCart } from "../controllers/public/cart.Controller.js";

const router = express.Router();

router.post("/addCart", protect, addToCart);
router.get("/cart", protect, getCart);

// 🔹 Changed from .get to .delete and updated param name to :productId
router.delete("/deleteCartItem/:productId", protect, removeFromCart);

router.post("/addFav", protect, addToFavorite);

export default router;