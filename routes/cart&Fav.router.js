import express from "express";
import { addToFavorite } from "../controllers/public/favorite.Controller.js";
import protect from "../middleware/auth.middleware.js";
import { addToCart, getCart } from "../controllers/public/cart.controller.js";

const router = express.Router();

router.post("/addCart", protect, addToCart);
router.get("/Cart", protect, getCart)
router.post("/addFav", protect, addToFavorite);

export default router;