import express from "express";
import { addToCart } from "../controllers/public/cart.Controller.js";
import { addToFavorite } from "../controllers/public/favorite.Controller.js";
import protect from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/add", protect, addToCart);
router.post("/addFav", protect, addToFavorite);

export default router;