import express from "express";
import { 
  orderBook, 
  getOrders, 
  updateOrderStatus 
} from "../controllers/public/order.Controller.js";
import { protectAdmin } from "../middleware/admin.middleware.js"

const router = express.Router();

router.post("/bookOrder", orderBook);

router.get("/orders", protectAdmin, getOrders);
router.patch("/admin/updateOrder/:id/status", protectAdmin, updateOrderStatus);

export default router;