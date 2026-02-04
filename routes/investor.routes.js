import express from "express";
import {getInvestorInvestments, getInvestorPersonalMetrics, investInProduct, refundInvestment} from "../controllers/investor/investment.Controller.js";
import { investorAuth } from "../middleware/investor.middleware.js";
const router = express.Router();

router.post('/invest/:productId', investorAuth, investInProduct);
router.post('/refund/:investmentId', investorAuth, refundInvestment);
router.get("/investments", investorAuth, getInvestorInvestments);
router.get('/metrics', investorAuth, getInvestorPersonalMetrics);

export default router;