import express from "express";
import { 
  orderBook, 
  getOrders, 
  updateOrderStatus, 
  handlePaymentCancel
} from "../controllers/public/order.Controller.js";
import { protectAdmin } from "../middleware/admin.middleware.js"
import { handlePayfastITN } from "../controllers/Webhook/ITN.Controller.js";

const router = express.Router();

router.post("/placeOrder", orderBook);
router.post("/payfast-itn", handlePayfastITN);
router.get("/payment-cancel/:orderNumber", handlePaymentCancel);
router.get("/orders", protectAdmin, getOrders);
router.patch("/updateOrder/:id/status", protectAdmin, updateOrderStatus);

export default router;