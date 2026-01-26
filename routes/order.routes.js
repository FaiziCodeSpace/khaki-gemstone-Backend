import express from "express";
import { 
  orderBook, 
  getOrders, 
  updateOrderStatus 
} from "../controllers/public/order.Controller.js";
import { protectAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/bookOrder", orderBook);
router.get("/orders", getOrders);
router.get("/orders", getOrders);
router.patch("/updateOrder/:id/status", protectAdmin, updateOrderStatus);

export default router;